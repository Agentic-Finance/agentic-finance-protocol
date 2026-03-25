// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  BatchShieldExecutor
 * @notice Proxy contract that batches multiple ZK shielded payouts into a single
 *         atomic transaction. Sits between the off-chain daemon and ShieldVaultV2.
 *
 *         Architecture:
 *           Daemon Wallet → BatchShieldExecutor.batchExecuteShieldedPayout(...)
 *                             ↓ loop
 *                             ShieldVaultV2.executeShieldedPayout(proof, pubSignals, amount)
 *                             ← 1 TX, all-or-nothing atomic
 *
 *         After deployment, ShieldVaultV2.updateMasterDaemon(thisContract) must be
 *         called so this contract can forward payout calls.
 *
 *         Backward-compatible: single executeShieldedPayout() still works for
 *         Path B (full lifecycle) jobs that need individual processing.
 */

interface IShieldVaultV2 {
    function executeShieldedPayout(
        uint256[24] calldata proof,
        uint256[3] calldata pubSignals,
        uint256 exactAmount
    ) external;

    function executePublicPayout(address recipient, uint256 amount) external;

    function deposit(uint256 commitment, uint256 amount) external;
}

contract BatchShieldExecutor {
    // ── State ────────────────────────────────────────────────
    address public owner;
    address public daemon;           // The off-chain daemon wallet
    IShieldVaultV2 public shieldVault;

    // ── Events ───────────────────────────────────────────────
    event BatchExecuted(uint256 count, uint256 totalAmount);
    event DaemonUpdated(address newDaemon);
    event ShieldVaultUpdated(address newVault);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ── Constructor ──────────────────────────────────────────
    constructor(address _shieldVault, address _daemon) {
        shieldVault = IShieldVaultV2(_shieldVault);
        daemon = _daemon;
        owner = msg.sender;
    }

    // ── Modifiers ────────────────────────────────────────────
    modifier onlyDaemon() {
        require(msg.sender == daemon, "Only daemon");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ── Batch Shielded Payout (N proofs → 1 TX) ─────────────

    /**
     * @notice Execute multiple ZK shielded payouts in a single atomic transaction.
     *         All proofs are verified individually by ShieldVaultV2.
     *         If any proof fails → entire batch reverts (atomic guarantee).
     *
     * @param proofs      Array of PLONK proofs (24 uint256 each)
     * @param pubSignals  Array of public signals ([commitment, nullifierHash, recipient] each)
     * @param amounts     Array of exact amounts per payout
     */
    function batchExecuteShieldedPayout(
        uint256[24][] calldata proofs,
        uint256[3][] calldata pubSignals,
        uint256[] calldata amounts
    ) external onlyDaemon {
        uint256 len = proofs.length;
        require(len > 0, "Empty batch");
        require(len == pubSignals.length && len == amounts.length, "Array length mismatch");
        require(len <= 20, "Batch too large");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < len; i++) {
            shieldVault.executeShieldedPayout(proofs[i], pubSignals[i], amounts[i]);
            totalAmount += amounts[i];
        }

        emit BatchExecuted(len, totalAmount);
    }

    // ── Single Shielded Payout (backward-compatible) ─────────

    /**
     * @notice Forward a single shielded payout to ShieldVaultV2.
     *         Used by Path B (full lifecycle) jobs.
     */
    function executeShieldedPayout(
        uint256[24] calldata proof,
        uint256[3] calldata pubSignals,
        uint256 exactAmount
    ) external onlyDaemon {
        shieldVault.executeShieldedPayout(proof, pubSignals, exactAmount);
    }

    // ── Public Payout (forward) ──────────────────────────────

    function executePublicPayout(address recipient, uint256 amount) external onlyDaemon {
        shieldVault.executePublicPayout(recipient, amount);
    }

    // ── Admin ────────────────────────────────────────────────

    function updateDaemon(address _newDaemon) external onlyOwner {
        daemon = _newDaemon;
        emit DaemonUpdated(_newDaemon);
    }

    function updateShieldVault(address _newVault) external onlyOwner {
        shieldVault = IShieldVaultV2(_newVault);
        emit ShieldVaultUpdated(_newVault);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "BatchShieldExecutor: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}
