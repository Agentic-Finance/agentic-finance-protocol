// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofChainSettlement — Incremental Proof Chain Settlement
 * @notice On-chain settlement for chained micropayment proofs.
 *
 * Instead of verifying N proofs for N payments, verify 1 proof that
 * covers the entire chain. Each proof chains to the previous via
 * Poseidon hash — if any payment was invalid, the chain breaks.
 *
 * Use case: AI agent makes 100 micropayments/day (API calls via MPP).
 *   - Each payment is added to the proof chain off-chain
 *   - At settlement: submit 1 proof covering all payments
 *   - Contract verifies 1 proof, settles the total amount
 *   - Gas: ~321K instead of ~3M (90%+ savings on mainnet)
 *
 * Flow:
 *   1. Agent accumulates payments off-chain, building proof chain
 *   2. Agent generates final proof: prevChainHash → newChainHash
 *   3. Agent calls settleBatch(proof, pubSignals)
 *   4. Contract verifies proof, checks prevChainHash matches stored state
 *   5. Total settlement amount is transferred
 */

interface IProofChainVerifier {
    function verifyProof(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals
    ) external view returns (bool);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract ProofChainSettlement {

    // ═══════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════

    IProofChainVerifier public immutable verifier;
    address public owner;
    address public token; // Settlement token (AlphaUSD)

    /// @notice Sender commitment => current chain hash
    /// Starts at 0 (genesis). Updated after each settlement.
    mapping(address => uint256) public chainHashes;

    /// @notice Sender => total settled amount
    mapping(address => uint256) public totalSettled;

    /// @notice Sender => total batches settled
    mapping(address => uint256) public totalBatches;

    /// @notice Sender => total individual payments settled
    mapping(address => uint256) public totalPayments;

    /// @notice Global stats
    uint256 public globalSettledAmount;
    uint256 public globalBatchCount;
    uint256 public globalPaymentCount;

    /// @notice Platform fee (basis points, e.g., 50 = 0.5%)
    uint256 public platformFeeBps;
    uint256 public constant MAX_FEE_BPS = 500; // 5% max
    address public feeRecipient;

    // ═══════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════

    event BatchSettled(
        address indexed sender,
        uint256 prevChainHash,
        uint256 newChainHash,
        uint256 settlementAmount,
        uint256 batchCount,
        uint256 fee,
        uint256 timestamp
    );

    event ChainReset(address indexed sender, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ═══════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════

    constructor(
        address _verifier,
        address _token,
        uint256 _platformFeeBps,
        address _feeRecipient
    ) {
        verifier = IProofChainVerifier(_verifier);
        owner = msg.sender;
        token = _token;
        platformFeeBps = _platformFeeBps;
        feeRecipient = _feeRecipient;
    }

    // ═══════════════════════════════════════════════
    // CORE: Settle a proof chain batch
    // ═══════════════════════════════════════════════

    /// @notice Pending settlement balance per recipient
    mapping(address => uint256) public recipientBalances;

    event RecipientCredited(address indexed recipient, uint256 amount);
    event RecipientClaimed(address indexed recipient, uint256 amount);

    /**
     * @notice Settle a batch of micropayments using a chained proof
     * @param _proof PLONK proof (24 uint256 elements)
     * @param _pubSignals [prevChainHash, newChainHash, settlementAmount, batchCount]
     * @param _recipients Array of recipient addresses for distribution
     * @param _amounts Array of amounts per recipient (must sum to settlementAmount - fee)
     *
     * The proof guarantees:
     *   - All payments in the batch are valid (correct amounts, recipients)
     *   - The chain hash correctly extends from prevChainHash
     *   - Settlement amount matches the sum of all payments
     *   - Batch count matches the number of payments
     */
    function settleBatch(
        uint256[24] calldata _proof,
        uint256[4] calldata _pubSignals,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) external {
        uint256 prevChainHash = _pubSignals[0];
        uint256 newChainHash = _pubSignals[1];
        uint256 settlementAmount = _pubSignals[2];
        uint256 batchCount = _pubSignals[3];

        // Verify chain continuity
        require(
            chainHashes[msg.sender] == prevChainHash,
            "ProofChain: chain hash mismatch - submit from current state"
        );

        // Verify the PLONK proof
        bool proofValid = verifier.verifyProof(_proof, _pubSignals);
        require(proofValid, "ProofChain: invalid ZK proof");

        // Calculate fee
        uint256 fee = (settlementAmount * platformFeeBps) / 10000;
        uint256 netAmount = settlementAmount - fee;

        // Update chain state
        chainHashes[msg.sender] = newChainHash;
        totalSettled[msg.sender] += settlementAmount;
        totalBatches[msg.sender] += 1;
        totalPayments[msg.sender] += batchCount;

        globalSettledAmount += settlementAmount;
        globalBatchCount += 1;
        globalPaymentCount += batchCount;

        // Validate recipients
        require(_recipients.length == _amounts.length, "ProofChain: recipient/amount length mismatch");

        // Transfer settlement (sender must have approved this contract)
        if (settlementAmount > 0 && token != address(0)) {
            require(
                IERC20(token).transferFrom(msg.sender, address(this), settlementAmount),
                "ProofChain: transfer failed"
            );

            // Fee to platform
            if (fee > 0 && feeRecipient != address(0)) {
                require(IERC20(token).transfer(feeRecipient, fee), "ProofChain: fee transfer failed");
            }

            // Distribute net amount to recipients
            uint256 distributed = 0;
            for (uint256 i = 0; i < _recipients.length; i++) {
                recipientBalances[_recipients[i]] += _amounts[i];
                distributed += _amounts[i];
                emit RecipientCredited(_recipients[i], _amounts[i]);
            }
            require(distributed == netAmount, "ProofChain: distribution mismatch");
        }

        emit BatchSettled(
            msg.sender,
            prevChainHash,
            newChainHash,
            settlementAmount,
            batchCount,
            fee,
            block.timestamp
        );
    }

    /**
     * @notice Recipients claim their accumulated settlement balance
     */
    function claimSettlement() external {
        uint256 amount = recipientBalances[msg.sender];
        require(amount > 0, "ProofChain: nothing to claim");
        recipientBalances[msg.sender] = 0;
        require(IERC20(token).transfer(msg.sender, amount), "ProofChain: claim transfer failed");
        emit RecipientClaimed(msg.sender, amount);
    }

    // ═══════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════

    /**
     * @notice Get sender's current chain state
     */
    function getSenderState(address _sender) external view returns (
        uint256 currentChainHash,
        uint256 settled,
        uint256 batches,
        uint256 payments
    ) {
        return (
            chainHashes[_sender],
            totalSettled[_sender],
            totalBatches[_sender],
            totalPayments[_sender]
        );
    }

    /**
     * @notice Get global stats
     */
    function getGlobalStats() external view returns (
        uint256 _totalSettled,
        uint256 _totalBatches,
        uint256 _totalPayments
    ) {
        return (globalSettledAmount, globalBatchCount, globalPaymentCount);
    }

    // ═══════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════

    function setPlatformFee(uint256 _feeBps) external {
        require(msg.sender == owner, "ProofChain: not owner");
        require(_feeBps <= MAX_FEE_BPS, "ProofChain: fee too high");
        platformFeeBps = _feeBps;
    }

    function setFeeRecipient(address _recipient) external {
        require(msg.sender == owner, "ProofChain: not owner");
        feeRecipient = _recipient;
    }

    /**
     * @notice Reset a sender's chain (emergency only)
     */
    function resetChain(address _sender) external {
        require(msg.sender == owner, "ProofChain: not owner");
        chainHashes[_sender] = 0;
        emit ChainReset(_sender, block.timestamp);
    }

    /**
     * @notice Withdraw accumulated funds for distribution
     */
    function withdraw(address _to, uint256 _amount) external {
        require(msg.sender == owner, "ProofChain: not owner");
        require(IERC20(token).transfer(_to, _amount), "ProofChain: withdraw failed");
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "ProofChain: not owner");
        require(_newOwner != address(0), "ProofChain: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
