#!/usr/bin/env node
/**
 * Production Agent Seeder — 32 Real On-Chain Agents
 *
 * Called automatically by Docker CMD on startup.
 * ALL agents execute real transactions on Tempo L1 (Chain 42431).
 * No fake/AI-only agents — every agent interacts with smart contracts.
 *
 * Uses upsert to safely re-run without duplicates.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WALLET = "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793";

const agents = [
  // ── Core Agents (Original 7) ──────────────────────────────

  { name: "Escrow Manager", description: "Creates and manages NexusV2 escrow jobs on Tempo L1. Locks funds trustlessly with full lifecycle: create → start → complete → settle → refund. Real on-chain execution with tx hashes.", category: "escrow", skills: '["escrow","create-job","settle","refund","nexus","on-chain"]', basePrice: 5, nativeAgentId: "escrow-manager", ownerWallet: WALLET, avatarEmoji: "\u{1F512}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 15 },

  { name: "Shield Executor", description: "ZK-SNARK shielded payment agent using PLONK proofs with Poseidon hashing. Generates zero-knowledge proofs and executes private payments through ShieldVaultV2 on Tempo L1.", category: "privacy", skills: '["zk-proof","plonk","poseidon","shielded-payment","privacy","on-chain"]', basePrice: 10, nativeAgentId: "shield-executor", ownerWallet: WALLET, avatarEmoji: "\u{1F6E1}\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 30 },

  { name: "Payroll Planner", description: "Intelligent batch payroll executor. Plans and executes multi-recipient disbursements through MultisendVault with gas optimization. Real on-chain batch payments on Tempo L1.", category: "payroll", skills: '["payroll","batch","multisend","salary","payment","on-chain"]', basePrice: 8, nativeAgentId: "payroll-planner", ownerWallet: WALLET, avatarEmoji: "\u{1F4CA}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 10 },

  { name: "Token Deployer", description: "End-to-end ERC-20 token deployment on Tempo L1. AI designs tokenomics, generates audited Solidity, and deploys contracts with real on-chain verification.", category: "deployment", skills: '["deploy","token","erc20","solidity","tokenomics","on-chain"]', basePrice: 15, nativeAgentId: "token-deployer", ownerWallet: WALLET, avatarEmoji: "\u{1F680}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 45 },

  { name: "Contract Deploy Pro", description: "Production smart contract deployment and verification. AI audits code, compiles Solidity, and deploys to Tempo L1 with on-chain verification via Sourcify.", category: "deployment", skills: '["deploy","smart-contract","verify","audit","solidity","on-chain"]', basePrice: 20, nativeAgentId: "contract-deploy-pro", ownerWallet: WALLET, avatarEmoji: "\u2699\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 60 },

  { name: "A2A Coordinator", description: "Agent-to-Agent orchestration engine. Decomposes complex tasks into multi-step plans, hires specialized agents, and manages execution chains with NexusV2 escrows.", category: "orchestration", skills: '["a2a","coordinator","multi-agent","orchestration","escrow","on-chain"]', basePrice: 20, nativeAgentId: "coordinator", ownerWallet: WALLET, avatarEmoji: "\u{1F3AF}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 120 },

  { name: "Tempo Benchmark", description: "Automated cost comparison between Tempo L1 and Ethereum mainnet. Executes 5 real operations (transfer, escrow, settlement, batch, proof commit) and calculates savings.", category: "analytics", skills: '["benchmark","gas-cost","tempo-vs-eth","comparison","analytics","on-chain"]', basePrice: 5, nativeAgentId: "tempo-benchmark", ownerWallet: WALLET, avatarEmoji: "\u{1F3CE}\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 30 },

  // ── New On-Chain Agents (10) ──────────────────────────────

  { name: "Token Transfer", description: "Direct ERC20 token transfers on Tempo L1. Supports AlphaUSD, pathUSD, BetaUSD, and ThetaUSD. AI parses natural language transfer requests and executes real on-chain transactions.", category: "payments", skills: '["transfer","erc20","send","payment","multi-token","on-chain"]', basePrice: 2, nativeAgentId: "token-transfer", ownerWallet: WALLET, avatarEmoji: "\u{1F4B8}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 8 },

  { name: "Stream Creator", description: "Creates milestone-based payment streams on PayPolStreamV1. AI breaks job descriptions into milestones with budgets, then deploys progressive escrow streams on-chain.", category: "streams", skills: '["stream","milestone","progressive-escrow","create","budget","on-chain"]', basePrice: 8, nativeAgentId: "stream-creator", ownerWallet: WALLET, avatarEmoji: "\u{1F4A7}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 20 },

  { name: "Stream Manager", description: "Manages PayPolStreamV1 lifecycle — submit milestones with proof hashes, approve/reject deliverables, cancel streams, check on-chain status. Full stream lifecycle management.", category: "streams", skills: '["stream","milestone","submit","approve","reject","cancel","on-chain"]', basePrice: 5, nativeAgentId: "stream-manager", ownerWallet: WALLET, avatarEmoji: "\u{1F3D7}\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 12 },

  { name: "Vault Depositor", description: "Manages ShieldVaultV2 operations — deposit funds and execute public (non-ZK) payouts. For transparent vault transactions on Tempo L1 with real on-chain execution.", category: "privacy", skills: '["vault","deposit","payout","shield-vault","transparent","on-chain"]', basePrice: 5, nativeAgentId: "vault-depositor", ownerWallet: WALLET, avatarEmoji: "\u{1F3E6}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 15 },

  { name: "Multisend Batch", description: "Execute batch token transfers via MultisendVaultV2. Send payments to multiple recipients in a single gas-efficient on-chain transaction. Up to 50 recipients per batch.", category: "payments", skills: '["batch","multisend","bulk-transfer","gas-efficient","payment","on-chain"]', basePrice: 8, nativeAgentId: "multisend-batch", ownerWallet: WALLET, avatarEmoji: "\u{1F4E6}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 15 },

  { name: "Proof Verifier", description: "On-chain AI proof commitment and verification via AIProofRegistry. Two-phase: commit plan hash before execution, verify result hash after. Ensures AI accountability with immutable proofs.", category: "verification", skills: '["proof","commit","verify","ai-proof","accountability","on-chain"]', basePrice: 3, nativeAgentId: "proof-verifier", ownerWallet: WALLET, avatarEmoji: "\u2705", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 10 },

  { name: "Allowance Manager", description: "Manage ERC20 token allowances for all PayPol contracts. Check, approve, and revoke permissions for NexusV2, ShieldVaultV2, MultisendV2, and StreamV1. On-chain security management.", category: "security", skills: '["allowance","approve","revoke","erc20","security","on-chain"]', basePrice: 2, nativeAgentId: "allowance-manager", ownerWallet: WALLET, avatarEmoji: "\u{1F510}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 8 },

  { name: "Balance Scanner", description: "Comprehensive on-chain portfolio scanner. Reads wallet balances across all PayPol tokens (AlphaUSD, pathUSD, BetaUSD, ThetaUSD), checks contract allowances, and provides portfolio analytics.", category: "analytics", skills: '["balance","portfolio","scan","multi-token","analytics","on-chain"]', basePrice: 2, nativeAgentId: "balance-scanner", ownerWallet: WALLET, avatarEmoji: "\u{1F50D}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 5 },

  { name: "Fee Collector", description: "Collects accumulated platform fees from PayPol smart contracts (NexusV2, MultisendV2, StreamV1). Admin operation that withdraws protocol revenue with real on-chain execution.", category: "admin", skills: '["fees","collect","withdraw","revenue","admin","on-chain"]', basePrice: 3, nativeAgentId: "fee-collector", ownerWallet: WALLET, avatarEmoji: "\u{1F4B0}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 20 },

  { name: "Escrow Lifecycle", description: "Manages NexusV2 escrow job progression — start execution, mark jobs complete, and rate workers. Handles mid-lifecycle steps complementing the Escrow Manager. Real on-chain execution.", category: "escrow", skills: '["escrow","start-job","complete","rate","lifecycle","on-chain"]', basePrice: 3, nativeAgentId: "escrow-lifecycle", ownerWallet: WALLET, avatarEmoji: "\u{1F504}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 10 },

  // ── On-Chain Agents Wave 2 (15) ─────────────────────────

  { name: "Multi Token Sender", description: "Send multiple different token types to a single recipient in one operation. AI parses 'send 100 AlphaUSD and 50 BetaUSD to 0x...' and executes each transfer on-chain. Tempo L1.", category: "payments", skills: '["multi-token","transfer","batch-send","erc20","payment","on-chain"]', basePrice: 3, nativeAgentId: "multi-token-sender", ownerWallet: WALLET, avatarEmoji: "\u{1F4B3}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 12 },

  { name: "Escrow Dispute", description: "NexusV2 dispute resolution agent. Raise disputes on active escrows, check timeout status, and claim timed-out refunds. AI-powered dispute management with real on-chain execution.", category: "escrow", skills: '["dispute","timeout","refund","nexus","resolution","on-chain"]', basePrice: 5, nativeAgentId: "escrow-dispute", ownerWallet: WALLET, avatarEmoji: "\u2696\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 10 },

  { name: "Stream Inspector", description: "Deep on-chain stream analysis for PayPolStreamV1. Reads stream state, milestone statuses, payment progress, and deadline info. Comprehensive stream analytics from Tempo L1.", category: "analytics", skills: '["stream","inspect","milestone","analysis","read","on-chain"]', basePrice: 2, nativeAgentId: "stream-inspector", ownerWallet: WALLET, avatarEmoji: "\u{1F50E}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 8 },

  { name: "Treasury Manager", description: "All-in-one treasury overview — native ETH balance, all token holdings, contract allowances, NexusV2 stats, MultisendV2 batches, stream counts, and AI proof stats. Real on-chain reads.", category: "analytics", skills: '["treasury","portfolio","overview","balance","analytics","on-chain"]', basePrice: 3, nativeAgentId: "treasury-manager", ownerWallet: WALLET, avatarEmoji: "\u{1F3DB}\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 10 },

  { name: "Bulk Escrow", description: "Batch-create multiple NexusV2 escrow jobs at once. AI parses lists of workers with budgets and creates all escrows sequentially on-chain. Ideal for hiring multiple agents.", category: "escrow", skills: '["bulk","batch-create","escrow","nexus","multi-job","on-chain"]', basePrice: 12, nativeAgentId: "bulk-escrow", ownerWallet: WALLET, avatarEmoji: "\u{1F4DA}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 30 },

  { name: "Multi Token Batch", description: "Execute MultisendV2 batch payments with any supported token (AlphaUSD, pathUSD, BetaUSD, ThetaUSD). AI parses token choice and recipient list for gas-efficient on-chain batch transfers.", category: "payments", skills: '["batch","multisend","multi-token","bulk-payment","flexible","on-chain"]', basePrice: 8, nativeAgentId: "multi-token-batch", ownerWallet: WALLET, avatarEmoji: "\u{1F4E8}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 15 },

  { name: "Proof Auditor", description: "Deep audit of AIProofRegistry on-chain data. Reads total commitments, verification rates, individual proof records, and agent accountability scores. Comprehensive AI proof analytics.", category: "verification", skills: '["audit","proof","registry","accountability","verification","on-chain"]', basePrice: 3, nativeAgentId: "proof-auditor", ownerWallet: WALLET, avatarEmoji: "\u{1F9D0}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 8 },

  { name: "Vault Inspector", description: "Inspect ShieldVaultV2 on-chain state — total deposits, commitment records, nullifier checks, and vault balance. Verifies zero-knowledge proof infrastructure on Tempo L1.", category: "privacy", skills: '["vault","inspect","shield","zk-state","commitment","on-chain"]', basePrice: 2, nativeAgentId: "vault-inspector", ownerWallet: WALLET, avatarEmoji: "\u{1F575}\uFE0F", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 8 },

  { name: "Gas Profiler", description: "Profile gas costs of individual PayPol operations on Tempo L1. Measures real gas usage for transfers, escrows, batch sends, stream operations, and proof commits. Cost optimization tool.", category: "analytics", skills: '["gas","profiler","cost","benchmark","optimization","on-chain"]', basePrice: 3, nativeAgentId: "gas-profiler", ownerWallet: WALLET, avatarEmoji: "\u26FD", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 25 },

  { name: "Recurring Payment", description: "Set up recurring scheduled payments as multiple payment streams on PayPolStreamV1. AI parses payment schedules and creates milestone-based streams for each period. On-chain automation.", category: "payments", skills: '["recurring","schedule","stream","subscription","automated","on-chain"]', basePrice: 10, nativeAgentId: "recurring-payment", ownerWallet: WALLET, avatarEmoji: "\u{1F4C5}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 25 },

  { name: "Contract Reader", description: "Read all PayPol smart contract states comprehensively. NexusV2 jobs, MultisendV2 batches, StreamV1 streams, worker ratings, and AI proof stats. Complete on-chain data dashboard.", category: "analytics", skills: '["contract","read","state","jobs","batches","on-chain"]', basePrice: 2, nativeAgentId: "contract-reader", ownerWallet: WALLET, avatarEmoji: "\u{1F4D6}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 10 },

  { name: "Wallet Sweeper", description: "Emergency token sweep — transfers all supported token balances (AlphaUSD, pathUSD, BetaUSD, ThetaUSD) to a safe wallet address. For emergency recovery or wallet migration. Real on-chain.", category: "security", skills: '["sweep","emergency","recovery","migration","transfer","on-chain"]', basePrice: 5, nativeAgentId: "wallet-sweeper", ownerWallet: WALLET, avatarEmoji: "\u{1F9F9}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 15 },

  { name: "Escrow Batch Settler", description: "Batch settle or refund multiple NexusV2 escrow jobs at once. Process up to 20 job completions in a single operation. AI parses intent and executes real on-chain settlements.", category: "escrow", skills: '["batch-settle","batch-refund","multi-escrow","bulk","settlement","on-chain"]', basePrice: 8, nativeAgentId: "escrow-batch-settler", ownerWallet: WALLET, avatarEmoji: "\u{1F4CB}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 20 },

  { name: "Token Minter", description: "Deploy custom ERC20 tokens with fine-grained control. Set name, symbol, decimals, and initial supply. AI parses token parameters and deploys real contracts on Tempo L1.", category: "deployment", skills: '["mint","deploy","erc20","custom-token","create","on-chain"]', basePrice: 10, nativeAgentId: "token-minter", ownerWallet: WALLET, avatarEmoji: "\u{1F3ED}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 30 },

  { name: "Chain Monitor", description: "Monitor Tempo L1 chain health and activity. Tracks block times, transaction throughput, contract activity counters (jobs, batches, streams, proofs), and network health diagnostics.", category: "analytics", skills: '["monitor","chain-health","block-time","throughput","diagnostics","on-chain"]', basePrice: 2, nativeAgentId: "chain-monitor", ownerWallet: WALLET, avatarEmoji: "\u{1F4E1}", isVerified: true, totalJobs: 0, successRate: 100, avgRating: 5.0, ratingCount: 0, responseTime: 8 },
];

async function seed() {
  // Clear old fake agents and reseed with real ones
  console.log(`[seed] Clearing old data and seeding ${agents.length} real on-chain agents...`);

  // Delete dependent records first (foreign key constraints)
  await prisma.agentReview.deleteMany({});
  await prisma.agentJob.deleteMany({});
  // Delete all existing agents (clean slate)
  await prisma.marketplaceAgent.deleteMany({});

  for (const agent of agents) {
    await prisma.marketplaceAgent.upsert({
      where: { name: agent.name },
      create: agent,
      update: {
        description: agent.description,
        category: agent.category,
        skills: agent.skills,
        basePrice: agent.basePrice,
        nativeAgentId: agent.nativeAgentId,
        isVerified: agent.isVerified,
      },
    });
  }
  const total = await prisma.marketplaceAgent.count();
  console.log(`[seed] Done! ${total} real on-chain agents in marketplace.`);
}

seed()
  .catch(e => console.error('[seed] Error:', e.message))
  .finally(() => prisma.$disconnect());
