/**
 * Agentic Finance — Full Stack E2E Demo
 *
 * Demonstrates the complete trust infrastructure:
 *   Phase 1: ZK compliance + reputation proofs
 *   Phase 2: Agent DID + spend policy + KYA trust tier
 *
 * Usage:
 *   AGTFI_PRIVATE_KEY=0x... npx tsx examples/e2e-full-demo.ts
 */

import { ZKPrivacy, AgentGateway, AgentIdentity, TRUST_TIERS } from '../src/index';

const RPC = 'https://rpc.moderato.tempo.xyz';
const COMPLIANCE_REGISTRY = '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14';
const REPUTATION_REGISTRY = '0xF3296984cb8785Ab236322658c13051801E58875';

async function main() {
    const pk = process.env.AGTFI_PRIVATE_KEY;

    console.log('');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║       Agentic Finance — Full Stack Demo         ║');
    console.log('  ║   "The Economy Runs on Trust. We Built It."     ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');

    // ═══ PHASE 2: IDENTITY & TRUST ═══

    console.log('━━━ PHASE 2: Agent Identity & Trust ━━━\n');

    const identity = new AgentIdentity({ rpcUrl: RPC, privateKey: pk });

    // Step 1: Register Agent DID
    console.log('Step 1: Register Agent DID (W3C)');
    if (pk) {
        try {
            const agentAddr = '0x' + '1'.repeat(40); // demo agent
            const { tokenId, txHash } = await identity.registerDID(
                agentAddr,
                'did:agtfi:tempo:demo-payment-agent',
                1, // payment type
            );
            console.log(`  ✅ DID registered — Token #${tokenId}`);
            console.log(`  TX: ${txHash}\n`);
        } catch (e: any) {
            console.log(`  ⚠️  ${e.message.slice(0, 80)}\n`);
        }
    } else {
        console.log('  ⏭  Skipped (no private key)\n');
    }

    // Step 2: Set Spend Policy
    console.log('Step 2: Set Spend Policy');
    if (pk) {
        try {
            const txHash = await identity.setSpendPolicy(
                '0x' + '1'.repeat(40),
                {
                    maxPerTx: BigInt(10_000_000000),     // $10K per tx
                    maxPerDay: BigInt(50_000_000000),     // $50K per day
                    maxPerMonth: BigInt(200_000_000000),  // $200K per month
                    requireZKProof: true,
                },
            );
            console.log(`  ✅ Policy set — $10K/tx, $50K/day, $200K/month, ZK required`);
            console.log(`  TX: ${txHash}\n`);
        } catch (e: any) {
            console.log(`  ⚠️  ${e.message.slice(0, 80)}\n`);
        }
    } else {
        console.log('  ⏭  Skipped (no private key)\n');
    }

    // Step 3: Check Trust Tier (KYA)
    console.log('Step 3: Know Your Agent (KYA) Assessment');
    try {
        const tier = await identity.getTrustTier('0x' + '1'.repeat(40));
        const tierLabel = TRUST_TIERS[tier.tier as keyof typeof TRUST_TIERS] || 'Unknown';
        console.log(`  Trust Tier: ${tier.tier}/4 — "${tierLabel}"`);
        console.log(`  Score: ${tier.score}/500`);

        const assessment = await identity.getFullAssessment('0x' + '1'.repeat(40));
        console.log(`  Checkpoints:`);
        console.log(`    [${assessment.hasProvenance ? '✅' : '❌'}] Provenance (who deployed)`);
        console.log(`    [${assessment.hasBinding ? '✅' : '❌'}] User Binding (controller)`);
        console.log(`    [${assessment.hasScope ? '✅' : '❌'}] Permission Scope`);
        console.log(`    [${assessment.hasTelemetry ? '✅' : '❌'}] Behavior Telemetry`);
        console.log(`    [${assessment.hasRiskScore ? '✅' : '❌'}] Risk Score`);
        console.log('');
    } catch (e: any) {
        console.log(`  ⚠️  ${e.message.slice(0, 80)}\n`);
    }

    // Step 4: Check Spend Allowance
    console.log('Step 4: Spend Policy Check');
    try {
        const check = await identity.checkAllowance('0x' + '1'.repeat(40), BigInt(5000_000000));
        console.log(`  $5,000 payment: ${check.allowed ? '✅ Allowed' : '❌ Blocked — ' + check.reason}\n`);
    } catch (e: any) {
        console.log(`  ⚠️  ${e.message.slice(0, 80)}\n`);
    }

    // ═══ PHASE 1: ZK PROOFS ═══

    console.log('━━━ PHASE 1: ZK Compliance & Reputation ━━━\n');

    const zk = new ZKPrivacy({
        rpcUrl: RPC,
        complianceRegistry: COMPLIANCE_REGISTRY,
        reputationRegistry: REPUTATION_REGISTRY,
        privateKey: pk,
    });

    // Step 5: Compliance Proof
    console.log('Step 5: Generate ZK Compliance Proof');
    const compResult = await zk.proveCompliance({
        senderAddress: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
        amount: BigInt(5000_000000),
        cumulativeVolume: BigInt(8000_000000),
    }, false);

    if (compResult.success) {
        console.log(`  ✅ Proof ready in ${compResult.proofTimeMs}ms`);
        console.log(`  Commitment: ${compResult.commitment.slice(0, 25)}...`);
        console.log(`  Proves: NOT sanctioned, amount < $10K, volume < $100K`);
        console.log(`  Revealed: NOTHING (zero-knowledge)\n`);
    } else {
        console.log(`  ❌ ${compResult.error}\n`);
    }

    // Step 6: Reputation Proof
    console.log('Step 6: Generate ZK Reputation Proof');
    const repResult = await zk.proveReputation({
        agentAddress: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
        claims: Array.from({ length: 15 }, (_, i) => ({
            amount: BigInt((100 + i * 50) * 1_000000),
            timestamp: 1700000000 + i * 86400,
            status: 1 as const,
        })),
        minTxCount: 10,
        minVolume: BigInt(5000_000000),
    }, false);

    if (repResult.success) {
        console.log(`  ✅ Proof ready in ${repResult.proofTimeMs}ms`);
        console.log(`  Agent Commitment: ${repResult.agentCommitment.slice(0, 25)}...`);
        console.log(`  Proves: ≥10 txs, ≥$5K volume, 0 disputes`);
        console.log(`  Revealed: NOTHING (zero-knowledge)\n`);
    } else {
        console.log(`  ❌ ${repResult.error}\n`);
    }

    // Step 7: Query On-Chain Status
    console.log('Step 7: On-Chain Protocol Stats');
    try {
        const stats = await zk.getStats();
        console.log(`  Compliance: ${stats.compliance.totalCertificates} certificates`);
        console.log(`  Reputation: ${stats.reputation.totalAgents} agents, ${stats.reputation.totalProofs} proofs`);
        const total = await identity.totalAgents();
        console.log(`  DID Registry: ${total} registered agents\n`);
    } catch (e: any) {
        console.log(`  ⚠️  ${e.message.slice(0, 80)}\n`);
    }

    // ═══ PAYMENT ═══

    console.log('━━━ PAYMENT: Compliant Agent Payment ━━━\n');

    if (pk) {
        const gw = new AgentGateway({ privateKey: pk, rpcUrl: RPC });
        console.log(`Step 8: Make a payment via Gateway`);
        console.log(`  Wallet: ${gw.address}`);
        const balance = await gw.getBalance();
        console.log(`  Balance: ${balance} AlphaUSD`);

        if (parseFloat(balance) > 0.01) {
            const result = await gw.pay(
                '0x0000000000000000000000000000000000000001',
                '0.01',
                { privacy: 'public', memo: 'E2E demo payment' },
            );
            console.log(`  Result: ${result.success ? '✅' : '❌'} via ${result.rail}`);
            if (result.txHash) console.log(`  TX: ${result.txHash}`);
        } else {
            console.log(`  ⏭  Insufficient balance`);
        }
    } else {
        console.log('Step 8: Skipped (no private key)');
    }

    // ═══ SUMMARY ═══

    console.log('\n');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║               Trust Stack Summary               ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log('  ║  Layer 1: Agent DID (W3C)     → Identity        ║');
    console.log('  ║  Layer 2: Spend Policy        → Authorization   ║');
    console.log('  ║  Layer 3: KYA Assessment      → Trust Scoring   ║');
    console.log('  ║  Layer 4: ZK Compliance       → Privacy AML     ║');
    console.log('  ║  Layer 5: ZK Reputation       → Privacy Score   ║');
    console.log('  ║  Layer 6: TEE Attestation     → Hardware Trust  ║');
    console.log('  ║  Layer 7: Inference Registry   → Model Verify   ║');
    console.log('  ╠══════════════════════════════════════════════════╣');
    console.log('  ║  All private data stays local.                  ║');
    console.log('  ║  Only boolean pass/fail is on-chain.            ║');
    console.log('  ║  Zero-knowledge. Zero compromise.               ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');
}

main().catch(console.error);
