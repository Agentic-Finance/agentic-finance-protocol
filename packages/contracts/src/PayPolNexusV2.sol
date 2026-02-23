// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Minimal ERC20 interface for token interactions
interface IERC20Minimal {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title  PayPolNexusV2
 * @notice Full-lifecycle escrow for PayPol Agent Marketplace.
 *
 *         Flow: Employer locks ERC20 → Agent executes → Judge settles/refunds
 *         Features: dispute resolution, auto-timeout refund, platform fee, on-chain rating.
 *
 *         Upgrades from PayPolNexus v1 (createJob + releasePayment only) by merging
 *         AgentRegistry settlement patterns with ERC20 escrow design.
 */
contract PayPolNexusV2 is Ownable, ReentrancyGuard {

    // ── Enums & Structs ────────────────────────────────────────

    enum JobStatus {
        Created,    // 0 — Job created, funds escrowed
        Executing,  // 1 — Agent has started work
        Completed,  // 2 — Agent claims completion, awaiting judge review
        Disputed,   // 3 — Employer disputes agent's work
        Settled,    // 4 — Judge released funds to agent (minus platform fee)
        Refunded    // 5 — Judge or timeout refunded employer
    }

    struct Job {
        address employer;       // Who funded the escrow
        address worker;         // Agent's receiving wallet
        address judge;          // Arbitrator (PayPol bot wallet or designated judge)
        address token;          // ERC20 token address (AlphaUSD)
        uint256 budget;         // Total escrow amount
        uint256 platformFee;    // Fee deducted on settlement (calculated at creation)
        uint256 deadline;       // block.timestamp after which employer can claim timeout
        JobStatus status;       // Current lifecycle state
        bool rated;             // Whether employer has rated this job
    }

    // ── Storage ────────────────────────────────────────────────

    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;

    /// @notice Platform fee in basis points (800 = 8%). Deducted ONLY on settleJob.
    uint256 public platformFeeBps = 800;

    /// @notice Arbitration penalty in basis points (300 = 3%). Applied to losing party in disputes. Max $10.
    uint256 public arbitrationPenaltyBps = 300;
    uint256 public maxArbitrationPenalty = 10e18; // Max $10 in 18-decimal tokens

    /// @notice Accumulated platform fees per token, withdrawable by owner.
    mapping(address => uint256) public accumulatedFees;

    /// @notice On-chain worker rating aggregation
    mapping(address => uint256) public workerRatingSum;
    mapping(address => uint256) public workerRatingCount;

    // ── Events ─────────────────────────────────────────────────

    event JobCreated(
        uint256 indexed jobId,
        address indexed employer,
        address indexed worker,
        uint256 budget,
        uint256 deadline
    );

    event JobStatusChanged(
        uint256 indexed jobId,
        JobStatus oldStatus,
        JobStatus newStatus
    );

    event JobDisputed(
        uint256 indexed jobId,
        address indexed employer
    );

    event JobSettled(
        uint256 indexed jobId,
        uint256 workerPay,
        uint256 fee
    );

    event JobRefunded(
        uint256 indexed jobId,
        uint256 amount
    );

    event WorkerRated(
        uint256 indexed jobId,
        address indexed worker,
        uint256 rating
    );

    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event ArbitrationPenaltyApplied(uint256 indexed jobId, address indexed penalizedParty, uint256 penaltyAmount);
    event ArbitrationPenaltyUpdated(uint256 oldBps, uint256 newBps);
    event FeesWithdrawn(address indexed token, uint256 amount);

    // ── Constructor ────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Job Creation (Employer) ────────────────────────────────

    /**
     * @notice Create an escrow job. Employer must have approved this contract
     *         to spend `_amount` of `_token` beforehand.
     *
     * @param _worker           Agent's wallet address
     * @param _judge            Arbitrator wallet (typically PayPol bot wallet)
     * @param _token            ERC20 token address (e.g. AlphaUSD)
     * @param _amount           Payment amount (in token's smallest unit)
     * @param _deadlineDuration Seconds until timeout (e.g. 172800 = 48 hours)
     * @return jobId            The created job's ID
     */
    function createJob(
        address _worker,
        address _judge,
        address _token,
        uint256 _amount,
        uint256 _deadlineDuration
    ) external nonReentrant returns (uint256 jobId) {
        require(_worker != address(0), "Worker cannot be zero address");
        require(_judge  != address(0), "Judge cannot be zero address");
        require(_token  != address(0), "Token cannot be zero address");
        require(_amount > 0,           "Budget must be > 0");
        require(_deadlineDuration > 0, "Deadline duration must be > 0");

        // Transfer ERC20 from employer to this contract (requires prior approve)
        bool success = IERC20Minimal(_token).transferFrom(msg.sender, address(this), _amount);
        require(success, "Token transfer failed");

        // Calculate platform fee at creation time (applied only on settlement)
        uint256 fee = (_amount * platformFeeBps) / 10_000;

        jobId = nextJobId;
        jobs[jobId] = Job({
            employer:    msg.sender,
            worker:      _worker,
            judge:       _judge,
            token:       _token,
            budget:      _amount,
            platformFee: fee,
            deadline:    block.timestamp + _deadlineDuration,
            status:      JobStatus.Created,
            rated:       false
        });

        emit JobCreated(jobId, msg.sender, _worker, _amount, block.timestamp + _deadlineDuration);
        nextJobId++;
    }

    // ── Status Transitions ─────────────────────────────────────

    /**
     * @notice Mark job as Executing (called by agent/system when work begins).
     *         Only allowed from Created status.
     */
    function startJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(
            msg.sender == job.worker || msg.sender == job.judge || msg.sender == owner(),
            "Not authorized"
        );
        require(job.status == JobStatus.Created, "Job must be in Created status");

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Executing;
        emit JobStatusChanged(_jobId, oldStatus, JobStatus.Executing);
    }

    /**
     * @notice Mark job as Completed (called by agent when work is done).
     *         Only allowed from Created or Executing status.
     */
    function completeJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(
            msg.sender == job.worker || msg.sender == job.judge || msg.sender == owner(),
            "Not authorized"
        );
        require(
            job.status == JobStatus.Created || job.status == JobStatus.Executing,
            "Job must be in Created or Executing status"
        );

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Completed;
        emit JobStatusChanged(_jobId, oldStatus, JobStatus.Completed);
    }

    // ── Dispute (Employer) ─────────────────────────────────────

    /**
     * @notice Employer disputes the job result. Moves to Disputed status.
     *         Only the employer can dispute, and only for Created/Executing/Completed jobs.
     */
    function disputeJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.employer, "Only employer can dispute");
        require(
            job.status == JobStatus.Created ||
            job.status == JobStatus.Executing ||
            job.status == JobStatus.Completed,
            "Job cannot be disputed in current status"
        );

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Disputed;
        emit JobDisputed(_jobId, msg.sender);
        emit JobStatusChanged(_jobId, oldStatus, JobStatus.Disputed);
    }

    // ── Settlement (Judge / Owner) ─────────────────────────────

    /**
     * @notice Judge approves the work. Pays worker (budget - platformFee).
     *         Platform fee is accumulated and withdrawable by owner.
     *
     *         Can settle from: Created, Executing, Completed, Disputed.
     *         (Judge has final authority to resolve any state.)
     */
    function settleJob(uint256 _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(
            msg.sender == job.judge || msg.sender == owner(),
            "Only judge or owner can settle"
        );
        require(
            job.status != JobStatus.Settled && job.status != JobStatus.Refunded,
            "Job already finalized"
        );

        uint256 fee = job.platformFee;
        uint256 penalty = 0;

        // Engine 3: If job was disputed and company loses → 3% penalty on company (max $10)
        JobStatus oldStatus = job.status;
        if (oldStatus == JobStatus.Disputed) {
            penalty = (job.budget * arbitrationPenaltyBps) / 10_000;
            if (penalty > maxArbitrationPenalty) penalty = maxArbitrationPenalty;
            emit ArbitrationPenaltyApplied(_jobId, job.employer, penalty);
        }

        uint256 workerPay = job.budget - fee - penalty;
        job.status = JobStatus.Settled;

        // Accumulate platform fee + arbitration penalty for withdrawal
        accumulatedFees[job.token] += fee + penalty;

        // Pay worker
        bool success = IERC20Minimal(job.token).transfer(job.worker, workerPay);
        require(success, "Worker payment failed");

        emit JobSettled(_jobId, workerPay, fee);
        emit JobStatusChanged(_jobId, oldStatus, JobStatus.Settled);
    }

    // ── Refund (Judge / Owner) ─────────────────────────────────

    /**
     * @notice Judge refunds the full escrowed amount to the employer.
     *         No platform fee is deducted on refunds.
     *
     *         Can refund from: Created, Executing, Completed, Disputed.
     */
    function refundJob(uint256 _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(
            msg.sender == job.judge || msg.sender == owner(),
            "Only judge or owner can refund"
        );
        require(
            job.status != JobStatus.Settled && job.status != JobStatus.Refunded,
            "Job already finalized"
        );

        uint256 penalty = 0;
        JobStatus oldStatus = job.status;

        // Engine 3: If job was disputed and agent loses → 3% penalty on agent (max $10)
        if (oldStatus == JobStatus.Disputed) {
            penalty = (job.budget * arbitrationPenaltyBps) / 10_000;
            if (penalty > maxArbitrationPenalty) penalty = maxArbitrationPenalty;
            accumulatedFees[job.token] += penalty;
            emit ArbitrationPenaltyApplied(_jobId, job.worker, penalty);
        }

        uint256 refundAmount = job.budget - penalty;
        job.status = JobStatus.Refunded;

        // Refund to employer (full if no dispute, minus penalty if disputed)
        bool success = IERC20Minimal(job.token).transfer(job.employer, refundAmount);
        require(success, "Refund transfer failed");

        emit JobRefunded(_jobId, refundAmount);
        emit JobStatusChanged(_jobId, oldStatus, JobStatus.Refunded);
    }

    // ── Timeout Claim (Employer) ───────────────────────────────

    /**
     * @notice Employer claims a refund after the deadline has passed.
     *         Only allowed if the job hasn't been settled or refunded yet.
     *         This is the auto-timeout mechanism: if agent never delivers,
     *         employer can reclaim their funds after the deadline.
     */
    function claimTimeout(uint256 _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.employer, "Only employer can claim timeout");
        require(block.timestamp > job.deadline, "Deadline has not passed yet");
        require(
            job.status != JobStatus.Settled && job.status != JobStatus.Refunded,
            "Job already finalized"
        );

        uint256 refundAmount = job.budget;
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Refunded;

        bool success = IERC20Minimal(job.token).transfer(job.employer, refundAmount);
        require(success, "Timeout refund failed");

        emit JobRefunded(_jobId, refundAmount);
        emit JobStatusChanged(_jobId, oldStatus, JobStatus.Refunded);
    }

    // ── Rating (Employer) ──────────────────────────────────────

    /**
     * @notice Employer rates the worker (1-5 stars) after settlement.
     *         Can only rate once per job, and only if the job was settled.
     */
    function rateWorker(uint256 _jobId, uint256 _rating) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.employer, "Only employer can rate");
        require(job.status == JobStatus.Settled, "Job must be settled to rate");
        require(!job.rated, "Already rated");
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");

        job.rated = true;
        workerRatingSum[job.worker]   += _rating;
        workerRatingCount[job.worker] += 1;

        emit WorkerRated(_jobId, job.worker, _rating);
    }

    // ── Platform Admin ─────────────────────────────────────────

    /**
     * @notice Update the platform fee. Max 30% (3000 bps).
     */
    function setPlatformFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 3000, "Fee cannot exceed 30%");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(oldFee, _feeBps);
    }

    /**
     * @notice Update the arbitration penalty. Max 10% (1000 bps).
     */
    function setArbitrationPenaltyBps(uint256 _penaltyBps) external onlyOwner {
        require(_penaltyBps <= 1000, "Penalty cannot exceed 10%");
        uint256 oldPenalty = arbitrationPenaltyBps;
        arbitrationPenaltyBps = _penaltyBps;
        emit ArbitrationPenaltyUpdated(oldPenalty, _penaltyBps);
    }

    /**
     * @notice Update the max arbitration penalty cap (in token's smallest unit).
     */
    function setMaxArbitrationPenalty(uint256 _maxPenalty) external onlyOwner {
        maxArbitrationPenalty = _maxPenalty;
    }

    /**
     * @notice Withdraw accumulated platform fees for a specific token.
     */
    function withdrawFees(address _token) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees[_token];
        require(amount > 0, "No fees to withdraw");

        accumulatedFees[_token] = 0;

        bool success = IERC20Minimal(_token).transfer(owner(), amount);
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(_token, amount);
    }

    // ── View Helpers ───────────────────────────────────────────

    /**
     * @notice Get the average rating for a worker (0 if unrated).
     */
    function getWorkerRating(address _worker) external view returns (uint256) {
        if (workerRatingCount[_worker] == 0) return 0;
        return workerRatingSum[_worker] / workerRatingCount[_worker];
    }

    /**
     * @notice Get full job details.
     */
    function getJob(uint256 _jobId) external view returns (
        address employer,
        address worker,
        address judge,
        address token,
        uint256 budget,
        uint256 platformFee,
        uint256 deadline,
        JobStatus status,
        bool rated
    ) {
        Job storage job = jobs[_jobId];
        return (
            job.employer,
            job.worker,
            job.judge,
            job.token,
            job.budget,
            job.platformFee,
            job.deadline,
            job.status,
            job.rated
        );
    }

    /**
     * @notice Check if a job's deadline has passed.
     */
    function isTimedOut(uint256 _jobId) external view returns (bool) {
        Job storage job = jobs[_jobId];
        return block.timestamp > job.deadline &&
               job.status != JobStatus.Settled &&
               job.status != JobStatus.Refunded;
    }
}
