pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

/**
 * AgtFi ZK Agent Reputation V1 — "Anonymous Credit Score for AI Agents"
 *
 * WORLD'S FIRST ZK reputation system for machine-to-machine payments.
 *
 * Problem:
 *   When AI agents pay each other, merchants need to know: "Can I trust this agent?"
 *   But revealing transaction history destroys privacy.
 *
 * Solution:
 *   Agent proves aggregate stats without revealing individual transactions:
 *     - "I have completed N transactions" (without revealing which ones)
 *     - "My total volume exceeds $X" (without revealing exact amount)
 *     - "I have zero disputes" (without revealing any transaction details)
 *
 * Architecture:
 *   1. Each successful payment creates a "claim" hash:
 *      claim = Poseidon(agentId, amount, timestamp, status)
 *
 *   2. Claims are accumulated into a Poseidon hash chain:
 *      accumulator[0] = Poseidon(claim[0], 0)
 *      accumulator[i] = Poseidon(claim[i], accumulator[i-1])
 *      finalAccumulator = accumulator[N-1]
 *
 *   3. Agent proves properties about the accumulated data:
 *      - txCount >= minTxCount
 *      - totalVolume >= minVolume
 *      - disputeCount == 0
 *      - The accumulator matches the on-chain registered value
 *
 *   4. On-chain registry stores: agentCommitment → accumulator hash
 *      Merchants query: "Is this agent's reputation score sufficient?"
 *
 * Why hash chain (not Merkle tree)?
 *   - Hash chain preserves ORDER (earlier txs can't be reordered)
 *   - Simpler circuit — O(N) constraints instead of O(N * log N) for Merkle
 *   - Sufficient for reputation where we only care about aggregate stats
 *   - Future: upgrade to Merkle accumulator for selective disclosure
 *
 * Privacy Properties:
 *   - Individual transactions are never revealed
 *   - Exact volume is hidden (only proves "above threshold")
 *   - Agent identity is hidden behind commitment
 *   - Network effect: more agents = more valuable reputation data
 *
 * Circuit Parameters:
 *   maxClaims: Maximum number of claims provable in one proof
 *   This limits how many transactions can be aggregated per proof.
 *   Typical: 32 claims per proof (can chain multiple proofs for more)
 */
template AgtFiReputation(maxClaims) {

    // ═══════════════════════════════════════════════════════
    // PUBLIC INPUTS
    // ═══════════════════════════════════════════════════════

    // Agent's identity commitment = Poseidon(agentAddress, agentSecret)
    signal input agentCommitment;

    // Final accumulator hash (registered on-chain)
    signal input accumulatorHash;

    // Minimum requirements to satisfy
    signal input minTxCount;      // Minimum completed transactions
    signal input minVolume;       // Minimum total volume (6 decimals)

    // ═══════════════════════════════════════════════════════
    // PRIVATE INPUTS
    // ═══════════════════════════════════════════════════════

    // Agent identity
    signal input agentAddress;
    signal input agentSecret;

    // Number of actual claims (must be <= maxClaims)
    signal input actualClaimCount;

    // Claim data arrays (padded with zeros beyond actualClaimCount)
    signal input claimAmounts[maxClaims];     // Amount per transaction
    signal input claimTimestamps[maxClaims];  // Timestamp per transaction
    signal input claimStatuses[maxClaims];    // 1=success, 0=dispute

    // ═══════════════════════════════════════════════════════
    // CONSTRAINT 1: Verify agent identity commitment
    // ═══════════════════════════════════════════════════════

    component agentHasher = Poseidon(2);
    agentHasher.inputs[0] <== agentAddress;
    agentHasher.inputs[1] <== agentSecret;
    agentCommitment === agentHasher.out;

    // ═══════════════════════════════════════════════════════
    // CONSTRAINT 2: Build hash chain accumulator & compute stats
    // ═══════════════════════════════════════════════════════

    // Compute each claim hash and chain them
    component claimHashers[maxClaims];
    component chainHashers[maxClaims];

    // Activity flags: is this slot active (i < actualClaimCount)?
    component isActive[maxClaims];

    // Accumulate stats
    signal volumeAccum[maxClaims + 1];
    signal txCountAccum[maxClaims + 1];
    signal disputeAccum[maxClaims + 1];
    signal isDispute[maxClaims];

    volumeAccum[0] <== 0;
    txCountAccum[0] <== 0;
    disputeAccum[0] <== 0;

    signal chainState[maxClaims + 1];
    chainState[0] <== 0;

    for (var i = 0; i < maxClaims; i++) {
        // Check if this slot is active
        isActive[i] = LessThan(8); // 8 bits — supports up to 255 claims
        isActive[i].in[0] <== i;
        isActive[i].in[1] <== actualClaimCount;

        // Compute claim hash = Poseidon(agentAddress, amount, timestamp, status)
        claimHashers[i] = Poseidon(4);
        claimHashers[i].inputs[0] <== agentAddress;
        claimHashers[i].inputs[1] <== claimAmounts[i];
        claimHashers[i].inputs[2] <== claimTimestamps[i];
        claimHashers[i].inputs[3] <== claimStatuses[i];

        // Chain hash = Poseidon(claimHash, previousChainState)
        chainHashers[i] = Poseidon(2);
        chainHashers[i].inputs[0] <== claimHashers[i].out;
        chainHashers[i].inputs[1] <== chainState[i];

        // If active: use new chain hash; else: keep previous state
        chainState[i + 1] <== isActive[i].out * (chainHashers[i].out - chainState[i]) + chainState[i];

        // Accumulate volume (only for active slots)
        volumeAccum[i + 1] <== volumeAccum[i] + isActive[i].out * claimAmounts[i];

        // Count transactions (only for active successful slots)
        txCountAccum[i + 1] <== txCountAccum[i] + isActive[i].out * claimStatuses[i];

        // Count disputes (active slot with status=0 means dispute)
        isDispute[i] <== isActive[i].out * (1 - claimStatuses[i]);
        disputeAccum[i + 1] <== disputeAccum[i] + isDispute[i];
    }

    // ═══════════════════════════════════════════════════════
    // CONSTRAINT 3: Verify accumulator matches on-chain value
    // ═══════════════════════════════════════════════════════

    accumulatorHash === chainState[maxClaims];

    // ═══════════════════════════════════════════════════════
    // CONSTRAINT 4: Verify reputation meets minimum requirements
    // ═══════════════════════════════════════════════════════

    // txCount >= minTxCount
    component txCheck = GreaterEqThan(32);
    txCheck.in[0] <== txCountAccum[maxClaims];
    txCheck.in[1] <== minTxCount;
    txCheck.out === 1;

    // totalVolume >= minVolume
    component volCheck = GreaterEqThan(64);
    volCheck.in[0] <== volumeAccum[maxClaims];
    volCheck.in[1] <== minVolume;
    volCheck.out === 1;

    // disputeCount must be 0
    component noDisputes = IsZero();
    noDisputes.in <== disputeAccum[maxClaims];
    noDisputes.out === 1;
}

// Instantiate with 32 max claims per proof
// Public signals: [agentCommitment, accumulatorHash, minTxCount, minVolume]
component main {public [agentCommitment, accumulatorHash, minTxCount, minVolume]} = AgtFiReputation(32);
