#!/usr/bin/env node
/**
 * Production Agent Seeder — Plain JS (no TypeScript dependency)
 *
 * Called automatically by Docker CMD on startup.
 * Uses upsert to safely re-run without duplicates.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WALLET = "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793";

const agents = [
  { name: "Certi-Audit Pro", description: "Enterprise-grade smart contract security auditor powered by Claude AI. Detects reentrancy, overflow, access control vulnerabilities, and 50+ known exploit patterns.", category: "security", skills: '["audit","security","solidity","reentrancy","vulnerability","smart-contract"]', basePrice: 300, nativeAgentId: "contract-auditor", ownerWallet: WALLET, avatarEmoji: "\u{1F6E1}\uFE0F", isVerified: true, totalJobs: 127, successRate: 98.4, avgRating: 4.9, ratingCount: 89, responseTime: 15 },
  { name: "Omnichain Yield Farmer", description: "AI-powered DeFi yield optimization engine. Analyzes liquidity pools, staking opportunities, and farming strategies across multiple chains.", category: "defi", skills: '["yield","farm","liquidity","pool","stake","apy","defi"]', basePrice: 75, nativeAgentId: "yield-optimizer", ownerWallet: WALLET, avatarEmoji: "\u{1F33E}", isVerified: true, totalJobs: 234, successRate: 95.7, avgRating: 4.7, ratingCount: 156, responseTime: 20 },
  { name: "PayPol Payroll Planner", description: "Intelligent payroll optimization agent. Plans batch disbursements, analyzes gas costs, and generates payment schedules.", category: "payroll", skills: '["payroll","salary","batch","gas","schedule","payment"]', basePrice: 50, nativeAgentId: "payroll-planner", ownerWallet: WALLET, avatarEmoji: "\u{1F4CA}", isVerified: true, totalJobs: 312, successRate: 99.1, avgRating: 4.8, ratingCount: 201, responseTime: 10 },
  { name: "Gas Oracle Predictor", description: "Real-time gas price prediction and transaction timing optimizer. Uses historical data patterns and mempool analysis.", category: "analytics", skills: '["gas","predict","timing","mempool","cost","analytics"]', basePrice: 25, nativeAgentId: "gas-predictor", ownerWallet: WALLET, avatarEmoji: "\u26FD", isVerified: true, totalJobs: 589, successRate: 97.3, avgRating: 4.6, ratingCount: 342, responseTime: 5 },
  { name: "Flash Arbitrage Sniper", description: "Scans DEX volumes and token prices across chains to identify arbitrage opportunities using DeFiLlama + CoinGecko data.", category: "defi", skills: '["arbitrage","flashloan","mev","trade","snipe","dex"]', basePrice: 250, nativeAgentId: "arbitrage-scanner", ownerWallet: WALLET, avatarEmoji: "\u26A1", isVerified: true, totalJobs: 67, successRate: 91.0, avgRating: 4.5, ratingCount: 45, responseTime: 8 },
  { name: "LegalEase Compliance Bot", description: "AI-powered crypto regulatory compliance advisor. Analyzes tax obligations, licensing requirements, and KYC/AML rules.", category: "compliance", skills: '["tax","legal","compliance","law","regulation","audit"]', basePrice: 150, nativeAgentId: "compliance-advisor", ownerWallet: WALLET, avatarEmoji: "\u2696\uFE0F", isVerified: true, totalJobs: 43, successRate: 96.5, avgRating: 4.8, ratingCount: 31, responseTime: 45 },
  { name: "NFT Forensics Investigator", description: "Investigates NFT collections for wash trading, suspicious activity, and provenance analysis using on-chain data.", category: "security", skills: '["nft","forensics","investigate","stolen","provenance"]', basePrice: 200, nativeAgentId: "nft-forensics", ownerWallet: WALLET, avatarEmoji: "\u{1F50D}", isVerified: true, totalJobs: 28, successRate: 89.3, avgRating: 4.4, ratingCount: 19, responseTime: 60 },
  { name: "Bridge Guardian", description: "Analyzes cross-chain bridge protocols for security, fees, and speed using DeFiLlama bridge data.", category: "security", skills: '["bridge","cross-chain","multichain","transfer","routing"]', basePrice: 180, nativeAgentId: "bridge-analyzer", ownerWallet: WALLET, avatarEmoji: "\u{1F309}", isVerified: true, totalJobs: 51, successRate: 94.1, avgRating: 4.3, ratingCount: 34, responseTime: 25 },
  { name: "DAO Governance Advisor", description: "Analyzes DAO proposals, voting patterns, and governance health using Snapshot data.", category: "governance", skills: '["dao","governance","voting","proposal","token","treasury"]', basePrice: 120, nativeAgentId: "dao-advisor", ownerWallet: WALLET, avatarEmoji: "\u{1F3DB}\uFE0F", isVerified: true, totalJobs: 19, successRate: 100.0, avgRating: 4.7, ratingCount: 12, responseTime: 35 },
  { name: "Sentinel Risk Analyzer", description: "Comprehensive DeFi portfolio risk analysis using DeFiLlama protocol data, TVL trends, and stablecoin metrics.", category: "analytics", skills: '["risk","portfolio","liquidation","monitor","tvl","exposure"]', basePrice: 200, nativeAgentId: "risk-analyzer", ownerWallet: WALLET, avatarEmoji: "\u{1F514}", isVerified: true, totalJobs: 76, successRate: 93.4, avgRating: 4.5, ratingCount: 52, responseTime: 12 },
  { name: "CryptoTax Navigator", description: "Comprehensive crypto tax calculation and reporting agent. Analyzes wallet history across chains and generates tax-ready reports.", category: "tax", skills: '["tax","report","capital-gains","cost-basis","fifo","airdrop"]', basePrice: 175, nativeAgentId: "tax-navigator", ownerWallet: WALLET, avatarEmoji: "\u{1F9FE}", isVerified: true, totalJobs: 89, successRate: 97.2, avgRating: 4.7, ratingCount: 62, responseTime: 30 },
  { name: "AlphaBalance Portfolio AI", description: "AI portfolio management agent. Recommends rebalancing strategies based on risk tolerance and market conditions.", category: "analytics", skills: '["portfolio","rebalance","allocation","diversify","risk"]', basePrice: 120, nativeAgentId: "portfolio-rebalancer", ownerWallet: WALLET, avatarEmoji: "\u{1F4CA}", isVerified: true, totalJobs: 156, successRate: 94.8, avgRating: 4.6, ratingCount: 108, responseTime: 20 },
  { name: "LaunchPad Token Deployer", description: "End-to-end ERC-20/ERC-721 token deployment assistant. Generates audited Solidity contracts with configurable tokenomics.", category: "deployment", skills: '["deploy","token","erc20","erc721","launch","tokenomics"]', basePrice: 350, nativeAgentId: "token-deployer", ownerWallet: WALLET, avatarEmoji: "\u{1F680}", isVerified: true, totalJobs: 34, successRate: 100.0, avgRating: 4.9, ratingCount: 28, responseTime: 45 },
  { name: "AirdropScan Tracker", description: "Monitors and tracks airdrop eligibility across protocols. Analyzes wallet activity against known airdrop criteria.", category: "defi", skills: '["airdrop","claim","eligibility","farming","distribution"]', basePrice: 60, nativeAgentId: "airdrop-tracker", ownerWallet: WALLET, avatarEmoji: "\u{1FA82}", isVerified: true, totalJobs: 421, successRate: 92.4, avgRating: 4.4, ratingCount: 289, responseTime: 15 },
  { name: "MEV Sentinel Shield", description: "Protects transactions from MEV attacks including front-running and sandwich attacks. Analyzes mempool exposure.", category: "security", skills: '["mev","frontrun","sandwich","flashbots","mempool","protection"]', basePrice: 90, nativeAgentId: "mev-shield", ownerWallet: WALLET, avatarEmoji: "\u{1F530}", isVerified: true, totalJobs: 203, successRate: 96.1, avgRating: 4.7, ratingCount: 145, responseTime: 8 },
  { name: "LiquidityOps Manager", description: "Manages concentrated liquidity positions on Uniswap V3/V4, Curve, and other AMMs.", category: "defi", skills: '["liquidity","amm","uniswap","curve","concentrated","lp"]', basePrice: 140, nativeAgentId: "liquidity-manager", ownerWallet: WALLET, avatarEmoji: "\u{1F4A7}", isVerified: true, totalJobs: 167, successRate: 93.4, avgRating: 4.5, ratingCount: 112, responseTime: 18 },
  { name: "WhaleAlert Intelligence", description: "Tracks large wallet movements and whale accumulation/distribution patterns in real-time.", category: "analytics", skills: '["whale","tracking","smart-money","exchange-flow","accumulation"]', basePrice: 80, nativeAgentId: "whale-watcher", ownerWallet: WALLET, avatarEmoji: "\u{1F40B}", isVerified: true, totalJobs: 312, successRate: 95.5, avgRating: 4.6, ratingCount: 215, responseTime: 10 },
  { name: "SentiChain Social Radar", description: "Analyzes crypto social sentiment across Twitter/X, Discord, Telegram, and governance forums.", category: "analytics", skills: '["sentiment","social","twitter","discord","telegram","nlp"]', basePrice: 65, nativeAgentId: "sentiment-analyzer", ownerWallet: WALLET, avatarEmoji: "\u{1F4E1}", isVerified: true, totalJobs: 245, successRate: 91.8, avgRating: 4.3, ratingCount: 178, responseTime: 12 },
  { name: "OmniBridge Router", description: "Finds the cheapest, fastest, and safest bridge route for any cross-chain transfer across 20+ protocols.", category: "defi", skills: '["bridge","cross-chain","route","transfer","l2","rollup"]', basePrice: 40, nativeAgentId: "bridge-optimizer", ownerWallet: WALLET, avatarEmoji: "\u{1F517}", isVerified: true, totalJobs: 534, successRate: 97.6, avgRating: 4.8, ratingCount: 398, responseTime: 6 },
  { name: "NFT Appraisal Engine", description: "Estimates fair market value of NFTs using rarity analysis, floor price trends, and trait distribution.", category: "nft", skills: '["nft","valuation","appraisal","rarity","floor-price","collection"]', basePrice: 100, nativeAgentId: "nft-valuator", ownerWallet: WALLET, avatarEmoji: "\u{1F3A8}", isVerified: true, totalJobs: 98, successRate: 88.8, avgRating: 4.2, ratingCount: 67, responseTime: 25 },
  { name: "ProposalForge Writer", description: "Drafts professional DAO governance proposals from natural language descriptions. Structures for Snapshot or Tally.", category: "governance", skills: '["proposal","governance","dao","draft","snapshot","tally"]', basePrice: 85, nativeAgentId: "proposal-writer", ownerWallet: WALLET, avatarEmoji: "\u{1F4DD}", isVerified: true, totalJobs: 56, successRate: 98.2, avgRating: 4.8, ratingCount: 42, responseTime: 40 },
  { name: "VestingVault Planner", description: "Designs and audits token vesting schedules for teams, investors, and advisors.", category: "compliance", skills: '["vesting","unlock","cliff","schedule","tokenomics","supply"]', basePrice: 130, nativeAgentId: "vesting-planner", ownerWallet: WALLET, avatarEmoji: "\u{1F512}", isVerified: true, totalJobs: 41, successRate: 100.0, avgRating: 4.9, ratingCount: 35, responseTime: 35 },
  { name: "InsureGuard DeFi Cover", description: "Finds and compares DeFi insurance products across Nexus Mutual, InsurAce, and other providers.", category: "defi", skills: '["insurance","cover","nexus-mutual","premium","claim","protection"]', basePrice: 70, nativeAgentId: "insurance-finder", ownerWallet: WALLET, avatarEmoji: "\u{1F3E5}", isVerified: true, totalJobs: 73, successRate: 95.9, avgRating: 4.5, ratingCount: 49, responseTime: 20 },
  { name: "ContractDeploy Pro", description: "Deploys and verifies pre-audited smart contract templates to any EVM chain. Handles gas estimation and verification.", category: "deployment", skills: '["deploy","smart-contract","verify","multisig","vault","proxy"]', basePrice: 280, nativeAgentId: "contract-deployer", ownerWallet: WALLET, avatarEmoji: "\u2699\uFE0F", isVerified: true, totalJobs: 22, successRate: 100.0, avgRating: 4.9, ratingCount: 18, responseTime: 60 },
];

async function seed() {
  const count = await prisma.marketplaceAgent.count();
  if (count >= agents.length) {
    console.log(`[seed] ${count} agents already exist — skipping`);
    return;
  }

  console.log(`[seed] Seeding ${agents.length} marketplace agents...`);
  for (const agent of agents) {
    await prisma.marketplaceAgent.upsert({
      where: { name: agent.name },
      create: agent,
      update: {
        description: agent.description,
        category: agent.category,
        skills: agent.skills,
        basePrice: agent.basePrice,
        isVerified: agent.isVerified,
      },
    });
  }
  const total = await prisma.marketplaceAgent.count();
  console.log(`[seed] Done! ${total} agents in marketplace.`);
}

seed()
  .catch(e => console.error('[seed] Error:', e.message))
  .finally(() => prisma.$disconnect());
