// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  AgentRegistry
 * @notice On-chain registry for the PayPol Agent Marketplace.
 *         Agents register with a price and webhook URL.
 *         Clients hire agents by sending ETH/token; platform fee is deducted automatically.
 */
contract AgentRegistry is Ownable, ReentrancyGuard {

    // ── Data Structures ───────────────────────────────────────

    struct Agent {
        string   name;
        string   description;
        string   category;       // e.g. "security" | "defi" | "payroll"
        uint256  priceWei;       // price per job in native token (wei)
        address payable wallet;  // agent developer's receiving wallet
        bool     active;
        uint256  totalJobs;
        uint256  ratingSum;      // sum of all 1-5 ratings
        uint256  ratingCount;
        string   webhookUrl;     // off-chain execution endpoint
        uint256  registeredAt;
    }

    // ── Storage ───────────────────────────────────────────────

    // agentId (keccak256) → Agent
    mapping(bytes32 => Agent) public agents;

    // Ordered list of all registered agent IDs
    bytes32[] public agentIds;

    // Job escrow: jobId → escrowed amount (wei)
    mapping(bytes32 => uint256) public jobEscrow;

    // Platform cut (basis points, 100 = 1%)
    uint256 public platformFeeBps = 1000; // 10 %

    // ── Events ────────────────────────────────────────────────

    event AgentRegistered(bytes32 indexed agentId, string name, address indexed wallet);
    event AgentUpdated(bytes32 indexed agentId);
    event AgentDeactivated(bytes32 indexed agentId);
    event JobFunded(bytes32 indexed jobId, bytes32 indexed agentId, address indexed client, uint256 amount);
    event JobSettled(bytes32 indexed jobId, bytes32 indexed agentId, uint256 agentPayment, uint256 fee);
    event AgentRated(bytes32 indexed agentId, address indexed rater, uint256 rating);

    // ── Constructor ───────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Agent Management ──────────────────────────────────────

    /**
     * @notice Register a new agent. Returns a unique agentId.
     * @param name        Human-readable agent name
     * @param description Short description of capabilities
     * @param category    Category string (security, defi, payroll, analytics...)
     * @param priceWei    Job price in wei
     * @param webhookUrl  HTTPS endpoint that executes the job
     */
    function registerAgent(
        string calldata name,
        string calldata description,
        string calldata category,
        uint256 priceWei,
        string calldata webhookUrl
    ) external returns (bytes32 agentId) {
        require(bytes(name).length > 0, "Name required");
        require(priceWei > 0,           "Price must be > 0");

        agentId = keccak256(abi.encodePacked(msg.sender, name, block.timestamp));
        require(agents[agentId].wallet == address(0), "Agent already exists");

        agents[agentId] = Agent({
            name:         name,
            description:  description,
            category:     category,
            priceWei:     priceWei,
            wallet:       payable(msg.sender),
            active:       true,
            totalJobs:    0,
            ratingSum:    0,
            ratingCount:  0,
            webhookUrl:   webhookUrl,
            registeredAt: block.timestamp
        });

        agentIds.push(agentId);
        emit AgentRegistered(agentId, name, msg.sender);
    }

    /**
     * @notice Update an existing agent's metadata and price.
     *         Only the agent owner may call this.
     */
    function updateAgent(
        bytes32 agentId,
        string calldata description,
        uint256 priceWei,
        string calldata webhookUrl
    ) external {
        require(agents[agentId].wallet == msg.sender, "Not agent owner");
        Agent storage a = agents[agentId];
        a.description = description;
        a.priceWei    = priceWei;
        a.webhookUrl  = webhookUrl;
        emit AgentUpdated(agentId);
    }

    /**
     * @notice Deactivate an agent (owner or platform admin).
     */
    function deactivateAgent(bytes32 agentId) external {
        Agent storage a = agents[agentId];
        require(a.wallet == msg.sender || owner() == msg.sender, "Not authorized");
        a.active = false;
        emit AgentDeactivated(agentId);
    }

    // ── Job Lifecycle ─────────────────────────────────────────

    /**
     * @notice Fund a job escrow. Client pays msg.value >= agent.priceWei.
     *         Off-chain service listens to JobFunded and calls the webhook.
     * @param agentId   The agent to hire
     * @param jobId     Client-generated unique job identifier
     */
    function fundJob(bytes32 agentId, bytes32 jobId) external payable nonReentrant {
        Agent storage a = agents[agentId];
        require(a.active,                    "Agent not active");
        require(msg.value >= a.priceWei,     "Insufficient payment");
        require(jobEscrow[jobId] == 0,       "Job ID already used");

        jobEscrow[jobId] = msg.value;
        a.totalJobs++;

        emit JobFunded(jobId, agentId, msg.sender, msg.value);
    }

    /**
     * @notice Settle a completed job: release escrow minus platform fee.
     *         Called by the platform after verifying off-chain result.
     * @param jobId    The job to settle
     * @param agentId  The agent that executed the job
     */
    function settleJob(bytes32 jobId, bytes32 agentId) external onlyOwner nonReentrant {
        uint256 escrowed = jobEscrow[jobId];
        require(escrowed > 0, "Job not funded or already settled");

        uint256 fee           = (escrowed * platformFeeBps) / 10_000;
        uint256 agentPayment  = escrowed - fee;

        jobEscrow[jobId] = 0;
        agents[agentId].wallet.transfer(agentPayment);

        emit JobSettled(jobId, agentId, agentPayment, fee);
    }

    // ── Rating System ─────────────────────────────────────────

    /**
     * @notice Rate a completed job (1–5 stars).
     */
    function rateAgent(bytes32 agentId, uint256 rating) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(agents[agentId].active,     "Agent not active");

        agents[agentId].ratingSum   += rating;
        agents[agentId].ratingCount += 1;

        emit AgentRated(agentId, msg.sender, rating);
    }

    // ── View Helpers ──────────────────────────────────────────

    /** @notice Returns the average star rating (0 if unrated). */
    function getAgentRating(bytes32 agentId) external view returns (uint256) {
        Agent storage a = agents[agentId];
        if (a.ratingCount == 0) return 0;
        return a.ratingSum / a.ratingCount;
    }

    /** @notice Total number of registered agents. */
    function getAgentCount() external view returns (uint256) {
        return agentIds.length;
    }

    // ── Platform Admin ────────────────────────────────────────

    /** @notice Update platform fee. Max 30%. */
    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= 3000, "Fee cannot exceed 30%");
        platformFeeBps = feeBps;
    }

    /** @notice Withdraw accumulated platform fees. */
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
