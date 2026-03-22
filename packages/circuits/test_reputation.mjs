/**
 * AgtFi ZK Agent Reputation — E2E Test Suite
 *
 * Tests the world's first ZK reputation system for AI agent payments.
 */
import { buildPoseidon } from 'circomlibjs';
import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WASM_PATH = path.join(__dirname, 'agtfi_reputation_js', 'agtfi_reputation.wasm');
const ZKEY_PATH = path.join(__dirname, 'agtfi_reputation_final.zkey');
const MAX_CLAIMS = 32;

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  AgtFi ZK Agent Reputation — E2E Test Suite');
    console.log('  "Anonymous Credit Score for AI Agents"');
    console.log('═══════════════════════════════════════════════════\n');

    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    // ── Agent identity ──
    const agentAddress = BigInt('0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793');
    const agentSecret = BigInt('1122334455667788990011223344556677');
    const agentCommitHash = poseidon([agentAddress, agentSecret]);
    const agentCommitment = F.toObject(agentCommitHash).toString();

    console.log(`[Setup] Agent: 0x33F7...0793`);
    console.log(`[Setup] Commitment: ${agentCommitment.slice(0, 20)}...`);

    /**
     * Helper: Build circuit inputs from claim data
     */
    function buildInputs(claims, minTxCount, minVolume) {
        // Compute hash chain accumulator
        let chainState = BigInt(0);
        for (let i = 0; i < claims.length; i++) {
            const claimHash = poseidon([
                agentAddress,
                BigInt(claims[i].amount),
                BigInt(claims[i].timestamp),
                BigInt(claims[i].status),
            ]);
            const chainHash = poseidon([F.toObject(claimHash), chainState]);
            chainState = F.toObject(chainHash);
        }

        // Pad arrays to MAX_CLAIMS
        const amounts = claims.map(c => c.amount.toString());
        const timestamps = claims.map(c => c.timestamp.toString());
        const statuses = claims.map(c => c.status.toString());

        while (amounts.length < MAX_CLAIMS) {
            amounts.push("0");
            timestamps.push("0");
            statuses.push("0");
        }

        return {
            agentCommitment,
            accumulatorHash: chainState.toString(),
            minTxCount: minTxCount.toString(),
            minVolume: minVolume.toString(),
            agentAddress: agentAddress.toString(),
            agentSecret: agentSecret.toString(),
            actualClaimCount: claims.length.toString(),
            claimAmounts: amounts,
            claimTimestamps: timestamps,
            claimStatuses: statuses,
        };
    }


    // ══════════════════════════════════════════════════════════
    // TEST 1: Valid reputation — 10 successful transactions
    // ══════════════════════════════════════════════════════════
    console.log('\n── TEST 1: Valid Reputation (10 txs, $50K volume, 0 disputes) ──');

    const claims10 = [];
    for (let i = 0; i < 10; i++) {
        claims10.push({
            amount: 5000_000000, // $5,000 each (6 decimals)
            timestamp: 1700000000 + i * 86400, // One per day
            status: 1, // Success
        });
    }

    try {
        const input = buildInputs(claims10, 5, 25000_000000); // min 5 txs, min $25K
        const t0 = Date.now();
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(input, WASM_PATH, ZKEY_PATH);
        const proveTime = Date.now() - t0;

        console.log(`  ✅ Proof generated in ${proveTime}ms`);

        const vkey = await snarkjs.zKey.exportVerificationKey(ZKEY_PATH);
        const valid = await snarkjs.plonk.verify(vkey, publicSignals, proof);
        console.log(`  ✅ Proof verified: ${valid}`);

        if (!valid) { console.log('  ❌ VERIFICATION FAILED'); process.exit(1); }
    } catch (e) {
        console.log(`  ❌ TEST 1 FAILED: ${e.message}`);
        process.exit(1);
    }


    // ══════════════════════════════════════════════════════════
    // TEST 2: Insufficient reputation — not enough txs
    // ══════════════════════════════════════════════════════════
    console.log('\n── TEST 2: Insufficient txs (3 txs but need 5) ──');

    const claims3 = claims10.slice(0, 3);

    try {
        const input = buildInputs(claims3, 5, 1000_000000); // need 5, have 3
        await snarkjs.plonk.fullProve(input, WASM_PATH, ZKEY_PATH);
        console.log(`  ❌ TEST 2 FAILED — should have been rejected!`);
        process.exit(1);
    } catch (e) {
        console.log(`  ✅ Correctly rejected: insufficient transaction count`);
    }


    // ══════════════════════════════════════════════════════════
    // TEST 3: Insufficient volume
    // ══════════════════════════════════════════════════════════
    console.log('\n── TEST 3: Insufficient volume ($15K but need $25K) ──');

    const claimsLowVol = [];
    for (let i = 0; i < 5; i++) {
        claimsLowVol.push({
            amount: 3000_000000, // $3K each = $15K total
            timestamp: 1700000000 + i * 86400,
            status: 1,
        });
    }

    try {
        const input = buildInputs(claimsLowVol, 3, 25000_000000); // need $25K, have $15K
        await snarkjs.plonk.fullProve(input, WASM_PATH, ZKEY_PATH);
        console.log(`  ❌ TEST 3 FAILED — should have been rejected!`);
        process.exit(1);
    } catch (e) {
        console.log(`  ✅ Correctly rejected: insufficient volume`);
    }


    // ══════════════════════════════════════════════════════════
    // TEST 4: Has disputes — should be rejected
    // ══════════════════════════════════════════════════════════
    console.log('\n── TEST 4: Agent has 1 dispute (should fail) ──');

    const claimsWithDispute = [];
    for (let i = 0; i < 10; i++) {
        claimsWithDispute.push({
            amount: 5000_000000,
            timestamp: 1700000000 + i * 86400,
            status: i === 5 ? 0 : 1, // Transaction #5 is a dispute
        });
    }

    try {
        const input = buildInputs(claimsWithDispute, 5, 25000_000000);
        await snarkjs.plonk.fullProve(input, WASM_PATH, ZKEY_PATH);
        console.log(`  ❌ TEST 4 FAILED — dispute should have been rejected!`);
        process.exit(1);
    } catch (e) {
        console.log(`  ✅ Correctly rejected: agent has disputes`);
    }


    // ══════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ALL TESTS PASSED ✅');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n  Circuit: agtfi_reputation.circom`);
    console.log(`  Constraints: 41,265`);
    console.log(`  Max claims per proof: 32`);
    console.log(`  Proof System: PLONK`);
    console.log(`  Public Signals: 4 (agentCommitment, accumulatorHash, minTxCount, minVolume)`);
    console.log(`  Private Inputs: 99 (address, secret, count, 32x amounts, 32x timestamps, 32x statuses)`);
    console.log('');

    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
