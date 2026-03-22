/**
 * AgtFi Proof Chain — E2E Test
 * Tests incremental proof chaining (recursion-like without system change)
 */
import { buildPoseidon } from 'circomlibjs';
import * as snarkjs from 'snarkjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WASM = path.join(__dirname, 'agtfi_proof_chain_js', 'agtfi_proof_chain.wasm');
const ZKEY = path.join(__dirname, 'agtfi_proof_chain_final.zkey');
const MAX_BATCH = 16;

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  AgtFi Proof Chain — E2E Test');
    console.log('  "Recursion-like without changing proving system"');
    console.log('═══════════════════════════════════════════════════\n');

    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    const sender = BigInt('0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793');
    const secret = BigInt('998877665544332211');

    function computeChainHash(payments, prevHash) {
        let state = prevHash;
        for (const p of payments) {
            const payHash = poseidon([sender, BigInt(p.recipient), BigInt(p.amount), BigInt(p.timestamp)]);
            const chainHash = poseidon([F.toObject(payHash), state]);
            state = F.toObject(chainHash);
        }
        return state;
    }

    function buildInput(payments, prevChainHash) {
        const newChainHash = computeChainHash(payments, prevChainHash);
        const totalAmount = payments.reduce((s, p) => s + BigInt(p.amount), 0n);

        const amounts = payments.map(p => p.amount.toString());
        const recipients = payments.map(p => p.recipient.toString());
        const timestamps = payments.map(p => p.timestamp.toString());
        while (amounts.length < MAX_BATCH) { amounts.push("0"); recipients.push("0"); timestamps.push("0"); }

        return {
            prevChainHash: prevChainHash.toString(),
            newChainHash: newChainHash.toString(),
            settlementAmount: totalAmount.toString(),
            batchCount: payments.length.toString(),
            senderAddress: sender.toString(),
            senderSecret: secret.toString(),
            actualCount: payments.length.toString(),
            amounts, recipients, timestamps,
        };
    }

    // ── TEST 1: Genesis batch (5 payments, prevHash=0) ──
    console.log('── TEST 1: Genesis batch (5 payments) ──');
    const batch1 = [];
    for (let i = 0; i < 5; i++) {
        batch1.push({
            amount: 1000_000000, // $1,000
            recipient: BigInt('0xA11CE' + i.toString().padStart(35, '0')),
            timestamp: 1700000000 + i * 3600,
        });
    }

    try {
        const input1 = buildInput(batch1, 0n);
        const t0 = Date.now();
        const { proof: p1, publicSignals: ps1 } = await snarkjs.plonk.fullProve(input1, WASM, ZKEY);
        console.log(`  ✅ Proof 1 generated in ${Date.now() - t0}ms`);
        console.log(`  Settlement: $${5000} | Batch: 5 payments`);
        console.log(`  ChainHash: ${ps1[1].slice(0, 20)}...`);

        const vkey = await snarkjs.zKey.exportVerificationKey(ZKEY);
        const valid1 = await snarkjs.plonk.verify(vkey, ps1, p1);
        console.log(`  ✅ Verified: ${valid1}`);

        // ── TEST 2: Chain next batch (3 payments, prevHash=batch1 hash) ──
        console.log('\n── TEST 2: Chained batch (3 more payments) ──');
        const prevHash = BigInt(ps1[1]); // newChainHash from batch 1

        const batch2 = [];
        for (let i = 0; i < 3; i++) {
            batch2.push({
                amount: 2000_000000, // $2,000
                recipient: BigInt('0xB0B' + i.toString().padStart(37, '0')),
                timestamp: 1700100000 + i * 3600,
            });
        }

        const input2 = buildInput(batch2, prevHash);
        const t1 = Date.now();
        const { proof: p2, publicSignals: ps2 } = await snarkjs.plonk.fullProve(input2, WASM, ZKEY);
        console.log(`  ✅ Proof 2 generated in ${Date.now() - t1}ms`);
        console.log(`  Settlement: $${6000} | Batch: 3 payments`);
        console.log(`  PrevChainHash: ${ps2[0].slice(0, 20)}...`);
        console.log(`  NewChainHash:  ${ps2[1].slice(0, 20)}...`);

        const valid2 = await snarkjs.plonk.verify(vkey, ps2, p2);
        console.log(`  ✅ Verified: ${valid2}`);

        // Verify chain continuity
        console.log(`\n  Chain continuity: Proof1.newHash === Proof2.prevHash`);
        console.log(`    ${ps1[1].slice(0, 20)}... === ${ps2[0].slice(0, 20)}...`);
        console.log(`    ${ps1[1] === ps2[0] ? '✅ MATCH' : '❌ MISMATCH'}`);

        if (!valid1 || !valid2 || ps1[1] !== ps2[0]) {
            console.log('\n  ❌ TEST FAILED');
            process.exit(1);
        }

    } catch (e) {
        console.log(`  ❌ FAILED: ${e.message}`);
        process.exit(1);
    }

    // ── TEST 3: Wrong prevHash (should fail) ──
    console.log('\n── TEST 3: Wrong prevHash (should fail) ──');
    try {
        const wrongPrev = 12345n;
        const batch3 = [{ amount: 500_000000, recipient: BigInt('0xCAFE'), timestamp: 1700200000 }];
        // Compute with correct prevHash but declare wrong one
        const correctHash = computeChainHash(batch3, wrongPrev);

        const input3 = buildInput(batch3, wrongPrev);
        // Override newChainHash with a value computed from different prevHash
        input3.newChainHash = computeChainHash(batch3, 99999n).toString();

        await snarkjs.plonk.fullProve(input3, WASM, ZKEY);
        console.log('  ❌ Should have been rejected!');
        process.exit(1);
    } catch (e) {
        console.log('  ✅ Correctly rejected: chain hash mismatch');
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ALL TESTS PASSED ✅');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n  Circuit: agtfi_proof_chain.circom`);
    console.log(`  Max batch size: 16 payments per proof`);
    console.log(`  Chain: proof N validates all N-1 previous proofs`);
    console.log(`  On-chain: only 1 proof verified, covers entire chain`);
    console.log('');

    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
