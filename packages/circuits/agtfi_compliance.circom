pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/smt/smtverifier.circom";

/**
 * AgtFi Compliance Proof V1 — "Private but Legal"
 *
 * Proves THREE things simultaneously without revealing private data:
 *
 *   1. OFAC Non-Membership: "My address is NOT on the sanctions list"
 *      Uses Sparse Merkle Tree non-inclusion proof (circomlib SMTVerifier)
 *
 *   2. Amount Range: "This transaction amount < threshold"
 *      Uses LessThan comparator — proves amount under AML limit
 *
 *   3. Cumulative Volume: "My 30-day total < $10,000"
 *      Uses LessThan on accumulated volume — prevents structuring
 *
 * Why this matters:
 *   - Tornado Cash was banned because it had NO compliance mechanism
 *   - This circuit lets agents transact privately AND prove compliance
 *   - Regulators can verify compliance WITHOUT seeing transaction details
 *   - No other protocol (x402, MPP, ACP) has this capability
 *
 * Architecture:
 *   - OFAC tree root is published on-chain daily by a trusted operator
 *   - Amount threshold is set by contract (e.g., $10,000 AML limit)
 *   - Agent generates proof locally → submits to ComplianceRegistry
 *   - Anyone can verify the proof on-chain
 *
 * SMT Non-Inclusion Proof (fnc=1):
 *   For a key K that is NOT in the tree, the prover shows:
 *     - The sibling path from root to the leaf position
 *     - An existing leaf (oldKey, oldValue) that shares the same path prefix
 *     - isOld0=1 if the slot is empty, or isOld0=0 if occupied by different key
 *   The circuit verifies the Merkle path is valid and K ≠ oldKey
 *
 * Security Properties:
 *   - Sender address never appears on-chain (hidden in commitment)
 *   - Transaction amount never appears on-chain
 *   - Cumulative volume never appears on-chain
 *   - Only the compliance "pass/fail" result is public
 *   - Proof is bound to a specific OFAC tree root (prevents stale proofs)
 */

// SMT depth: 20 levels supports 2^20 = ~1M entries (OFAC has ~1,500)
// Oversized for safety margin and future growth
template AgtFiCompliance(smtLevels) {

    // --------------------------------------------------------


    // PUBLIC INPUTS — visible on-chain, verified by contract


    // --------------------------------------------------------

    // OFAC tree root — published on-chain by trusted operator
    signal input sanctionsRoot;

    // Commitment binding sender to this proof
    // complianceCommitment = Poseidon(senderAddress, secret)
    signal input complianceCommitment;

    // AML threshold (e.g., 10000 * 10^6 for $10,000 in 6-decimal USDC)
    signal input amountThreshold;

    // Cumulative volume threshold (same scale)
    signal input volumeThreshold;

    // --------------------------------------------------------


    // PRIVATE INPUTS — known only to prover, never on-chain


    // --------------------------------------------------------

    // Sender's actual address (as field element)
    signal input senderAddress;

    // Random secret binding commitment (prevents brute-force of address)
    signal input secret;

    // Transaction amount (hidden)
    signal input amount;

    // 30-day cumulative volume (hidden)
    signal input cumulativeVolume;

    // SMT non-inclusion proof data
    signal input smtSiblings[smtLevels];
    signal input smtOldKey;
    signal input smtOldValue;
    signal input smtIsOld0;


    // --------------------------------------------------------
    // CONSTRAINT 1: Verify compliance commitment
    // Proves: "I know the sender address behind this commitment"
    // --------------------------------------------------------

    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== senderAddress;
    commitHasher.inputs[1] <== secret;
    complianceCommitment === commitHasher.out;


    // --------------------------------------------------------
    // CONSTRAINT 2: OFAC Non-Membership Proof
    // Proves: "senderAddress is NOT in the sanctions tree"
    // Uses SMTVerifier with fnc=1 (non-inclusion mode)
    // --------------------------------------------------------

    component smtVerifier = SMTVerifier(smtLevels);
    smtVerifier.enabled <== 1;
    smtVerifier.root <== sanctionsRoot;
    smtVerifier.key <== senderAddress;
    smtVerifier.value <== 0;        // For non-inclusion, value is unused
    smtVerifier.fnc <== 1;          // 1 = verify NON-inclusion
    smtVerifier.oldKey <== smtOldKey;
    smtVerifier.oldValue <== smtOldValue;
    smtVerifier.isOld0 <== smtIsOld0;
    for (var i = 0; i < smtLevels; i++) {
        smtVerifier.siblings[i] <== smtSiblings[i];
    }


    // --------------------------------------------------------
    // CONSTRAINT 3: Transaction Amount Range Proof
    // Proves: "amount < amountThreshold" (e.g., < $10,000)
    // Without revealing the actual amount
    // --------------------------------------------------------

    // 64-bit comparison — supports amounts up to ~1.8 * 10^19
    // (sufficient for any realistic payment amount)
    component amountCheck = LessThan(64);
    amountCheck.in[0] <== amount;
    amountCheck.in[1] <== amountThreshold;
    amountCheck.out === 1;


    // --------------------------------------------------------
    // CONSTRAINT 4: Cumulative Volume Range Proof
    // Proves: "30-day total < volumeThreshold" (AML structuring check)
    // Without revealing cumulative volume
    // --------------------------------------------------------

    component volumeCheck = LessThan(64);
    volumeCheck.in[0] <== cumulativeVolume;
    volumeCheck.in[1] <== volumeThreshold;
    volumeCheck.out === 1;

    // NOTE: cumulativeVolume is self-reported by the prover.
    // In production, this should be cross-referenced with an
    // on-chain accumulator that tracks Poseidon(address, period) → volume.
    // Phase 2 will add an accumulator-based approach.
}

// Instantiate with 20-level SMT (supports ~1M sanctioned addresses)
// Public signals: [sanctionsRoot, complianceCommitment, amountThreshold, volumeThreshold]
component main {public [sanctionsRoot, complianceCommitment, amountThreshold, volumeThreshold]} = AgtFiCompliance(20);
