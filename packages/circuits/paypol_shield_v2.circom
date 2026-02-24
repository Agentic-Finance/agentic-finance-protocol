pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

/**
 * PayPolShield V2 — Nullifier Pattern (Anti-Double-Spend)
 *
 * Upgrades from V1:
 *   - Adds nullifier to prevent replay attacks / double spending
 *   - Replaces hardcoded adminSecret with random (secret, nullifier) pair
 *   - Commitment now includes 4 inputs for stronger binding
 *
 * Public Inputs (visible on-chain):
 *   - commitment:    Hash binding all private data
 *   - nullifierHash: Unique spend tag — contract tracks used nullifiers
 *   - recipient:     Payment destination
 *
 * Private Inputs (hidden from public):
 *   - amount:    Payment amount (hidden from block explorer)
 *   - secret:    Random secret generated per payment
 *   - nullifier: Random nullifier generated per payment
 *
 * Constraints:
 *   1. commitment === Poseidon(secret, nullifier, amount, recipient)
 *   2. nullifierHash === Poseidon(nullifier, secret)
 *
 * Security Properties:
 *   - Without (secret, nullifier), no one can generate a valid proof
 *   - nullifierHash is unique per payment → contract rejects reuse
 *   - Amount is never revealed on-chain
 */
template PayPolShieldV2() {
    // === Public Inputs (exposed on-chain) ===
    signal input commitment;        // Binds all private data
    signal input nullifierHash;     // Prevents double-spend
    signal input recipient;         // Payment destination

    // === Private Inputs (kept secret by prover) ===
    signal input amount;            // Hidden payment amount
    signal input secret;            // Random secret (replaces hardcoded adminSecret)
    signal input nullifier;         // Random nullifier for spend tracking

    // ── Constraint 1: Verify commitment ──────────────────────
    // commitment = Poseidon(secret, nullifier, amount, recipient)
    component commitHasher = Poseidon(4);
    commitHasher.inputs[0] <== secret;
    commitHasher.inputs[1] <== nullifier;
    commitHasher.inputs[2] <== amount;
    commitHasher.inputs[3] <== recipient;
    commitment === commitHasher.out;

    // ── Constraint 2: Verify nullifier hash ──────────────────
    // nullifierHash = Poseidon(nullifier, secret)
    component nullHasher = Poseidon(2);
    nullHasher.inputs[0] <== nullifier;
    nullHasher.inputs[1] <== secret;
    nullifierHash === nullHasher.out;
}

// Public signals: [commitment, nullifierHash, recipient]
component main {public [commitment, nullifierHash, recipient]} = PayPolShieldV2();
