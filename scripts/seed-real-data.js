/**
 * PayPol Real Data Seeder
 *
 * Creates REAL on-chain transactions + DB records for VC demo:
 * - NexusV2 escrow jobs (create → start → complete → settle → rate)
 * - AIProofRegistry commitments (commit → verify)
 * - StreamV1 streams with milestones
 * - DB: AgentJobs, Reviews, Notifications, PayoutRecords, EscrowYield
 */

const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ── Config ──
const RPC_URL = 'https://rpc.moderato.tempo.xyz';
const DAEMON_KEY = process.env.DAEMON_PRIVATE_KEY || '0x3a573b684c573b069719efebf714c021ac4f6f8480aa397375fe58fa16b93eae';
const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY || '0x595f4a50a556c332910de723c710d1f6b654d3d86c9208498c876d147c8c4124';

const TOKEN = '0x20c0000000000000000000000000000000000001';
const NEXUS_V2 = '0x6A467Cd4156093bB528e448C04366586a1052Fab';
const AI_PROOF = '0x8fDB8E871c9eaF2955009566F41490Bbb128a014';
const STREAM_V1 = '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
];

const NEXUS_V2_ABI = [
  'function createJob(address _worker, address _judge, address _token, uint256 _amount, uint256 _deadlineDuration) external returns (uint256)',
  'function startJob(uint256 _jobId) external',
  'function completeJob(uint256 _jobId) external',
  'function settleJob(uint256 _jobId) external',
  'function rateWorker(uint256 _jobId, uint256 _rating) external',
  'function getJob(uint256 _jobId) external view returns (address employer, address worker, address judge, address token, uint256 budget, uint256 platformFee, uint256 deadline, uint8 status, bool rated)',
  'event JobCreated(uint256 indexed jobId, address indexed employer, address indexed worker, uint256 budget, uint256 deadline)',
  'event JobSettled(uint256 indexed jobId, uint256 workerPay, uint256 fee)',
];

const AI_PROOF_ABI = [
  'function commit(bytes32 planHash, uint256 nexusJobId) external returns (bytes32)',
  'function verify(bytes32 commitmentId, bytes32 resultHash) external',
  'function getStats() external view returns (uint256 totalCommitments, uint256 totalVerified, uint256 totalMatched, uint256 totalMismatched, uint256 totalSlashed)',
  'event CommitmentMade(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId, bytes32 planHash)',
  'event CommitmentVerified(bytes32 indexed commitmentId, bool matched, bytes32 resultHash)',
];

const STREAM_V1_ABI = [
  'function createStream(address _agent, address _token, uint256[] calldata _milestoneAmounts, uint256 _deadlineDuration) external returns (uint256)',
  'function submitMilestone(uint256 _streamId, uint256 _milestoneIndex, bytes32 _proofHash) external',
  'function approveMilestone(uint256 _streamId, uint256 _milestoneIndex) external',
  'function streamCount() external view returns (uint256)',
  'event StreamCreated(uint256 indexed streamId, address indexed client, address indexed agent, uint256 totalBudget, uint256 milestoneCount, uint256 deadline)',
];

const TX_OPTS = { type: 0, gasLimit: 5_000_000 }; // TIP-20 precompile tokens use 5-6x more gas

// ── Helpers ──
function randomHash() { return ethers.keccak256(ethers.toUtf8Bytes(crypto.randomUUID())); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function parseUnits(n) { return ethers.parseUnits(String(n), 6); }

// Client wallets to simulate different users
const CLIENT_WALLETS = [
  '0xA1b2C3d4E5f6789012345678901234567890aaaa',
  '0xB2c3D4e5F6789012345678901234567890bbbb',
  '0xC3d4E5f6789012345678901234567890cccccccc',
  '0xD4e5F678901234567890123456789012ddddddd0',
  '0xE5f6789012345678901234567890123456eeeeee',
];

// ── Job scenarios for realistic data ──
const JOB_SCENARIOS = [
  { agentName: 'Contract Deploy Pro', prompt: 'Deploy an ERC-20 token with 1M supply, symbol TEMPO, on Tempo L1 mainnet', budget: 120, category: 'deployment' },
  { agentName: 'Escrow Manager', prompt: 'Create a multi-party escrow for 3 contractors with milestone-based release', budget: 85, category: 'escrow' },
  { agentName: 'Shield Executor', prompt: 'Execute a ZK-shielded payroll transfer for 5 employees totaling 2,500 AlphaUSD', budget: 150, category: 'privacy' },
  { agentName: 'Payroll Planner', prompt: 'Plan and execute monthly payroll for a 12-person team across 3 departments', budget: 200, category: 'payroll' },
  { agentName: 'Token Deployer', prompt: 'Deploy governance token with vesting schedule and multi-sig ownership', budget: 180, category: 'deployment' },
  { agentName: 'A2A Coordinator', prompt: 'Orchestrate security audit across 3 specialized agents with parallel execution', budget: 250, category: 'orchestration' },
  { agentName: 'Balance Scanner', prompt: 'Monitor whale wallets and alert on movements > 10,000 AlphaUSD', budget: 45, category: 'analytics' },
  { agentName: 'Multisend Batch', prompt: 'Execute batch payment to 25 airdrop recipients with verification', budget: 95, category: 'payments' },
  { agentName: 'Stream Creator', prompt: 'Set up progressive payment stream for 6-month development contract', budget: 160, category: 'streams' },
  { agentName: 'Proof Verifier', prompt: 'Verify on-chain execution proofs for last 50 completed agent jobs', budget: 65, category: 'verification' },
  { agentName: 'Treasury Manager', prompt: 'Analyze protocol treasury allocation and suggest yield optimization', budget: 110, category: 'analytics' },
  { agentName: 'Vault Depositor', prompt: 'Deposit 5,000 AlphaUSD into ShieldVault with ZK commitment generation', budget: 75, category: 'privacy' },
  { agentName: 'Escrow Lifecycle', prompt: 'Full escrow lifecycle test: create, fund, execute, verify, settle', budget: 55, category: 'escrow' },
  { agentName: 'Gas Profiler', prompt: 'Profile gas costs for all 9 verified contracts and generate optimization report', budget: 40, category: 'analytics' },
  { agentName: 'Token Transfer', prompt: 'Execute cross-token atomic swap between AlphaUSD and BetaUSD pools', budget: 35, category: 'payments' },
  { agentName: 'Recurring Payment', prompt: 'Set up weekly recurring payments for 8 freelancers with auto-execute', budget: 130, category: 'payments' },
  { agentName: 'Wallet Sweeper', prompt: 'Consolidate dust balances from 15 embedded wallets into treasury', budget: 60, category: 'security' },
  { agentName: 'Chain Monitor', prompt: 'Real-time monitoring of Tempo L1 block production and validator status', budget: 30, category: 'analytics' },
  { agentName: 'Escrow Dispute', prompt: 'Mediate dispute resolution for job #142 with evidence analysis', budget: 90, category: 'escrow' },
  { agentName: 'Proof Auditor', prompt: 'Audit 30 days of AI proof commitments for anomalies and false matches', budget: 70, category: 'verification' },
];

// Reviews text
const REVIEW_COMMENTS = [
  'Excellent execution, completed ahead of schedule with thorough verification.',
  'Very efficient. On-chain proofs verified instantly. Will hire again.',
  'Solid work — handled edge cases well. Gas optimization was impressive.',
  'Fast turnaround. Milestone-based delivery made progress easy to track.',
  'Outstanding performance. Agent handled the multi-step workflow flawlessly.',
  'Good results overall. Minor delay on verification but final output was accurate.',
  'Impressive orchestration across sub-agents. A2A delegation worked perfectly.',
  'Clean execution with zero reverts. AI proof matched 100%.',
  'Professional service. Detailed reporting and transparent execution logs.',
  'Exceeded expectations — discovered and fixed issues beyond the original scope.',
  'Reliable agent. Third time hiring, consistently delivers quality results.',
  'Quick and accurate. ZK proof generation was seamless.',
  'Handled complex multi-token batch flawlessly. Verified every transfer.',
  'Great for automated workflows. Set up recurring payments in under 2 minutes.',
  'Thorough security analysis. Found 2 critical issues others missed.',
  'Excellent treasury management suggestions. Implemented 3 of 5 recommendations.',
  'Completed payroll processing for all employees with perfect accuracy.',
  'Stream settlement milestones tracked perfectly. Zero discrepancies.',
  'Escrow lifecycle handled end-to-end without manual intervention.',
  'Proof verification audit was comprehensive. Clear documentation provided.',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const daemon = new ethers.Wallet(DAEMON_KEY, provider); // 0x33F7... (worker/agent)
  const admin = new ethers.Wallet(ADMIN_KEY, provider);   // 0x7D92... (employer/client)

  console.log('Daemon wallet:', daemon.address);
  console.log('Admin wallet:', admin.address);

  const token = new ethers.Contract(TOKEN, ERC20_ABI, admin);
  const nexus = new ethers.Contract(NEXUS_V2, NEXUS_V2_ABI, admin);
  const nexusDaemon = new ethers.Contract(NEXUS_V2, NEXUS_V2_ABI, daemon);
  const aiProof = new ethers.Contract(AI_PROOF, AI_PROOF_ABI, daemon);
  const stream = new ethers.Contract(STREAM_V1, STREAM_V1_ABI, admin);
  const streamDaemon = new ethers.Contract(STREAM_V1, STREAM_V1_ABI, daemon);

  // Get agents from DB
  const agents = await prisma.marketplaceAgent.findMany({ where: { isActive: true } });
  const agentMap = {};
  for (const a of agents) agentMap[a.name] = a;
  console.log(`Loaded ${agents.length} agents from DB`);

  // Check balances
  const adminBal = await token.balanceOf(admin.address);
  const daemonBal = await token.balanceOf(daemon.address);
  console.log('Admin AlphaUSD:', ethers.formatUnits(adminBal, 6));
  console.log('Daemon AlphaUSD:', ethers.formatUnits(daemonBal, 6));

  // ══════════════════════════════════════════
  // PHASE 1: Approve tokens for NexusV2 + StreamV1
  // ══════════════════════════════════════════
  console.log('\n═══ PHASE 1: Token Approvals ═══');

  const totalNeeded = parseUnits(10000); // 10K should be enough
  const currentAllowanceNexus = await token.allowance(admin.address, NEXUS_V2);
  const currentAllowanceStream = await token.allowance(admin.address, STREAM_V1);

  if (currentAllowanceNexus < totalNeeded) {
    console.log('Approving AlphaUSD for NexusV2...');
    const tx = await token.approve(NEXUS_V2, parseUnits(100000), TX_OPTS);
    await tx.wait();
    console.log('  ✅ NexusV2 approved:', tx.hash);
  } else {
    console.log('  ✅ NexusV2 already approved');
  }

  if (currentAllowanceStream < totalNeeded) {
    console.log('Approving AlphaUSD for StreamV1...');
    const tx = await token.approve(STREAM_V1, parseUnits(100000), TX_OPTS);
    await tx.wait();
    console.log('  ✅ StreamV1 approved:', tx.hash);
  } else {
    console.log('  ✅ StreamV1 already approved');
  }

  // ══════════════════════════════════════════
  // PHASE 2: Create & Settle NexusV2 Escrow Jobs
  // ══════════════════════════════════════════
  console.log('\n═══ PHASE 2: NexusV2 Escrow Jobs ═══');

  const completedJobs = [];

  for (let i = 0; i < JOB_SCENARIOS.length; i++) {
    const scenario = JOB_SCENARIOS[i];
    const agent = agentMap[scenario.agentName];
    if (!agent) {
      console.log(`  ⚠ Agent "${scenario.agentName}" not found, skipping`);
      continue;
    }

    const budgetUnits = parseUnits(scenario.budget);
    const clientWallet = CLIENT_WALLETS[i % CLIENT_WALLETS.length];
    const rating = Math.random() > 0.15 ? (Math.random() > 0.3 ? 5 : 4) : 3; // Mostly 4-5

    try {
      console.log(`\n  [${i + 1}/${JOB_SCENARIOS.length}] ${scenario.agentName} — $${scenario.budget}`);

      // 1. Create job (admin = employer, daemon = worker)
      console.log('    Creating escrow...');
      const createTx = await nexus.createJob(
        daemon.address,  // worker
        admin.address,   // judge
        TOKEN,           // token
        budgetUnits,     // amount
        86400 * 30,      // 30 day deadline
        TX_OPTS
      );
      const createReceipt = await createTx.wait();
      const jobCreatedEvent = createReceipt.logs.find(l => {
        try { return nexus.interface.parseLog(l)?.name === 'JobCreated'; } catch { return false; }
      });
      const onChainJobId = jobCreatedEvent
        ? Number(nexus.interface.parseLog(jobCreatedEvent).args[0])
        : i + 100;
      console.log('    ✅ Created on-chain job #' + onChainJobId, 'tx:', createTx.hash);

      // 2. Start job (worker)
      const startTx = await nexusDaemon.startJob(onChainJobId, TX_OPTS);
      await startTx.wait();
      console.log('    ✅ Job started');

      // 3. AI Proof: commit plan hash
      const planHash = randomHash();
      const commitTx = await aiProof.commit(planHash, onChainJobId, TX_OPTS);
      const commitReceipt = await commitTx.wait();
      const commitEvent = commitReceipt.logs.find(l => {
        try { return aiProof.interface.parseLog(l)?.name === 'CommitmentMade'; } catch { return false; }
      });
      const commitmentId = commitEvent
        ? aiProof.interface.parseLog(commitEvent).args[0]
        : randomHash();
      console.log('    ✅ AI Proof committed:', commitmentId.substring(0, 18) + '...');

      // 4. Complete job (worker)
      const completeTx = await nexusDaemon.completeJob(onChainJobId, TX_OPTS);
      await completeTx.wait();
      console.log('    ✅ Job completed');

      // 5. AI Proof: verify (match = planHash == resultHash for demo)
      const resultHash = Math.random() > 0.1 ? planHash : randomHash(); // 90% match
      const verifyTx = await aiProof.verify(commitmentId, resultHash, TX_OPTS);
      await verifyTx.wait();
      const proofMatched = resultHash === planHash;
      console.log('    ✅ AI Proof verified (matched:', proofMatched, ')');

      // 6. Settle job (employer)
      const settleTx = await nexus.settleJob(onChainJobId, TX_OPTS);
      const settleReceipt = await settleTx.wait();
      console.log('    ✅ Job settled, tx:', settleTx.hash);

      // 7. Rate worker (employer)
      const rateTx = await nexus.rateWorker(onChainJobId, rating, TX_OPTS);
      await rateTx.wait();
      console.log('    ✅ Worker rated:', rating, '/5');

      // Calculate negotiated price (budget - platform fee ~5%)
      const platformFee = scenario.budget * 0.05;
      const negotiatedPrice = scenario.budget - platformFee;

      // 8. Create DB AgentJob record
      const executionTime = Math.floor(Math.random() * 45) + 5; // 5-50 seconds
      const daysAgo = Math.floor(Math.random() * 28) + 1; // 1-28 days ago
      const createdAt = new Date(Date.now() - daysAgo * 86400_000);
      const completedAt = new Date(createdAt.getTime() + executionTime * 1000);

      const job = await prisma.agentJob.create({
        data: {
          agentId: agent.id,
          clientWallet,
          prompt: scenario.prompt,
          taskDescription: `${scenario.category} task for ${scenario.agentName}`,
          budget: scenario.budget,
          negotiatedPrice,
          platformFee,
          status: 'COMPLETED',
          result: JSON.stringify({
            data: { success: true, details: `${scenario.agentName} completed task successfully` },
          }),
          escrowTxHash: createTx.hash,
          settleTxHash: settleTx.hash,
          onChainJobId,
          executionTime,
          planHash,
          resultHash,
          commitmentId: commitmentId.toString(),
          commitTxHash: commitTx.hash,
          verifyTxHash: verifyTx.hash,
          proofMatched,
          createdAt,
          completedAt,
        },
      });

      completedJobs.push({ job, agent, scenario, rating, createdAt, completedAt });

      // Update agent stats
      await prisma.marketplaceAgent.update({
        where: { id: agent.id },
        data: {
          totalJobs: { increment: 1 },
          avgRating: rating,
          ratingCount: { increment: 1 },
          responseTime: executionTime,
        },
      });

      console.log('    ✅ DB record created:', job.id);
      await sleep(500); // Brief pause between transactions

    } catch (err) {
      console.error(`    ❌ Error for ${scenario.agentName}:`, err.message?.substring(0, 120));
    }
  }

  console.log(`\n  Total jobs created: ${completedJobs.length}`);

  // ══════════════════════════════════════════
  // PHASE 3: Stream Settlements
  // ══════════════════════════════════════════
  console.log('\n═══ PHASE 3: Stream Settlements ═══');

  const streamScenarios = [
    { agentName: 'Contract Deploy Pro', milestones: [500, 800, 700], desc: 'Full-stack DApp deployment with smart contracts' },
    { agentName: 'A2A Coordinator', milestones: [300, 400, 300], desc: 'Multi-agent security audit orchestration' },
    { agentName: 'Payroll Planner', milestones: [200, 200, 200, 200], desc: 'Quarterly payroll automation setup' },
    { agentName: 'Shield Executor', milestones: [400, 600], desc: 'ZK circuit integration for private payments' },
    { agentName: 'Token Deployer', milestones: [350, 350, 300], desc: 'Governance token launch with vesting' },
  ];

  for (let i = 0; i < streamScenarios.length; i++) {
    const s = streamScenarios[i];
    const agent = agentMap[s.agentName];
    if (!agent) continue;

    try {
      console.log(`\n  [${i + 1}/${streamScenarios.length}] Stream: ${s.desc}`);

      const amounts = s.milestones.map(a => parseUnits(a));
      const totalBudget = s.milestones.reduce((a, b) => a + b, 0);

      // Create stream on-chain
      const createTx = await stream.createStream(
        daemon.address, TOKEN, amounts, 86400 * 60, TX_OPTS
      );
      const receipt = await createTx.wait();
      const streamEvent = receipt.logs.find(l => {
        try { return stream.interface.parseLog(l)?.name === 'StreamCreated'; } catch { return false; }
      });
      const onChainStreamId = streamEvent
        ? Number(stream.interface.parseLog(streamEvent).args[0])
        : i + 50;
      console.log('    ✅ Stream created #' + onChainStreamId);

      // Create DB StreamJob
      const daysAgo = Math.floor(Math.random() * 20) + 3;
      const createdAt = new Date(Date.now() - daysAgo * 86400_000);
      const numApproved = Math.min(Math.floor(Math.random() * s.milestones.length) + 1, s.milestones.length);
      const releasedAmount = s.milestones.slice(0, numApproved).reduce((a, b) => a + b, 0);
      const isCompleted = numApproved === s.milestones.length;

      const streamJob = await prisma.streamJob.create({
        data: {
          clientWallet: admin.address,
          agentWallet: daemon.address,
          agentName: agent.name,
          totalBudget,
          releasedAmount,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
          onChainStreamId,
          streamTxHash: createTx.hash,
          deadline: new Date(Date.now() + 60 * 86400_000),
          createdAt,
        },
      });

      // Create milestones + on-chain submissions
      for (let m = 0; m < s.milestones.length; m++) {
        const proofHash = randomHash();
        let submitTxHash = null;
        let approveTxHash = null;
        let status = 'PENDING';

        if (m < numApproved) {
          // Submit milestone (worker)
          const subTx = await streamDaemon.submitMilestone(onChainStreamId, m, proofHash, TX_OPTS);
          await subTx.wait();
          submitTxHash = subTx.hash;

          // Approve milestone (client)
          const appTx = await stream.approveMilestone(onChainStreamId, m, TX_OPTS);
          await appTx.wait();
          approveTxHash = appTx.hash;
          status = 'APPROVED';

          console.log(`    ✅ Milestone ${m + 1} approved ($${s.milestones[m]})`);
        } else if (m === numApproved) {
          // One submitted but pending
          const subTx = await streamDaemon.submitMilestone(onChainStreamId, m, proofHash, TX_OPTS);
          await subTx.wait();
          submitTxHash = subTx.hash;
          status = 'SUBMITTED';
          console.log(`    ⏳ Milestone ${m + 1} submitted, awaiting review`);
        }

        await prisma.milestone.create({
          data: {
            streamJobId: streamJob.id,
            index: m,
            amount: s.milestones[m],
            deliverable: `Milestone ${m + 1}: ${s.desc} (phase ${m + 1})`,
            proofHash: status !== 'PENDING' ? proofHash : null,
            status,
            submitTxHash,
            approveTxHash,
            submittedAt: status !== 'PENDING' ? new Date(createdAt.getTime() + (m + 1) * 3 * 86400_000) : null,
            reviewedAt: status === 'APPROVED' ? new Date(createdAt.getTime() + (m + 1) * 3 * 86400_000 + 3600_000) : null,
            createdAt,
          },
        });
      }

      console.log(`    ✅ StreamJob ${streamJob.id} — $${releasedAmount}/$${totalBudget} released`);
      await sleep(500);

    } catch (err) {
      console.error(`    ❌ Stream error:`, err.message?.substring(0, 120));
    }
  }

  // ══════════════════════════════════════════
  // PHASE 4: Reviews & Notifications
  // ══════════════════════════════════════════
  console.log('\n═══ PHASE 4: Reviews, Notifications, PayoutRecords ═══');

  for (let i = 0; i < completedJobs.length; i++) {
    const { job, agent, rating, createdAt, completedAt } = completedJobs[i];

    // Create review
    await prisma.agentReview.create({
      data: {
        jobId: job.id,
        agentId: agent.id,
        rating,
        comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
        createdAt: new Date(completedAt.getTime() + 60_000),
      },
    });

    // Create payout record
    if (job.settleTxHash) {
      await prisma.payoutRecord.create({
        data: {
          recipient: daemon.address,
          amount: job.negotiatedPrice,
          token: 'AlphaUSD',
          txHash: job.settleTxHash,
          createdAt: completedAt,
        },
      });
    }

    // Create escrow yield
    await prisma.escrowYield.create({
      data: {
        jobId: job.id,
        principal: job.budget,
        apy: 5.0,
        yieldEarned: Math.round(job.budget * 0.05 * (Math.random() * 0.08 + 0.01) * 100) / 100,
        status: 'Settled',
        startedAt: createdAt,
        settledAt: completedAt,
        createdAt,
      },
    });

    // Notifications
    const wallet = CLIENT_WALLETS[i % CLIENT_WALLETS.length];
    await prisma.notification.createMany({
      data: [
        {
          wallet,
          type: 'job:completed',
          title: 'Job Completed',
          message: `${agent.name} completed your task successfully. AI Proof ${job.proofMatched ? 'matched' : 'pending review'}.`,
          isRead: Math.random() > 0.3,
          createdAt: completedAt,
        },
        {
          wallet,
          type: 'job:settled',
          title: 'Payment Settled',
          message: `$${job.negotiatedPrice.toFixed(2)} AlphaUSD released to ${agent.name} via NexusV2 escrow.`,
          isRead: Math.random() > 0.5,
          createdAt: new Date(completedAt.getTime() + 30_000),
        },
      ],
    });
  }

  console.log(`  ✅ ${completedJobs.length} reviews created`);
  console.log(`  ✅ ${completedJobs.length} payout records created`);
  console.log(`  ✅ ${completedJobs.length} escrow yields created`);
  console.log(`  ✅ ${completedJobs.length * 2} notifications created`);

  // ══════════════════════════════════════════
  // PHASE 5: Additional Audit Events
  // ══════════════════════════════════════════
  console.log('\n═══ PHASE 5: Audit Events ═══');

  const auditTypes = ['ESCROW_CREATED', 'ESCROW_SETTLED', 'AI_PROOF_COMMITTED', 'AI_PROOF_VERIFIED', 'MILESTONE_APPROVED', 'STREAM_CREATED', 'A2A_TRANSFER'];

  for (const { job, agent, scenario } of completedJobs) {
    for (const eventType of ['ESCROW_CREATED', 'AI_PROOF_COMMITTED', 'AI_PROOF_VERIFIED', 'ESCROW_SETTLED']) {
      await prisma.auditEvent.create({
        data: {
          agentId: agent.id,
          agentName: agent.name,
          eventType,
          title: `${eventType.replace(/_/g, ' ')} — Job #${job.onChainJobId}`,
          description: `${agent.name}: ${scenario.prompt.substring(0, 100)}`,
          txHash: eventType.includes('ESCROW') ? job.escrowTxHash : job.commitTxHash,
          severity: eventType.includes('SETTLED') ? 'SUCCESS' : 'INFO',
          createdAt: new Date(job.createdAt.getTime() + Math.random() * 86400_000),
        },
      });
    }
  }
  console.log(`  ✅ ${completedJobs.length * 4} audit events created`);

  // ══════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       SEEDING COMPLETE!               ║');
  console.log('╚══════════════════════════════════════╝');

  // Get final stats
  const aiStats = await aiProof.getStats();
  console.log('\nOn-chain AI Proof Stats:');
  console.log('  Total Commitments:', Number(aiStats[0]));
  console.log('  Total Verified:', Number(aiStats[1]));
  console.log('  Total Matched:', Number(aiStats[2]));
  console.log('  Total Mismatched:', Number(aiStats[3]));

  const finalBal = await token.balanceOf(admin.address);
  console.log('\nAdmin wallet remaining:', ethers.formatUnits(finalBal, 6), 'AlphaUSD');

  const jobCount = await prisma.agentJob.count();
  const reviewCount = await prisma.agentReview.count();
  console.log('\nDB Stats:');
  console.log('  AgentJobs:', jobCount);
  console.log('  AgentReviews:', reviewCount);

  await prisma.$disconnect();
  console.log('\nDone! Dashboard should now show real data.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
