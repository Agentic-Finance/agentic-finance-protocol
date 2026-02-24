// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  PayPolShieldVaultV2
 * @notice ZK-SNARK Shielded Payment Vault with Nullifier Anti-Double-Spend.
 *
 *         Upgrades from V1:
 *           + Commitment registry (deposit phase)
 *           + Nullifier tracking (prevents replay attacks)
 *           + pubSignals expanded to 3: [commitment, nullifierHash, recipient]
 *
 *         Flow:
 *           1. Depositor calls deposit(commitment, amount) → registers commitment + locks funds
 *           2. Recipient calls withdraw(proof, pubSignals, amount) → verifies proof + sends funds
 *           3. Contract checks: commitment exists, nullifier not used, proof valid
 *
 *         Circuit: PayPolShieldV2.circom
 *           - commitment = Poseidon(secret, nullifier, amount, recipient)
 *           - nullifierHash = Poseidon(nullifier, secret)
 */

interface IPlonkVerifier {
    function verifyProof(uint256[24] calldata proof, uint256[3] calldata pubSignals) external view returns (bool);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PayPolShieldVaultV2 {
    // ── State ────────────────────────────────────────────────
    IPlonkVerifier public immutable verifier;
    IERC20 public immutable paymentToken;
    address public masterDaemon;
    address public owner;

    /// @notice Registered commitments (commitment hash → deposited)
    mapping(uint256 => bool) public commitments;

    /// @notice Used nullifiers (nullifierHash → spent)
    mapping(uint256 => bool) public usedNullifiers;

    /// @notice Amount locked per commitment (for partial withdrawal support)
    mapping(uint256 => uint256) public commitmentAmounts;

    // ── Events ───────────────────────────────────────────────
    event Deposited(uint256 indexed commitment, address indexed depositor, uint256 amount);
    event ShieldedWithdrawal(uint256 indexed commitment, uint256 indexed nullifierHash, address indexed recipient, uint256 amount);
    event PublicPayoutExecuted(address indexed recipient, uint256 amount);
    event DaemonUpdated(address newDaemon);

    // ── Constructor ──────────────────────────────────────────
    constructor(address _verifier, address _paymentToken, address _masterDaemon) {
        verifier = IPlonkVerifier(_verifier);
        paymentToken = IERC20(_paymentToken);
        masterDaemon = _masterDaemon;
        owner = msg.sender;
    }

    // ── Modifiers ────────────────────────────────────────────
    modifier onlyDaemon() {
        require(msg.sender == masterDaemon, "Only Master Daemon");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ── Deposit Phase ────────────────────────────────────────

    /**
     * @notice Register a commitment and lock funds.
     *         Caller must have approved this contract to spend `amount`.
     *
     * @param commitment  The Poseidon hash commitment (computed off-chain)
     * @param amount      The amount of tokens to lock (in token's smallest unit)
     */
    function deposit(uint256 commitment, uint256 amount) external {
        require(!commitments[commitment], "Commitment already registered");
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from depositor to vault
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        // Register commitment
        commitments[commitment] = true;
        commitmentAmounts[commitment] = amount;

        emit Deposited(commitment, msg.sender, amount);
    }

    // ── Withdrawal Phase (ZK Proof Required) ─────────────────

    /**
     * @notice Execute a shielded withdrawal using a ZK-SNARK proof.
     *
     * @param proof       PLONK proof (24 uint256 elements)
     * @param pubSignals  Public signals: [commitment, nullifierHash, recipient]
     * @param exactAmount The exact amount to withdraw (must match commitment amount)
     */
    function executeShieldedPayout(
        uint256[24] calldata proof,
        uint256[3] calldata pubSignals,
        uint256 exactAmount
    ) external onlyDaemon {
        uint256 commitment    = pubSignals[0];
        uint256 nullifierHash = pubSignals[1];
        // pubSignals[2] = recipient (used by circuit, extracted below)

        // 1. Check commitment exists
        require(commitments[commitment], "Unknown commitment");

        // 2. Check nullifier not already used (anti-double-spend)
        require(!usedNullifiers[nullifierHash], "Nullifier already used - double spend rejected");

        // 3. Verify ZK proof
        require(verifier.verifyProof(proof, pubSignals), "ZK: Invalid proof");

        // 4. Mark nullifier as used
        usedNullifiers[nullifierHash] = true;

        // 5. Extract recipient from pubSignals and transfer
        address recipient = address(uint160(pubSignals[2]));
        require(
            paymentToken.transfer(recipient, exactAmount),
            "Shielded transfer failed"
        );

        emit ShieldedWithdrawal(commitment, nullifierHash, recipient, exactAmount);
    }

    // ── Public Payout (No ZK, Daemon-only) ───────────────────

    function executePublicPayout(address recipient, uint256 amount) external onlyDaemon {
        require(paymentToken.transfer(recipient, amount), "Transfer failed");
        emit PublicPayoutExecuted(recipient, amount);
    }

    // ── Admin ────────────────────────────────────────────────

    function updateMasterDaemon(address _newDaemon) external onlyOwner {
        masterDaemon = _newDaemon;
        emit DaemonUpdated(_newDaemon);
    }

    // ── View Helpers ─────────────────────────────────────────

    function isCommitmentRegistered(uint256 commitment) external view returns (bool) {
        return commitments[commitment];
    }

    function isNullifierUsed(uint256 nullifierHash) external view returns (bool) {
        return usedNullifiers[nullifierHash];
    }

    function getCommitmentAmount(uint256 commitment) external view returns (uint256) {
        return commitmentAmounts[commitment];
    }
}
