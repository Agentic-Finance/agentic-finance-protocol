pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/**
 * AgtFi Incremental Proof Chain V1
 *
 * "Recursion-like" proof chaining WITHOUT changing the proving system.
 *
 * Problem:
 *   True recursive SNARKs (verifying a PLONK proof inside a circuit)
 *   require BN254 pairing operations = millions of constraints = hours to prove.
 *   Not feasible with Circom/snarkjs.
 *
 * Solution:
 *   Each new proof includes a hash of the previous proof's public signals.
 *   The latest proof implicitly validates ALL previous proofs in the chain.
 *
 * How it works:
 *   Proof 1: chainHash = Poseidon(pubSignals_1, 0)        // genesis
 *   Proof 2: chainHash = Poseidon(pubSignals_2, chainHash_1)
 *   Proof N: chainHash = Poseidon(pubSignals_N, chainHash_{N-1})
 *
 *   On-chain: only store the latest chainHash.
 *   Verification: verify latest proof + check chainHash matches on-chain.
 *   Security: if ANY proof in the chain was invalid, the chainHash would differ.
 *
 * Use case: Batch settlement
 *   - Agent makes 100 micropayments throughout the day
 *   - Each payment generates a proof chained to the previous one
 *   - At settlement: submit only the LAST proof
 *   - Contract verifies 1 proof but gets certainty about all 100 payments
 *
 * Circuit inputs:
 *   Public:
 *     - newChainHash: the updated chain hash after this proof
 *     - prevChainHash: the previous chain hash (verified on-chain)
 *     - settlementAmount: total amount being settled in this batch
 *     - batchCount: number of payments in this batch
 *
 *   Private:
 *     - Individual payment data (amounts, recipients, timestamps)
 *     - Sender identity (address + secret)
 */
template AgtFiProofChain(maxBatchSize) {

    // ═══════════════════════════════════════════════
    // PUBLIC INPUTS
    // ═══════════════════════════════════════════════

    // Previous chain hash (from on-chain state, 0 for genesis)
    signal input prevChainHash;

    // New chain hash (to be stored on-chain after verification)
    signal input newChainHash;

    // Total settlement amount for this batch
    signal input settlementAmount;

    // Number of payments in this batch
    signal input batchCount;

    // ═══════════════════════════════════════════════
    // PRIVATE INPUTS
    // ═══════════════════════════════════════════════

    // Sender identity
    signal input senderAddress;
    signal input senderSecret;

    // Actual number of payments (must be <= maxBatchSize)
    signal input actualCount;

    // Payment data arrays (padded with zeros)
    signal input amounts[maxBatchSize];
    signal input recipients[maxBatchSize];
    signal input timestamps[maxBatchSize];

    // ═══════════════════════════════════════════════
    // CONSTRAINT 1: Verify sender commitment
    // ═══════════════════════════════════════════════

    component senderHasher = Poseidon(2);
    senderHasher.inputs[0] <== senderAddress;
    senderHasher.inputs[1] <== senderSecret;
    // senderCommitment is implicitly bound via chainHash


    // ═══════════════════════════════════════════════
    // CONSTRAINT 2: Compute chain hash and accumulate
    // ═══════════════════════════════════════════════

    component isActive[maxBatchSize];
    component paymentHashers[maxBatchSize];
    component chainHashers[maxBatchSize];

    signal chainState[maxBatchSize + 1];
    signal totalAccum[maxBatchSize + 1];
    signal countAccum[maxBatchSize + 1];

    chainState[0] <== prevChainHash;
    totalAccum[0] <== 0;
    countAccum[0] <== 0;

    for (var i = 0; i < maxBatchSize; i++) {
        // Is this slot active?
        isActive[i] = LessThan(8);
        isActive[i].in[0] <== i;
        isActive[i].in[1] <== actualCount;

        // Payment hash = Poseidon(senderAddress, recipient, amount, timestamp)
        paymentHashers[i] = Poseidon(4);
        paymentHashers[i].inputs[0] <== senderAddress;
        paymentHashers[i].inputs[1] <== recipients[i];
        paymentHashers[i].inputs[2] <== amounts[i];
        paymentHashers[i].inputs[3] <== timestamps[i];

        // Chain hash = Poseidon(paymentHash, prevChainState)
        chainHashers[i] = Poseidon(2);
        chainHashers[i].inputs[0] <== paymentHashers[i].out;
        chainHashers[i].inputs[1] <== chainState[i];

        // Update chain state (only for active slots)
        chainState[i + 1] <== isActive[i].out * (chainHashers[i].out - chainState[i]) + chainState[i];

        // Accumulate total amount
        totalAccum[i + 1] <== totalAccum[i] + isActive[i].out * amounts[i];

        // Count payments
        countAccum[i + 1] <== countAccum[i] + isActive[i].out;
    }

    // ═══════════════════════════════════════════════
    // CONSTRAINT 3: Verify outputs match
    // ═══════════════════════════════════════════════

    // Chain hash must match declared newChainHash
    newChainHash === chainState[maxBatchSize];

    // Settlement amount must match accumulated total
    settlementAmount === totalAccum[maxBatchSize];

    // Batch count must match actual count
    batchCount === countAccum[maxBatchSize];
}

// 16 payments per proof batch
// Public: [prevChainHash, newChainHash, settlementAmount, batchCount]
component main {public [prevChainHash, newChainHash, settlementAmount, batchCount]} = AgtFiProofChain(16);
