/**
 * End-to-End ZK Compliance Demo
 *
 * Demonstrates the full flow:
 *   1. Compute a compliance commitment (Poseidon hash)
 *   2. Generate ZK compliance proof inputs
 *   3. Query on-chain compliance status
 *   4. Make a payment with compliance attestation
 *
 * Usage:
 *   AGTFI_PRIVATE_KEY=0x... npx tsx examples/e2e-compliance-demo.ts
 *
 * For full proof generation (with circuit files):
 *   AGTFI_PRIVATE_KEY=0x... \
 *   COMPLIANCE_WASM=../../circuits/agtfi_compliance_js/agtfi_compliance.wasm \
 *   COMPLIANCE_ZKEY=../../circuits/agtfi_compliance_final.zkey \
 *   npx tsx examples/e2e-compliance-demo.ts
 */

import { ZKPrivacy, AgentGateway } from '../src/index';

const RPC_URL = 'https://rpc.moderato.tempo.xyz';
const COMPLIANCE_REGISTRY = '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14';
const REPUTATION_REGISTRY = '0xF3296984cb8785Ab236322658c13051801E58875';

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Agentic Finance — E2E ZK Compliance Demo');
    console.log('═══════════════════════════════════════════════════════\n');

    const privateKey = process.env.AGTFI_PRIVATE_KEY;
    if (!privateKey) {
        console.log('⚠️  No AGTFI_PRIVATE_KEY set — running in read-only mode\n');
    }

    // ─── Step 1: Initialize ZKPrivacy ───────────────────────
    console.log('Step 1: Initialize ZKPrivacy module');
    const zk = new ZKPrivacy({
        rpcUrl: RPC_URL,
        complianceRegistry: COMPLIANCE_REGISTRY,
        reputationRegistry: REPUTATION_REGISTRY,
        privateKey,
        complianceWasmPath: process.env.COMPLIANCE_WASM,
        complianceZkeyPath: process.env.COMPLIANCE_ZKEY,
        reputationWasmPath: process.env.REPUTATION_WASM,
        reputationZkeyPath: process.env.REPUTATION_ZKEY,
    });
    console.log(`  ✅ Connected to Tempo Moderato (Chain ${zk.getChainId()})`);
    console.log(`  ✅ ComplianceRegistry: ${COMPLIANCE_REGISTRY}`);
    console.log(`  ✅ ReputationRegistry: ${REPUTATION_REGISTRY}\n`);

    // ─── Step 2: Compute Commitment ─────────────────────────
    console.log('Step 2: Compute compliance commitment');
    const agentAddress = '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793';
    const commitment = await zk.computeCommitment(agentAddress);
    console.log(`  Agent:      ${agentAddress}`);
    console.log(`  Commitment: ${commitment.slice(0, 30)}...`);
    console.log(`  ℹ️  Commitment = Poseidon(address, secret)`);
    console.log(`  ℹ️  Secret never leaves this device\n`);

    // ─── Step 3: Get On-Chain Parameters ────────────────────
    console.log('Step 3: Fetch on-chain compliance parameters');
    try {
        const params = await zk.getComplianceParams();
        console.log(`  Sanctions Root:    ${params.sanctionsRoot.slice(0, 20)}...`);
        console.log(`  Amount Threshold:  $${(Number(params.amountThreshold) / 1e6).toLocaleString()}`);
        console.log(`  Volume Threshold:  $${(Number(params.volumeThreshold) / 1e6).toLocaleString()}\n`);
    } catch (e: any) {
        console.log(`  ⚠️  Could not fetch params: ${e.message}\n`);
    }

    // ─── Step 4: Generate Compliance Proof ──────────────────
    console.log('Step 4: Generate ZK compliance proof');
    const complianceResult = await zk.proveCompliance({
        senderAddress: agentAddress,
        amount: BigInt(5000_000000),       // $5,000
        cumulativeVolume: BigInt(8000_000000), // $8,000 cumulative
    }, false); // false = don't submit on-chain (demo mode)

    if (complianceResult.success) {
        console.log(`  ✅ Proof generated in ${complianceResult.proofTimeMs}ms`);
        console.log(`  Commitment:     ${complianceResult.commitment.slice(0, 30)}...`);
        console.log(`  Public Signals: ${complianceResult.publicSignals.length} elements`);
        if (complianceResult.error) {
            console.log(`  ℹ️  ${complianceResult.error}`);
        }
        if (complianceResult.txHash) {
            console.log(`  📝 On-chain TX: ${complianceResult.txHash}`);
        }
    } else {
        console.log(`  ❌ Proof failed: ${complianceResult.error}`);
    }
    console.log();

    // ─── Step 5: Generate Reputation Proof ──────────────────
    console.log('Step 5: Generate ZK reputation proof');
    const repResult = await zk.proveReputation({
        agentAddress,
        claims: [
            { amount: BigInt(100_000000), timestamp: 1700000000, status: 1 },
            { amount: BigInt(250_000000), timestamp: 1700010000, status: 1 },
            { amount: BigInt(500_000000), timestamp: 1700020000, status: 1 },
            { amount: BigInt(150_000000), timestamp: 1700030000, status: 1 },
            { amount: BigInt(300_000000), timestamp: 1700040000, status: 1 },
        ],
        minTxCount: 5,
        minVolume: BigInt(1000_000000), // $1,000
    }, false);

    if (repResult.success) {
        console.log(`  ✅ Reputation proof generated in ${repResult.proofTimeMs}ms`);
        console.log(`  Agent Commitment:  ${repResult.agentCommitment.slice(0, 30)}...`);
        console.log(`  Accumulator Hash:  ${repResult.accumulatorHash.slice(0, 30)}...`);
        console.log(`  Claims: 5 transactions, $1,300 volume, 0 disputes`);
        if (repResult.error) {
            console.log(`  ℹ️  ${repResult.error}`);
        }
    } else {
        console.log(`  ❌ Reputation proof failed: ${repResult.error}`);
    }
    console.log();

    // ─── Step 6: Query On-Chain Status ──────────────────────
    console.log('Step 6: Query on-chain compliance status');
    try {
        const isCompliant = await zk.isCompliant(commitment);
        console.log(`  Commitment compliant: ${isCompliant}`);
    } catch (e: any) {
        console.log(`  ⚠️  Query failed: ${e.message}`);
    }
    console.log();

    // ─── Step 7: Registry Stats ─────────────────────────────
    console.log('Step 7: Protocol statistics');
    try {
        const stats = await zk.getStats();
        console.log(`  Compliance: ${stats.compliance.totalCertificates} certificates, ${stats.compliance.totalVerified} verified`);
        console.log(`  Reputation: ${stats.reputation.totalAgents} agents, ${stats.reputation.totalProofs} proofs`);
    } catch (e: any) {
        console.log(`  ⚠️  Stats query failed: ${e.message}`);
    }
    console.log();

    // ─── Step 8: Payment with Compliance ────────────────────
    if (privateKey) {
        console.log('Step 8: Make a compliant payment via Gateway');
        const gw = new AgentGateway({ privateKey, rpcUrl: RPC_URL });
        console.log(`  Wallet: ${gw.address}`);

        const balance = await gw.getBalance();
        console.log(`  Balance: ${balance} AlphaUSD`);

        if (parseFloat(balance) > 0) {
            // Make a small payment
            const payResult = await gw.pay(
                '0x0000000000000000000000000000000000000001', // burn address
                '0.01',
                { privacy: 'public', memo: 'E2E compliance demo' }
            );
            console.log(`  Payment: ${payResult.success ? '✅' : '❌'} via ${payResult.rail}`);
            if (payResult.txHash) console.log(`  TX: ${payResult.txHash}`);
        } else {
            console.log(`  ℹ️  No balance — skipping payment`);
        }
    } else {
        console.log('Step 8: Skipped (no private key)\n');
    }

    // ─── Summary ────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Demo Complete');
    console.log('═══════════════════════════════════════════════════════');
    console.log();
    console.log('  What was demonstrated:');
    console.log('  1. Poseidon commitment computation (address → pseudonym)');
    console.log('  2. ZK compliance proof generation (OFAC + AML)');
    console.log('  3. ZK reputation proof generation (tx history)');
    console.log('  4. On-chain parameter queries');
    console.log('  5. Protocol statistics');
    console.log();
    console.log('  Privacy guarantees:');
    console.log('  • Agent address never appears on-chain');
    console.log('  • Transaction amounts never revealed');
    console.log('  • Only boolean compliance status is public');
    console.log('  • Reputation: only "meets threshold" disclosed');
    console.log();
}

main().catch(console.error);
