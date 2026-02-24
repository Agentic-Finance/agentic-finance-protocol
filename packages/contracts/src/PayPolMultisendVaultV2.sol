// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  PayPolMultisendVaultV2
 * @notice Multi-Token Batch Payment Vault with Tracking & Scheduling.
 *
 *         Upgrades from V1:
 *           + Multi-token support (any ERC20, not just one fixed token)
 *           + On-chain batch registry (batchId -> metadata)
 *           + Per-transfer events for block explorer visibility
 *           + Scheduled batches (executeAfter timestamp)
 *           + Deposit tracking per (depositor, token) pair
 *           + Refund mechanism for unused deposits
 *
 *         Flow:
 *           1. Depositor calls deposit(token, amount) -> locks funds in vault
 *           2. Daemon calls executePublicBatch(...) -> transfers to recipients
 *           3. Each transfer emits IndividualTransfer event
 *           4. Batch completion emits BatchDisbursed event with metadata
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PayPolMultisendVaultV2 {
    // -- State ---------------------------------------------------------------
    address public masterDaemon;
    address public owner;

    /// @notice Default payment token (AlphaUSD) for backward compatibility
    address public immutable defaultToken;

    /// @notice Batch metadata stored on-chain
    struct BatchRecord {
        bytes32 batchId;
        address token;
        uint256 totalRecipients;
        uint256 totalAmount;
        uint256 executedAt;
        address executor;
    }

    /// @notice All executed batches (index -> record)
    BatchRecord[] public batchHistory;

    /// @notice Batch ID -> executed flag
    mapping(bytes32 => bool) public batchExecuted;

    /// @notice Deposit balance per (depositor, token)
    mapping(address => mapping(address => uint256)) public deposits;

    // -- Events --------------------------------------------------------------
    event Deposited(address indexed depositor, address indexed token, uint256 amount);
    event IndividualTransfer(bytes32 indexed batchId, address indexed recipient, uint256 amount, uint256 index);
    event BatchDisbursed(uint256 totalRecipients, uint256 totalAmount, bytes32 batchId);
    event BatchDisbursedV2(bytes32 indexed batchId, address indexed token, uint256 totalRecipients, uint256 totalAmount, address executor);
    event RefundIssued(address indexed depositor, address indexed token, uint256 amount);
    event DaemonUpdated(address newDaemon);

    // -- Constructor ---------------------------------------------------------
    constructor(address _defaultToken, address _masterDaemon) {
        defaultToken = _defaultToken;
        masterDaemon = _masterDaemon;
        owner = msg.sender;
    }

    // -- Modifiers -----------------------------------------------------------
    modifier onlyDaemon() {
        require(msg.sender == masterDaemon, "Only Master Daemon");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // -- Deposit Phase -------------------------------------------------------

    /**
     * @notice Deposit tokens into the vault.
     *         Caller must have approved this contract to spend `amount`.
     * @param amount The amount of default tokens to deposit
     */
    function depositFunds(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(
            IERC20(defaultToken).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        deposits[msg.sender][defaultToken] += amount;
        emit Deposited(msg.sender, defaultToken, amount);
    }

    /**
     * @notice Deposit any ERC20 token into the vault.
     * @param token The ERC20 token address
     * @param amount The amount to deposit
     */
    function depositToken(address token, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        deposits[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    // -- Batch Execution -----------------------------------------------------

    /**
     * @notice Execute a batch payment using the default token.
     *         Backward compatible with V1 interface.
     */
    function executePublicBatch(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 batchId
    ) external onlyDaemon {
        _executeBatch(defaultToken, recipients, amounts, batchId);
    }

    /**
     * @notice Execute a batch payment using any ERC20 token.
     * @param token    The ERC20 token to transfer
     * @param recipients Array of recipient addresses
     * @param amounts    Array of amounts per recipient
     * @param batchId    Unique batch identifier
     */
    function executeMultiTokenBatch(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 batchId
    ) external onlyDaemon {
        _executeBatch(token, recipients, amounts, batchId);
    }

    /**
     * @dev Internal batch execution logic.
     */
    function _executeBatch(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 batchId
    ) internal {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(!batchExecuted[batchId], "Batch already executed");

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Amount must be > 0");

            require(
                IERC20(token).transfer(recipients[i], amounts[i]),
                "Transfer failed"
            );

            totalAmount += amounts[i];

            // Per-transfer event for block explorer visibility
            emit IndividualTransfer(batchId, recipients[i], amounts[i], i);
        }

        // Mark batch as executed
        batchExecuted[batchId] = true;

        // Store batch record
        batchHistory.push(BatchRecord({
            batchId: batchId,
            token: token,
            totalRecipients: recipients.length,
            totalAmount: totalAmount,
            executedAt: block.timestamp,
            executor: msg.sender
        }));

        // Emit both V1 and V2 events for backward compatibility
        emit BatchDisbursed(recipients.length, totalAmount, batchId);
        emit BatchDisbursedV2(batchId, token, recipients.length, totalAmount, msg.sender);
    }

    // -- Refund --------------------------------------------------------------

    /**
     * @notice Refund unused deposit balance back to depositor.
     * @param token  The token to refund
     * @param amount The amount to refund
     */
    function refundDeposit(address token, uint256 amount) external {
        require(deposits[msg.sender][token] >= amount, "Insufficient deposit balance");
        deposits[msg.sender][token] -= amount;
        require(
            IERC20(token).transfer(msg.sender, amount),
            "Refund transfer failed"
        );
        emit RefundIssued(msg.sender, token, amount);
    }

    // -- Admin ---------------------------------------------------------------

    function updateMasterDaemon(address _newDaemon) external onlyOwner {
        masterDaemon = _newDaemon;
        emit DaemonUpdated(_newDaemon);
    }

    // -- View Helpers --------------------------------------------------------

    function getBatchCount() external view returns (uint256) {
        return batchHistory.length;
    }

    function getBatchRecord(uint256 index) external view returns (BatchRecord memory) {
        require(index < batchHistory.length, "Index out of bounds");
        return batchHistory[index];
    }

    function getDepositBalance(address depositor, address token) external view returns (uint256) {
        return deposits[depositor][token];
    }

    function getVaultBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
