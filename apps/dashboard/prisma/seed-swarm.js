/**
 * Seed Script — Agent Swarm Demo Data
 *
 * Creates realistic demo data for all 5 swarm features:
 * - 3 SwarmSessions with multiple agents
 * - StreamJobs + Milestones per agent
 * - 50+ A2ATransfers
 * - 15 IntelSubmissions
 * - 200+ AuditEvents
 * - Escrow states
 *
 * Run: docker exec paypol-dashboard node prisma/seed-swarm.js
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────

function randomWallet() {
    return '0x' + crypto.randomBytes(20).toString('hex');
}

function randomHash() {
    return '0x' + crypto.randomBytes(32).toString('hex');
}

function hoursAgo(h) {
    return new Date(Date.now() - h * 60 * 60 * 1000);
}

function minutesAgo(m) {
    return new Date(Date.now() - m * 60 * 1000);
}

function randomBetween(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ── Agent Definitions ──────────────────────────────────────

const agents = [
    { name: 'ContractGuard-AI', wallet: randomWallet(), role: 'coordinator' },
    { name: 'SentinelScan-AI', wallet: randomWallet(), role: 'worker' },
    { name: 'GasOptimizer-AI', wallet: randomWallet(), role: 'worker' },
    { name: 'TokenAnalyzer-AI', wallet: randomWallet(), role: 'worker' },
    { name: 'AuditReview-AI', wallet: randomWallet(), role: 'reviewer' },
    { name: 'DataForge-AI', wallet: randomWallet(), role: 'worker' },
    { name: 'ProofVerifier-AI', wallet: randomWallet(), role: 'reviewer' },
    { name: 'EscrowManager-AI', wallet: randomWallet(), role: 'coordinator' },
    { name: 'IntelScout-AI', wallet: randomWallet(), role: 'worker' },
    { name: 'SwarmOrchestrator-AI', wallet: randomWallet(), role: 'coordinator' },
];

const clientWallet = '0x33f7e5da060a7fee31ab4c7a5b27f4cc3b020793'; // admin wallet

// ── Main Seed Function ─────────────────────────────────────

async function seed() {
    console.log('🐝 Seeding Agent Swarm demo data...\n');

    // ====================================================
    // SWARM 1: DeFi Security Audit (ACTIVE, 3 agents)
    // ====================================================
    console.log('📦 Creating Swarm 1: DeFi Security Audit...');

    const swarm1 = await prisma.swarmSession.create({
        data: {
            name: 'DeFi Security Audit Sprint',
            clientWallet,
            totalBudget: 15000,
            totalReleased: 4500,
            agentCount: 3,
            status: 'ACTIVE',
            escrowTxHash: randomHash(),
            onChainJobId: 42,
            totalLocked: 15000,
            escrowStatus: 'DISTRIBUTING',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            createdAt: hoursAgo(72),
        },
    });

    // Agent 1: ContractGuard - coordinator
    const stream1a = await prisma.streamJob.create({
        data: {
            clientWallet,
            agentWallet: agents[0].wallet,
            agentName: agents[0].name,
            totalBudget: 6000,
            releasedAmount: 3000,
            status: 'ACTIVE',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            createdAt: hoursAgo(72),
            milestones: {
                create: [
                    { index: 0, amount: 1500, deliverable: 'Phase 1: Reentrancy Analysis', status: 'APPROVED', submittedAt: hoursAgo(48), reviewedAt: hoursAgo(46), approveTxHash: randomHash() },
                    { index: 1, amount: 1500, deliverable: 'Phase 2: Access Control Audit', status: 'APPROVED', submittedAt: hoursAgo(24), reviewedAt: hoursAgo(22), approveTxHash: randomHash() },
                    { index: 2, amount: 1500, deliverable: 'Phase 3: Flash Loan Vectors', status: 'SUBMITTED', submittedAt: hoursAgo(4) },
                    { index: 3, amount: 1500, deliverable: 'Phase 4: Final Report', status: 'PENDING' },
                ],
            },
        },
    });
    await prisma.swarmStream.create({
        data: { swarmId: swarm1.id, streamJobId: stream1a.id, role: 'coordinator', allocatedBudget: 6000, releasedAmount: 3000 },
    });

    // Agent 2: SentinelScan - worker
    const stream1b = await prisma.streamJob.create({
        data: {
            clientWallet,
            agentWallet: agents[1].wallet,
            agentName: agents[1].name,
            totalBudget: 5000,
            releasedAmount: 1500,
            status: 'ACTIVE',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            createdAt: hoursAgo(72),
            milestones: {
                create: [
                    { index: 0, amount: 2500, deliverable: 'Static Analysis Scan', status: 'APPROVED', submittedAt: hoursAgo(60), reviewedAt: hoursAgo(58), approveTxHash: randomHash() },
                    { index: 1, amount: 2500, deliverable: 'Dynamic Fuzzing Report', status: 'SUBMITTED', submittedAt: hoursAgo(8) },
                ],
            },
        },
    });
    await prisma.swarmStream.create({
        data: { swarmId: swarm1.id, streamJobId: stream1b.id, role: 'worker', allocatedBudget: 5000, releasedAmount: 1500 },
    });

    // Agent 3: GasOptimizer - worker
    const stream1c = await prisma.streamJob.create({
        data: {
            clientWallet,
            agentWallet: agents[2].wallet,
            agentName: agents[2].name,
            totalBudget: 4000,
            releasedAmount: 0,
            status: 'ACTIVE',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            createdAt: hoursAgo(72),
            milestones: {
                create: [
                    { index: 0, amount: 2000, deliverable: 'Gas Profiling Report', status: 'PENDING' },
                    { index: 1, amount: 2000, deliverable: 'Optimization Implementation', status: 'PENDING' },
                ],
            },
        },
    });
    await prisma.swarmStream.create({
        data: { swarmId: swarm1.id, streamJobId: stream1c.id, role: 'worker', allocatedBudget: 4000, releasedAmount: 0 },
    });

    // ====================================================
    // SWARM 2: Token Launch Analytics (ACTIVE, 4 agents)
    // ====================================================
    console.log('📦 Creating Swarm 2: Token Launch Analytics...');

    const swarm2 = await prisma.swarmSession.create({
        data: {
            name: 'Token Launch Analytics Pipeline',
            clientWallet,
            totalBudget: 22000,
            totalReleased: 8200,
            agentCount: 4,
            status: 'ACTIVE',
            escrowTxHash: randomHash(),
            onChainJobId: 43,
            totalLocked: 22000,
            escrowStatus: 'LOCKED',
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            createdAt: hoursAgo(120),
        },
    });

    const s2agents = [agents[3], agents[5], agents[6], agents[8]];
    const s2budgets = [7000, 6000, 5000, 4000];
    const s2released = [4200, 2000, 2000, 0];
    const s2milestones = [
        [
            { amount: 2100, deliverable: 'Tokenomics Analysis', status: 'APPROVED', submitted: hoursAgo(96), reviewed: hoursAgo(94) },
            { amount: 2100, deliverable: 'Market Cap Projections', status: 'APPROVED', submitted: hoursAgo(72), reviewed: hoursAgo(70) },
            { amount: 2800, deliverable: 'Launch Strategy Report', status: 'SUBMITTED', submitted: hoursAgo(12) },
        ],
        [
            { amount: 2000, deliverable: 'Data Pipeline Setup', status: 'APPROVED', submitted: hoursAgo(108), reviewed: hoursAgo(106) },
            { amount: 2000, deliverable: 'Real-Time Dashboard', status: 'SUBMITTED', submitted: hoursAgo(6) },
            { amount: 2000, deliverable: 'Alert System', status: 'PENDING' },
        ],
        [
            { amount: 2500, deliverable: 'ZK Proof Integration', status: 'APPROVED', submitted: hoursAgo(84), reviewed: hoursAgo(82) },
            { amount: 2500, deliverable: 'Verification Dashboard', status: 'PENDING' },
        ],
        [
            { amount: 2000, deliverable: 'Threat Intelligence Scan', status: 'PENDING' },
            { amount: 2000, deliverable: 'Risk Assessment Report', status: 'PENDING' },
        ],
    ];

    for (let i = 0; i < s2agents.length; i++) {
        const sj = await prisma.streamJob.create({
            data: {
                clientWallet,
                agentWallet: s2agents[i].wallet,
                agentName: s2agents[i].name,
                totalBudget: s2budgets[i],
                releasedAmount: s2released[i],
                status: 'ACTIVE',
                deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                createdAt: hoursAgo(120),
                milestones: {
                    create: s2milestones[i].map((m, idx) => ({
                        index: idx,
                        amount: m.amount,
                        deliverable: m.deliverable,
                        status: m.status,
                        submittedAt: m.submitted || null,
                        reviewedAt: m.reviewed || null,
                        approveTxHash: m.status === 'APPROVED' ? randomHash() : null,
                    })),
                },
            },
        });
        await prisma.swarmStream.create({
            data: {
                swarmId: swarm2.id,
                streamJobId: sj.id,
                role: i === 0 ? 'coordinator' : i === 2 ? 'reviewer' : 'worker',
                allocatedBudget: s2budgets[i],
                releasedAmount: s2released[i],
            },
        });
    }

    // ====================================================
    // SWARM 3: Completed Governance Audit (COMPLETED, 2 agents)
    // ====================================================
    console.log('📦 Creating Swarm 3: Governance Audit (Completed)...');

    const swarm3 = await prisma.swarmSession.create({
        data: {
            name: 'DAO Governance Audit',
            clientWallet,
            totalBudget: 8000,
            totalReleased: 8000,
            agentCount: 2,
            status: 'COMPLETED',
            escrowTxHash: randomHash(),
            onChainJobId: 41,
            totalLocked: 8000,
            escrowStatus: 'SETTLED',
            deadline: hoursAgo(24),
            createdAt: hoursAgo(240),
            completedAt: hoursAgo(48),
        },
    });

    for (let i = 0; i < 2; i++) {
        const agent = agents[4 + i];
        const budget = i === 0 ? 5000 : 3000;
        const sj = await prisma.streamJob.create({
            data: {
                clientWallet,
                agentWallet: agent.wallet,
                agentName: agent.name,
                totalBudget: budget,
                releasedAmount: budget,
                status: 'COMPLETED',
                deadline: hoursAgo(24),
                createdAt: hoursAgo(240),
                milestones: {
                    create: [
                        { index: 0, amount: budget * 0.4, deliverable: i === 0 ? 'Governance Model Review' : 'Voting Mechanism Analysis', status: 'APPROVED', submittedAt: hoursAgo(192), reviewedAt: hoursAgo(190), approveTxHash: randomHash() },
                        { index: 1, amount: budget * 0.6, deliverable: i === 0 ? 'Security Recommendations' : 'Implementation Guide', status: 'APPROVED', submittedAt: hoursAgo(72), reviewedAt: hoursAgo(70), approveTxHash: randomHash() },
                    ],
                },
            },
        });
        await prisma.swarmStream.create({
            data: {
                swarmId: swarm3.id,
                streamJobId: sj.id,
                role: i === 0 ? 'coordinator' : 'reviewer',
                allocatedBudget: budget,
                releasedAmount: budget,
                status: 'COMPLETED',
            },
        });
    }

    // ====================================================
    // A2A TRANSFERS (50+)
    // ====================================================
    console.log('⚡ Creating 50+ A2A Transfers...');

    const transferData = [];
    const swarmIds = [swarm1.id, swarm2.id, swarm3.id];
    const reasons = [
        'Subcontracted security scan',
        'Data analysis fee',
        'Proof generation bounty',
        'Cross-validation reward',
        'Intel acquisition',
        'Coordination fee',
        'Review compensation',
        'Emergency patch analysis',
        'Gas optimization reward',
        'Risk assessment fee',
    ];

    for (let i = 0; i < 55; i++) {
        const sender = pick(agents);
        let receiver = pick(agents);
        while (receiver.wallet === sender.wallet) receiver = pick(agents);

        transferData.push({
            senderWallet: sender.wallet,
            receiverWallet: receiver.wallet,
            amount: randomBetween(5, 500),
            token: 'AlphaUSD',
            reason: pick(reasons),
            txHash: Math.random() > 0.2 ? randomHash() : null,
            swarmId: pick(swarmIds),
            status: Math.random() > 0.15 ? 'CONFIRMED' : 'PENDING',
            createdAt: minutesAgo(Math.floor(Math.random() * 10000)),
        });
    }

    await prisma.a2ATransfer.createMany({ data: transferData });

    // ====================================================
    // INTEL SUBMISSIONS (15)
    // ====================================================
    console.log('🛡️ Creating 15 Intel Submissions...');

    const intelCategories = ['security', 'defi', 'market', 'governance'];
    const intelData = [
        { cat: 'security', title: 'Critical Reentrancy Vector in DEX Router', summary: 'Identified a flash-loan-enabled reentrancy attack path in the main DEX router contract. Impact: potential drain of liquidity pools.', price: 2500, status: 'VERIFIED', quality: 95 },
        { cat: 'security', title: 'Integer Overflow in Token Bridge', summary: 'Token bridge contract has unchecked arithmetic in deposit function. Could allow minting of arbitrary tokens on destination chain.', price: 3000, status: 'PURCHASED', quality: 98 },
        { cat: 'defi', title: 'Yield Strategy: Recursive Lending Optimization', summary: 'Novel recursive lending strategy achieving 12.5% APY through optimized collateral ratios across 3 lending protocols.', price: 800, status: 'LISTED', quality: null },
        { cat: 'defi', title: 'MEV Protection Analysis: Batch Auction DEX', summary: 'Comprehensive analysis of batch auction mechanisms for MEV protection. Includes simulation results and implementation recommendations.', price: 1200, status: 'VERIFIED', quality: 87 },
        { cat: 'market', title: 'Token Launch: Momentum Signal Detection', summary: 'ML-based detection of early momentum signals for token launches using on-chain and social data. 78% accuracy on backtested data.', price: 500, status: 'LISTED', quality: null },
        { cat: 'market', title: 'Whale Wallet Clustering Analysis', summary: 'Identified 23 connected whale wallets controlling 15% of TEMPO supply through graph analysis of transaction patterns.', price: 1500, status: 'PURCHASED', quality: 91 },
        { cat: 'governance', title: 'DAO Voting Power Concentration Risk', summary: 'Analysis shows top 5 delegates control 67% of voting power in major DAOs. Sybil resistance recommendations included.', price: 600, status: 'VERIFIED', quality: 82 },
        { cat: 'governance', title: 'Optimistic Governance Attack Vector', summary: 'Theoretical attack on optimistic governance models where delayed execution can be exploited through coordinated flash proposals.', price: 2000, status: 'LISTED', quality: null },
        { cat: 'security', title: 'Cross-Chain Bridge Verification Gap', summary: 'Found verification gap in cross-chain message passing allowing forged receipts on destination chain.', price: 4000, status: 'VERIFIED', quality: 99 },
        { cat: 'defi', title: 'Liquidation Cascade Simulation Results', summary: 'Agent-based simulation of liquidation cascades across 5 major lending protocols. Identifies critical trigger thresholds.', price: 900, status: 'LISTED', quality: null },
        { cat: 'market', title: 'Sentiment Analysis: AI Agent Token Sector', summary: 'NLP-based sentiment tracking of AI agent token ecosystem showing strong positive momentum and developer activity growth.', price: 350, status: 'PURCHASED', quality: 76 },
        { cat: 'security', title: 'Proxy Upgrade Vulnerability Scanner Results', summary: 'Automated scan of 150 upgradeable proxy contracts found 12 with unprotected initialize functions and 3 with storage collisions.', price: 1800, status: 'VERIFIED', quality: 93 },
        { cat: 'governance', title: 'Delegation Graph: Hidden Influence Networks', summary: 'Social graph analysis revealing hidden influence networks in top 10 DAOs through delegation chain analysis.', price: 700, status: 'LISTED', quality: null },
        { cat: 'defi', title: 'Stablecoin Depeg Early Warning System', summary: 'Real-time monitoring system detecting early signals of stablecoin depegs using on-chain liquidity metrics and oracle divergence.', price: 1100, status: 'VERIFIED', quality: 88 },
        { cat: 'market', title: 'NFT Wash Trading Detection Model', summary: 'Graph neural network model for detecting wash trading patterns in NFT marketplaces with 94% precision.', price: 650, status: 'LISTED', quality: null },
    ];

    for (const intel of intelData) {
        const commitment = crypto.randomBytes(31).toString('hex');
        const nullifier = crypto.randomBytes(31).toString('hex');

        await prisma.intelSubmission.create({
            data: {
                sourceAgentId: null, // anonymous
                zkCommitment: commitment,
                nullifierHash: nullifier,
                category: intel.cat,
                title: intel.title,
                summary: intel.summary,
                dataHash: randomHash(),
                qualityScore: intel.quality,
                price: intel.price,
                token: 'AlphaUSD',
                buyerWallet: intel.status === 'PURCHASED' ? clientWallet : null,
                paymentTxHash: intel.status === 'PURCHASED' ? randomHash() : null,
                status: intel.status,
                createdAt: minutesAgo(Math.floor(Math.random() * 15000)),
            },
        });
    }

    // ====================================================
    // AUDIT EVENTS (200+)
    // ====================================================
    console.log('📊 Creating 200+ Audit Events...');

    const eventTypes = [
        { type: 'SWARM_CREATED', severity: 'SUCCESS', titles: ['Swarm Created', 'New Swarm Session', 'Swarm Initialized'] },
        { type: 'AGENT_JOINED', severity: 'INFO', titles: ['Agent Joined Swarm', 'New Agent Connected', 'Agent Registered'] },
        { type: 'MILESTONE_SUBMITTED', severity: 'INFO', titles: ['Milestone Submitted', 'Work Delivered', 'Deliverable Ready'] },
        { type: 'MILESTONE_APPROVED', severity: 'SUCCESS', titles: ['Milestone Approved', 'Work Accepted', 'Payment Released'] },
        { type: 'MILESTONE_REJECTED', severity: 'WARNING', titles: ['Milestone Rejected', 'Revision Required', 'Work Needs Improvement'] },
        { type: 'A2A_TRANSFER', severity: 'INFO', titles: ['A2A Transfer', 'Agent Payment', 'Micropayment Sent'] },
        { type: 'INTEL_SUBMITTED', severity: 'INFO', titles: ['Intel Submitted', 'New Intelligence', 'Data Listed'] },
        { type: 'INTEL_VERIFIED', severity: 'SUCCESS', titles: ['Intel Verified', 'Quality Confirmed', 'Data Validated'] },
        { type: 'INTEL_PURCHASED', severity: 'SUCCESS', titles: ['Intel Purchased', 'Data Acquired', 'Intelligence Bought'] },
        { type: 'ESCROW_LOCKED', severity: 'SUCCESS', titles: ['Escrow Locked', 'Funds Secured', 'Budget Protected'] },
        { type: 'ESCROW_RELEASED', severity: 'SUCCESS', titles: ['Escrow Released', 'Funds Distributed', 'Payment Sent'] },
        { type: 'ESCROW_SETTLED', severity: 'SUCCESS', titles: ['Escrow Settled', 'All Funds Distributed', 'Settlement Complete'] },
        { type: 'BUDGET_ALLOCATED', severity: 'INFO', titles: ['Budget Allocated', 'Funds Assigned', 'Allocation Set'] },
        { type: 'SYSTEM_EVENT', severity: 'INFO', titles: ['System Check', 'Health Ping', 'Status Update'] },
    ];

    const auditData = [];
    for (let i = 0; i < 220; i++) {
        const et = pick(eventTypes);
        const agent = pick(agents);
        const swarmId = pick([swarm1.id, swarm2.id, swarm3.id, null]);

        auditData.push({
            swarmId,
            agentId: agent.wallet,
            agentName: agent.name,
            eventType: et.type,
            title: pick(et.titles),
            description: `${agent.name} performed ${et.type.toLowerCase().replace(/_/g, ' ')} action`,
            metadata: { agentName: agent.name, amount: randomBetween(10, 5000) },
            txHash: Math.random() > 0.4 ? randomHash() : null,
            severity: et.severity,
            createdAt: minutesAgo(Math.floor(Math.random() * 20000)),
        });
    }

    await prisma.auditEvent.createMany({ data: auditData });

    // ====================================================
    // Summary
    // ====================================================
    const counts = await Promise.all([
        prisma.swarmSession.count(),
        prisma.swarmStream.count(),
        prisma.a2ATransfer.count(),
        prisma.intelSubmission.count(),
        prisma.auditEvent.count(),
    ]);

    console.log('\n✅ Seed complete!');
    console.log(`   🐝 Swarm Sessions: ${counts[0]}`);
    console.log(`   🔗 Swarm Streams:  ${counts[1]}`);
    console.log(`   ⚡ A2A Transfers:  ${counts[2]}`);
    console.log(`   🛡️ Intel Submissions: ${counts[3]}`);
    console.log(`   📊 Audit Events:   ${counts[4]}`);
    console.log('\n🎉 Agent Swarm Hub is ready!');
}

seed()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
