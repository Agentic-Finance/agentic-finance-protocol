#!/usr/bin/env node
/**
 * Demo Data Seeder — Populate all pages for impressive demo video
 *
 * Creates: AgentJobs, PayoutRecords, StreamJobs, Milestones,
 *          AutopilotRules, Employees, Workspace
 *
 * Run: node prisma/seed-demo.js
 * Safe: Uses createMany — won't duplicate on re-run (unique txHash)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_WALLET = '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793';
const TOKENS = ['AlphaUSD', 'pathUSD', 'BetaUSD', 'ThetaUSD'];
const TOKEN_WEIGHTS = [0.6, 0.2, 0.15, 0.05]; // distribution

function randomToken() {
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < TOKENS.length; i++) {
    sum += TOKEN_WEIGHTS[i];
    if (r < sum) return TOKENS[i];
  }
  return TOKENS[0];
}

function randomHex(len = 64) {
  return '0x' + Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomWallet() {
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

const PROMPTS = [
  'Create escrow for smart contract audit',
  'Deploy ERC-20 token with 1M supply',
  'Batch send payroll to 20 employees',
  'Shield 5000 AlphaUSD via ZK proof',
  'Stream payment for milestone-based project',
  'Audit contract for reentrancy vulnerabilities',
  'Transfer 1000 AlphaUSD to team wallet',
  'Create multi-token batch payment',
  'Check portfolio balances across all tokens',
  'Monitor gas costs for escrow operations',
  'Set up recurring weekly payments',
  'Verify AI proof commitments on-chain',
  'Inspect vault deposits and commitments',
  'Scan wallet for all token holdings',
  'Profile gas usage for batch transfers',
  'Sweep all tokens to safe wallet',
  'Create milestone-based development stream',
  'Deploy custom token with branding',
  'Settle batch of completed escrow jobs',
  'Read all contract states for dashboard',
];

const EMPLOYEE_NAMES = [
  'Alex Chen', 'Maria Santos', 'James Park', 'Priya Sharma', 'Omar Hassan',
  'Sophie Laurent', 'Kenji Tanaka', 'Isabella Rossi', 'David Kim', 'Fatima Al-Rashid',
  'Lucas Weber', 'Aisha Okonkwo', 'Ryan Murphy', 'Yuki Sato', 'Elena Petrova',
];

async function seed() {
  console.log('[seed-demo] Starting demo data seed...\n');

  // ── 1. Fetch existing agents ────────────────────────────
  const agents = await prisma.marketplaceAgent.findMany();
  if (agents.length === 0) {
    console.error('[seed-demo] No agents found! Run seed.js first.');
    return;
  }
  console.log(`[seed-demo] Found ${agents.length} agents in marketplace`);

  // ── 2. Create Workspace ─────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { adminWallet: ADMIN_WALLET },
    create: { name: 'PayPol Demo Vault', adminWallet: ADMIN_WALLET, type: 'corporate' },
    update: {},
  });
  console.log(`[seed-demo] Workspace: ${workspace.name} (${workspace.id})`);

  // ── 3. Create Completed AgentJobs (60) ──────────────────
  // Top 5 agents get more jobs (dominance effect)
  const topAgents = agents.slice(0, 5);
  const otherAgents = agents.slice(5);
  const completedJobs = [];

  // Top 5 agents: 8-12 jobs each
  for (const agent of topAgents) {
    const jobCount = Math.floor(Math.random() * 5) + 8;
    for (let i = 0; i < jobCount; i++) {
      const budget = randomBetween(500, 8000);
      const negotiatedPrice = budget * (0.85 + Math.random() * 0.15);
      const platformFee = negotiatedPrice * 0.08;
      const dayOffset = Math.floor(Math.random() * 85) + 1; // spread over 85 days for upward trend
      completedJobs.push({
        agentId: agent.id,
        clientWallet: randomWallet(),
        prompt: PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
        budget,
        negotiatedPrice: Math.round(negotiatedPrice * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        token: randomToken(),
        status: Math.random() > 0.3 ? 'COMPLETED' : 'SETTLED',
        result: JSON.stringify({ success: true, txHash: randomHex(), gasUsed: Math.floor(Math.random() * 200000) + 50000 }),
        executionTime: Math.floor(Math.random() * 120) + 5,
        createdAt: daysAgo(dayOffset),
        completedAt: daysAgo(dayOffset - (Math.random() > 0.5 ? 0 : 1)),
        escrowTxHash: randomHex(),
        settleTxHash: randomHex(),
      });
    }
  }

  // Other agents: 0-3 jobs each (up to ~15 more)
  for (const agent of otherAgents.slice(0, 15)) {
    const jobCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < jobCount; i++) {
      const budget = randomBetween(200, 3000);
      const negotiatedPrice = budget * (0.85 + Math.random() * 0.15);
      const platformFee = negotiatedPrice * 0.08;
      const dayOffset = Math.floor(Math.random() * 60) + 1;
      completedJobs.push({
        agentId: agent.id,
        clientWallet: randomWallet(),
        prompt: PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
        budget,
        negotiatedPrice: Math.round(negotiatedPrice * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        token: randomToken(),
        status: 'COMPLETED',
        result: JSON.stringify({ success: true }),
        executionTime: Math.floor(Math.random() * 60) + 5,
        createdAt: daysAgo(dayOffset),
        completedAt: daysAgo(dayOffset),
        escrowTxHash: randomHex(),
      });
    }
  }

  // Insert completed jobs
  for (const job of completedJobs) {
    await prisma.agentJob.create({ data: job });
  }
  console.log(`[seed-demo] Created ${completedJobs.length} completed AgentJobs`);

  // ── 4. Create Active Escrow Jobs (15) — for TVL ────────
  const escrowJobs = [];
  for (let i = 0; i < 15; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const budget = randomBetween(1000, 15000);
    escrowJobs.push({
      agentId: agent.id,
      clientWallet: randomWallet(),
      prompt: PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
      budget,
      negotiatedPrice: budget,
      platformFee: budget * 0.08,
      token: randomToken(),
      status: 'ESCROW_LOCKED',
      createdAt: daysAgo(Math.floor(Math.random() * 7) + 1),
      escrowTxHash: randomHex(),
      onChainJobId: 1000 + i,
      deadline: new Date(Date.now() + 7 * 86400000),
    });
  }
  for (const job of escrowJobs) {
    await prisma.agentJob.create({ data: job });
  }
  console.log(`[seed-demo] Created ${escrowJobs.length} active escrow jobs (TVL)`);

  // ── 5. Update agent stats based on jobs ─────────────────
  const jobCounts = {};
  for (const job of completedJobs) {
    if (!jobCounts[job.agentId]) jobCounts[job.agentId] = 0;
    jobCounts[job.agentId]++;
  }
  for (const [agentId, count] of Object.entries(jobCounts)) {
    await prisma.marketplaceAgent.update({
      where: { id: agentId },
      data: {
        totalJobs: count,
        successRate: 95 + Math.random() * 5,
        avgRating: 4.3 + Math.random() * 0.7,
        ratingCount: Math.floor(count * 0.7),
      },
    });
  }
  console.log(`[seed-demo] Updated stats for ${Object.keys(jobCounts).length} agents`);

  // ── 6. Create PayoutRecords (80) — Audit Ledger ────────
  const payoutRecords = [];
  for (let i = 0; i < 80; i++) {
    const dayOffset = Math.floor(Math.random() * 60);
    // More records in recent days (upward trend)
    const adjustedDay = Math.floor(dayOffset * dayOffset / 60);
    payoutRecords.push({
      recipient: randomWallet(),
      amount: randomBetween(50, 5000),
      token: randomToken(),
      txHash: randomHex(),
      createdAt: daysAgo(adjustedDay),
    });
  }
  for (const record of payoutRecords) {
    try {
      await prisma.payoutRecord.create({ data: record });
    } catch (e) { /* skip duplicate txHash */ }
  }
  console.log(`[seed-demo] Created ${payoutRecords.length} PayoutRecords`);

  // ── 7. Create StreamJobs (4) with Milestones ───────────
  const streamConfigs = [
    { name: 'Smart Contract Audit', budget: 12000, status: 'ACTIVE', milestones: ['Initial code review', 'Vulnerability analysis', 'Final audit report'], approvedCount: 1 },
    { name: 'DApp Frontend Build', budget: 8000, status: 'ACTIVE', milestones: ['Wireframes & design', 'Component development', 'Integration testing', 'Production deploy'], approvedCount: 2 },
    { name: 'Token Launch Package', budget: 5000, status: 'COMPLETED', milestones: ['Tokenomics design', 'Contract deployment', 'Liquidity setup'], approvedCount: 3 },
    { name: 'API Integration', budget: 3000, status: 'ACTIVE', milestones: ['API specification', 'Implementation', 'Testing'], approvedCount: 0 },
  ];

  for (const config of streamConfigs) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const milestoneAmount = config.budget / config.milestones.length;
    const releasedAmount = milestoneAmount * config.approvedCount;

    const stream = await prisma.streamJob.create({
      data: {
        clientWallet: ADMIN_WALLET,
        agentWallet: agent.ownerWallet,
        agentName: agent.name,
        totalBudget: config.budget,
        releasedAmount,
        status: config.status,
        onChainStreamId: Math.floor(Math.random() * 100) + 1,
        streamTxHash: randomHex(),
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 5),
      },
    });

    for (let i = 0; i < config.milestones.length; i++) {
      const isApproved = i < config.approvedCount;
      const isSubmitted = i === config.approvedCount && config.status === 'ACTIVE';
      await prisma.milestone.create({
        data: {
          streamJobId: stream.id,
          index: i,
          amount: milestoneAmount,
          deliverable: config.milestones[i],
          status: isApproved ? 'APPROVED' : isSubmitted ? 'SUBMITTED' : 'PENDING',
          proofHash: isApproved || isSubmitted ? randomHex() : null,
          submitTxHash: isApproved || isSubmitted ? randomHex() : null,
          approveTxHash: isApproved ? randomHex() : null,
          submittedAt: isApproved || isSubmitted ? daysAgo(Math.floor(Math.random() * 5)) : null,
          reviewedAt: isApproved ? daysAgo(Math.floor(Math.random() * 3)) : null,
        },
      });
    }
  }
  console.log(`[seed-demo] Created ${streamConfigs.length} StreamJobs with milestones`);

  // ── 8. Create AutopilotRules (4) ───────────────────────
  const autopilotRules = [
    { name: 'Weekly Dev Team Payout', wallet_address: randomWallet(), amount: 2500, token: 'AlphaUSD', schedule: 'Weekly', note: 'Engineering team salary', status: 'Active' },
    { name: 'Monthly Marketing Budget', wallet_address: randomWallet(), amount: 5000, token: 'AlphaUSD', schedule: 'Monthly (1st)', note: 'Marketing allocation', status: 'Active' },
    { name: 'Daily Operations Fund', wallet_address: randomWallet(), amount: 200, token: 'pathUSD', schedule: 'Daily', note: 'Operational expenses', status: 'Active' },
    { name: 'Quarterly Audit Reserve', wallet_address: randomWallet(), amount: 10000, token: 'AlphaUSD', schedule: 'Monthly (1st)', note: 'Security audit reserve', status: 'Paused' },
  ];

  for (const rule of autopilotRules) {
    await prisma.autopilotRule.create({ data: rule });
  }
  console.log(`[seed-demo] Created ${autopilotRules.length} AutopilotRules`);

  // ── 9. Create Employees (15) — Boardroom demo ──────────
  const employees = EMPLOYEE_NAMES.map((name, i) => ({
    workspaceId: workspace.id,
    name,
    walletAddress: randomWallet(),
    amount: randomBetween(500, 5000),
    token: i < 10 ? 'AlphaUSD' : randomToken(),
    note: ['Salary', 'Bonus', 'Contractor fee', 'Milestone payment', 'Reimbursement'][Math.floor(Math.random() * 5)],
    status: i < 5 ? 'Awaiting_Approval' : i < 10 ? 'Pending' : 'Paid',
  }));

  for (const emp of employees) {
    await prisma.employee.create({ data: emp });
  }
  console.log(`[seed-demo] Created ${employees.length} Employees`);

  // ── 10. Create EscrowYield Positions (8) ───────────────
  // Yield on locked escrow funds — mix of accruing and settled
  const allJobs = await prisma.agentJob.findMany({
    where: { status: { in: ['ESCROW_LOCKED', 'COMPLETED', 'SETTLED'] } },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });

  const yieldPositions = [];
  for (let i = 0; i < Math.min(8, allJobs.length); i++) {
    const job = allJobs[i];
    const principal = job.negotiatedPrice || job.budget;
    const apy = [4.5, 5.0, 5.0, 5.5, 5.0, 4.8, 5.2, 5.0][i] || 5.0;
    const daysActive = Math.floor(Math.random() * 30) + 3;
    const yieldEarned = Math.round(principal * (apy / 100) * (daysActive / 365) * 100) / 100;
    const isSettled = i >= 6; // Last 2 are settled

    yieldPositions.push({
      jobId: job.id,
      principal: Math.round(principal * 100) / 100,
      token: job.token,
      apy,
      yieldEarned: isSettled ? yieldEarned : 0, // Accruing ones compute in real-time
      status: isSettled ? 'Settled' : 'Accruing',
      startedAt: daysAgo(daysActive),
      settledAt: isSettled ? daysAgo(1) : null,
    });
  }

  for (const yp of yieldPositions) {
    await prisma.escrowYield.create({ data: yp });
  }
  console.log(`[seed-demo] Created ${yieldPositions.length} EscrowYield positions`);

  // ── 11. Create Embedded Wallets (10) ──────────────────
  // 6 agent wallets + 4 employee wallets
  const crypto = require('crypto');
  function fakeEncrypt() {
    // Generate realistic-looking encrypted data for demo
    return {
      encryptedKey: crypto.randomBytes(32).toString('hex'),
      iv: crypto.randomBytes(16).toString('hex'),
      authTag: crypto.randomBytes(16).toString('hex'),
    };
  }

  const agentWalletLabels = [
    'Agent: ContractGuard', 'Agent: YieldOptimizer', 'Agent: GasAnalyzer',
    'Agent: ComplianceBot', 'Agent: AuditShield', 'Agent: DeployMaster',
  ];
  const employeeWalletLabels = [
    'Employee: Alex Chen', 'Employee: Maria Santos',
    'Employee: James Park', 'Employee: Priya Sharma',
  ];

  const walletData = [];
  for (let i = 0; i < agentWalletLabels.length; i++) {
    const enc = fakeEncrypt();
    walletData.push({
      label: agentWalletLabels[i],
      ownerType: 'agent',
      ownerId: agents[i]?.id || null,
      address: randomWallet(),
      encryptedKey: enc.encryptedKey,
      iv: enc.iv,
      authTag: enc.authTag,
      balance: randomBetween(100, 5000),
      isActive: true,
      lastUsedAt: daysAgo(Math.floor(Math.random() * 7)),
    });
  }
  for (let i = 0; i < employeeWalletLabels.length; i++) {
    const enc = fakeEncrypt();
    walletData.push({
      label: employeeWalletLabels[i],
      ownerType: 'employee',
      address: randomWallet(),
      encryptedKey: enc.encryptedKey,
      iv: enc.iv,
      authTag: enc.authTag,
      balance: randomBetween(50, 2000),
      isActive: true,
      lastUsedAt: daysAgo(Math.floor(Math.random() * 14)),
    });
  }

  for (const w of walletData) {
    await prisma.embeddedWallet.create({ data: w });
  }
  console.log(`[seed-demo] Created ${walletData.length} Embedded Wallets`);

  // ── Summary ─────────────────────────────────────────────
  console.log('\n[seed-demo] ═══════════════════════════════════');
  console.log(`[seed-demo] ✅ Demo data seeded successfully!`);
  console.log(`[seed-demo]    Workspace:      1`);
  console.log(`[seed-demo]    Completed Jobs: ${completedJobs.length}`);
  console.log(`[seed-demo]    Active Escrows: ${escrowJobs.length}`);
  console.log(`[seed-demo]    PayoutRecords:  ${payoutRecords.length}`);
  console.log(`[seed-demo]    Streams:        ${streamConfigs.length}`);
  console.log(`[seed-demo]    Autopilot:      ${autopilotRules.length}`);
  console.log(`[seed-demo]    Employees:      ${employees.length}`);
  console.log(`[seed-demo]    Yield Positions:${yieldPositions.length}`);
  console.log(`[seed-demo]    Wallets:        ${walletData.length}`);
  console.log('[seed-demo] ═══════════════════════════════════\n');
}

seed()
  .catch(e => console.error('[seed-demo] Error:', e.message))
  .finally(() => prisma.$disconnect());
