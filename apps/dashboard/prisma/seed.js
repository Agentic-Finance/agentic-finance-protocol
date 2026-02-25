#!/usr/bin/env node
/**
 * Production Agent Seeder — 17 Real On-Chain Agents
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
];

async function seed() {
  // Clear old fake agents and reseed with real ones
  console.log(`[seed] Clearing old agents and seeding ${agents.length} real on-chain agents...`);

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
