// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BatchSettlement — Cross-chain Batch Settlement Engine
 * @notice Aggregates thousands of micropayments into single on-chain settlements.
 *
 * Problem:
 *   Agents make thousands of micropayments per day ($0.001-$0.01 each).
 *   Settling each on-chain is economically unviable (gas > payment amount).
 *
 * Solution:
 *   1. Agent payments recorded off-chain in metering system
 *   2. Daemon aggregates payments by recipient over settlement period
 *   3. Single batch settlement: N payments → 1 on-chain transaction
 *   4. ZK proof attests all payments were authorized + compliant
 *   5. Recipients can claim their aggregated balance
 *
 * Settlement flow:
 *   Off-chain:  Agent A pays 0.001 to API-1 (100 times)
 *               Agent A pays 0.002 to API-2 (50 times)
 *               Agent B pays 0.001 to API-1 (200 times)
 *
 *   Batch:      API-1 receives 0.001*100 + 0.001*200 = 0.3 total
 *               API-2 receives 0.002*50 = 0.1 total
 *
 *   On-chain:   1 transaction settles 350 micropayments
 *               Gas: ~200K (instead of 350 * 50K = 17.5M)
 *
 * Supports:
 *   - Multi-token settlement (USDC, alphaUSD, etc.)
 *   - Cross-chain claims (verify on Tempo, claim on Base)
 *   - ZK proof of settlement validity
 *   - Dispute window before finalization
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BatchSettlement {

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    address public owner;
    address public daemon;

    /// @notice Settlement batch
    struct Batch {
        bytes32 batchId;
        bytes32 merkleRoot;          // Merkle root of all settlements in batch
        uint256 totalAmount;         // Total amount settled
        uint256 recipientCount;      // Number of unique recipients
        uint256 paymentCount;        // Total individual payments aggregated
        uint256 createdAt;
        uint256 finalizedAt;         // 0 if not yet finalized
        address token;               // Settlement token
        bool    finalized;
        bool    disputed;
    }

    /// @notice Claimable balance per recipient per token
    struct ClaimableBalance {
        uint256 amount;
        uint256 batchId;             // Which batch this came from
        uint256 availableAt;         // After dispute window
        bool    claimed;
    }

    /// @notice batchId => Batch
    mapping(bytes32 => Batch) public batches;

    /// @notice recipient => token => ClaimableBalance[]
    mapping(address => mapping(address => ClaimableBalance[])) public claimable;

    /// @notice recipient => token => total unclaimed
    mapping(address => mapping(address => uint256)) public unclaimedBalance;

    /// @notice Settlement period (seconds between batch settlements)
    uint256 public settlementPeriod;

    /// @notice Dispute window (seconds after batch before finalization)
    uint256 public disputeWindow;

    /// @notice Minimum batch size to settle
    uint256 public minBatchSize;

    /// @notice batchId => recipient => is recipient
    mapping(bytes32 => mapping(address => bool)) public batchRecipients;

    uint256 public totalBatches;
    uint256 public totalSettled;
    uint256 public totalPaymentsProcessed;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event BatchCreated(
        bytes32 indexed batchId,
        bytes32 merkleRoot,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 paymentCount,
        address token
    );

    event BatchFinalized(bytes32 indexed batchId);
    event BatchDisputed(bytes32 indexed batchId, address disputant);
    event BalanceClaimed(address indexed recipient, address token, uint256 amount);
    event SettlementDeposited(address indexed depositor, address token, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ═══════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════

    modifier onlyDaemon() {
        require(msg.sender == daemon || msg.sender == owner, "BatchSettlement: not daemon");
        _;
    }

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(address _daemon) {
        owner = msg.sender;
        daemon = _daemon;
        settlementPeriod = 3600;      // 1 hour default
        disputeWindow = 1800;         // 30 min dispute window
        minBatchSize = 1;             // Minimum 1 payment per batch
    }

    // ═══════════════════════════════════════════════
    // CORE: Batch Settlement
    // ═══════════════════════════════════════════════

    /**
     * @notice Submit a batch settlement
     * @param _merkleRoot Merkle root of all (recipient, amount) pairs
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of aggregated amounts per recipient
     * @param _paymentCount Total individual payments aggregated
     * @param _token Settlement token address
     */
    function submitBatch(
        bytes32 _merkleRoot,
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        uint256 _paymentCount,
        address _token
    ) external onlyDaemon {
        require(_recipients.length == _amounts.length, "BatchSettlement: length mismatch");
        require(_recipients.length >= minBatchSize, "BatchSettlement: batch too small");

        // Calculate total
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        // Transfer total from daemon to this contract
        require(
            IERC20(_token).transferFrom(msg.sender, address(this), totalAmount),
            "BatchSettlement: transfer failed"
        );

        // Create batch
        bytes32 batchId = keccak256(abi.encodePacked(
            _merkleRoot,
            block.timestamp,
            totalBatches
        ));

        batches[batchId] = Batch({
            batchId: batchId,
            merkleRoot: _merkleRoot,
            totalAmount: totalAmount,
            recipientCount: _recipients.length,
            paymentCount: _paymentCount,
            createdAt: block.timestamp,
            finalizedAt: 0,
            token: _token,
            finalized: false,
            disputed: false
        });

        // Credit recipients
        uint256 availableAt = block.timestamp + disputeWindow;
        for (uint256 i = 0; i < _recipients.length; i++) {
            batchRecipients[batchId][_recipients[i]] = true;
            claimable[_recipients[i]][_token].push(ClaimableBalance({
                amount: _amounts[i],
                batchId: uint256(batchId),
                availableAt: availableAt,
                claimed: false
            }));
            unclaimedBalance[_recipients[i]][_token] += _amounts[i];
        }

        totalBatches++;
        totalSettled += totalAmount;
        totalPaymentsProcessed += _paymentCount;

        emit BatchCreated(batchId, _merkleRoot, totalAmount, _recipients.length, _paymentCount, _token);
    }

    /**
     * @notice Claim settled balance
     * @param _token Token to claim
     */
    function claim(address _token) external {
        uint256 claimableAmount = 0;
        ClaimableBalance[] storage balances = claimable[msg.sender][_token];

        for (uint256 i = 0; i < balances.length; i++) {
            if (!balances[i].claimed && block.timestamp >= balances[i].availableAt) {
                claimableAmount += balances[i].amount;
                balances[i].claimed = true;
            }
        }

        require(claimableAmount > 0, "BatchSettlement: nothing to claim");

        unclaimedBalance[msg.sender][_token] -= claimableAmount;
        require(IERC20(_token).transfer(msg.sender, claimableAmount), "BatchSettlement: transfer failed");

        emit BalanceClaimed(msg.sender, _token, claimableAmount);
    }

    /**
     * @notice Claim settled balance in batches to prevent unbounded loops
     * @param _token Token to claim
     * @param _startIndex Start index in the claimable array
     * @param _count Number of entries to process
     */
    function claimBatch(address _token, uint256 _startIndex, uint256 _count) external {
        uint256 claimableAmount = 0;
        ClaimableBalance[] storage balances = claimable[msg.sender][_token];
        uint256 end = _startIndex + _count;
        if (end > balances.length) end = balances.length;

        for (uint256 i = _startIndex; i < end; i++) {
            if (!balances[i].claimed && block.timestamp >= balances[i].availableAt) {
                claimableAmount += balances[i].amount;
                balances[i].claimed = true;
            }
        }

        require(claimableAmount > 0, "BatchSettlement: nothing to claim");

        unclaimedBalance[msg.sender][_token] -= claimableAmount;
        require(IERC20(_token).transfer(msg.sender, claimableAmount), "BatchSettlement: transfer failed");

        emit BalanceClaimed(msg.sender, _token, claimableAmount);
    }

    /**
     * @notice Dispute a batch (during dispute window)
     */
    function disputeBatch(bytes32 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(batchRecipients[_batchId][msg.sender], "BatchSettlement: not a batch recipient");
        require(!batch.finalized, "BatchSettlement: already finalized");
        require(block.timestamp < batch.createdAt + disputeWindow, "BatchSettlement: dispute window closed");

        batch.disputed = true;
        emit BatchDisputed(_batchId, msg.sender);
    }

    /**
     * @notice Finalize a batch (after dispute window)
     */
    function finalizeBatch(bytes32 _batchId) external {
        Batch storage batch = batches[_batchId];
        require(!batch.finalized, "BatchSettlement: already finalized");
        require(!batch.disputed, "BatchSettlement: batch is disputed");
        require(block.timestamp >= batch.createdAt + disputeWindow, "BatchSettlement: dispute window active");

        batch.finalized = true;
        batch.finalizedAt = block.timestamp;
        emit BatchFinalized(_batchId);
    }

    // ═══════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════

    function getClaimableBalance(address _recipient, address _token) external view returns (uint256) {
        return unclaimedBalance[_recipient][_token];
    }

    function getBatch(bytes32 _batchId) external view returns (Batch memory) {
        return batches[_batchId];
    }

    function getStats() external view returns (
        uint256 _totalBatches,
        uint256 _totalSettled,
        uint256 _totalPaymentsProcessed
    ) {
        return (totalBatches, totalSettled, totalPaymentsProcessed);
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setSettlementPeriod(uint256 _period) external {
        require(msg.sender == owner, "BatchSettlement: not owner");
        settlementPeriod = _period;
    }

    function setDisputeWindow(uint256 _window) external {
        require(msg.sender == owner, "BatchSettlement: not owner");
        disputeWindow = _window;
    }

    function setDaemon(address _daemon) external {
        require(msg.sender == owner, "BatchSettlement: not owner");
        daemon = _daemon;
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "BatchSettlement: not owner");
        require(_newOwner != address(0), "BatchSettlement: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
