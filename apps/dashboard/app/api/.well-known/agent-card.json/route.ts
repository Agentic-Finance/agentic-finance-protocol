/**
 * GET /.well-known/agent-card.json
 *
 * Google A2A Protocol — Agent Card Discovery Endpoint
 *
 * Returns the Agentic Finance Agent Card following the A2A specification.
 * External AI agents can discover Agentic Finance's 32 on-chain agents,
 * their capabilities, pricing, and connection details.
 *
 * Spec: https://a2a-protocol.org/latest/specification/
 */

import { NextResponse } from 'next/server';
import {
  A2AAgentCard,
  agentToA2ASkill,
} from '@/app/lib/a2a-protocol';

// Agent manifests — mirrors the native agent service registry
const AGENT_MANIFESTS = [
  // Core Agents
  { id: 'escrow-manager',       name: 'Escrow Manager',         description: 'Full NexusV2 escrow lifecycle — create jobs, settle payments, refund employers. Trustless on-chain payment arbitration.',                                    category: 'escrow',       price: 5,  capabilities: ['create-escrow', 'settle-escrow', 'refund-escrow', 'on-chain-execution'] },
  { id: 'shield-executor',      name: 'Shield Executor',        description: 'ZK-SNARK PLONK shielded payments via ShieldVaultV2. Real Circom V2 + Poseidon proofs for private transactions.',                                            category: 'security',     price: 10, capabilities: ['zk-proof', 'shielded-payment', 'deposit', 'poseidon-hash'] },
  { id: 'payroll-planner',      name: 'Payroll Planner',        description: 'AI-powered batch payroll planning and execution via MultisendVaultV2. Calculates taxes, deductions, and net pay.',                                           category: 'payroll',      price: 8,  capabilities: ['payroll-planning', 'batch-payment', 'tax-calculation', 'on-chain-execution'] },
  { id: 'token-deployer',       name: 'Token Deployer',         description: 'Deploy ERC-20 tokens on Tempo L1 with custom parameters. Full verified deployment with explorer links.',                                                     category: 'deployment',   price: 5,  capabilities: ['token-deployment', 'erc20', 'contract-creation'] },
  { id: 'contract-deploy-pro',  name: 'Contract Deploy Pro',    description: 'Deploy production-ready smart contracts on Tempo L1 with constructor args and verification.',                                                                 category: 'deployment',   price: 15, capabilities: ['contract-deployment', 'constructor-args', 'verification'] },
  { id: 'coordinator-agent',    name: 'A2A Coordinator',        description: 'Agent-to-Agent task orchestration. Decomposes complex tasks into sub-tasks, assigns to specialist agents, manages dependency graphs.',                        category: 'analytics',    price: 5,  capabilities: ['task-decomposition', 'agent-routing', 'dependency-graph', 'a2a-orchestration'] },
  { id: 'tempo-benchmark',      name: 'Tempo Benchmark',        description: 'Gas cost benchmarking comparing Tempo L1 vs Ethereum mainnet for all Agentic Finance operations.',                                                                    category: 'analytics',    price: 2,  capabilities: ['gas-benchmark', 'cost-analysis', 'chain-comparison'] },
  // Wave 1
  { id: 'token-transfer',       name: 'Token Transfer',         description: 'Direct ERC20 token transfers on Tempo L1. Single transfers with amount validation.',                                                                         category: 'defi',         price: 2,  capabilities: ['token-transfer', 'erc20', 'on-chain-execution'] },
  { id: 'stream-creator',       name: 'Stream Creator',         description: 'Create milestone-based payment streams via StreamV1. Progressive escrow with multi-milestone support.',                                                       category: 'stream',       price: 5,  capabilities: ['stream-creation', 'milestone-escrow', 'progressive-payment'] },
  { id: 'stream-manager',       name: 'Stream Manager',         description: 'Manage stream lifecycle — submit milestones, approve/reject, cancel streams. Full StreamV1 operations.',                                                      category: 'stream',       price: 3,  capabilities: ['milestone-submit', 'milestone-approve', 'stream-cancel'] },
  { id: 'vault-depositor',      name: 'Vault Depositor',        description: 'ShieldVaultV2 deposit and public payout operations. Fund ZK vaults for shielded payments.',                                                                   category: 'defi',         price: 3,  capabilities: ['vault-deposit', 'public-payout', 'shield-vault'] },
  { id: 'multisend-batch',      name: 'Multisend Batch',        description: 'Batch payment execution via MultisendVaultV2. Send to multiple recipients in one transaction.',                                                               category: 'payroll',      price: 5,  capabilities: ['batch-payment', 'multisend', 'on-chain-execution'] },
  { id: 'proof-verifier',       name: 'Proof Verifier',         description: 'AI proof commitment and verification via AIProofRegistry. Ensures AI accountability with on-chain proofs.',                                                   category: 'verification', price: 3,  capabilities: ['proof-commit', 'proof-verify', 'ai-accountability'] },
  { id: 'allowance-manager',    name: 'Allowance Manager',      description: 'ERC20 approval management for all Agentic Finance contracts. Set, check, and revoke token allowances.',                                                                category: 'defi',         price: 2,  capabilities: ['erc20-approve', 'allowance-check', 'allowance-revoke'] },
  { id: 'balance-scanner',      name: 'Balance Scanner',        description: 'Multi-token portfolio scanner. Checks balances across all supported tokens on Tempo L1.',                                                                     category: 'analytics',    price: 2,  capabilities: ['balance-check', 'portfolio-scan', 'multi-token'] },
  { id: 'fee-collector',        name: 'Fee Collector',          description: 'Platform fee collection from NexusV2, StreamV1, and other Agentic Finance contracts.',                                                                                 category: 'treasury',     price: 3,  capabilities: ['fee-collection', 'platform-revenue'] },
  { id: 'escrow-lifecycle',     name: 'Escrow Lifecycle',       description: 'NexusV2 job progression — start execution, mark complete, rate workers. Mid-lifecycle escrow management.',                                                     category: 'escrow',       price: 3,  capabilities: ['start-job', 'complete-job', 'rate-worker', 'job-status'] },
  // Wave 2
  { id: 'multi-token-sender',   name: 'Multi Token Sender',     description: 'Send multiple token types to a single recipient in separate transactions.',                                                                                   category: 'defi',         price: 3,  capabilities: ['multi-token-transfer', 'batch-send'] },
  { id: 'escrow-dispute',       name: 'Escrow Dispute',         description: 'NexusV2 dispute resolution and timeout claims. Raise disputes, check timeouts, claim expired escrows.',                                                       category: 'escrow',       price: 5,  capabilities: ['dispute-job', 'claim-timeout', 'check-timeout'] },
  { id: 'stream-inspector',     name: 'Stream Inspector',       description: 'Deep on-chain stream and milestone analysis. Inspect StreamV1 state and history.',                                                                            category: 'stream',       price: 2,  capabilities: ['stream-inspect', 'milestone-detail', 'on-chain-read'] },
  { id: 'treasury-manager',     name: 'Treasury Manager',       description: 'All-in-one treasury overview — balances, deposits, fees, escrow states across all Agentic Finance contracts.',                                                          category: 'treasury',     price: 3,  capabilities: ['treasury-overview', 'contract-balances', 'analytics'] },
  { id: 'bulk-escrow',          name: 'Bulk Escrow',            description: 'Batch-create multiple NexusV2 escrow jobs in a single operation.',                                                                                            category: 'escrow',       price: 8,  capabilities: ['batch-escrow', 'multi-job-creation'] },
  { id: 'multi-token-batch',    name: 'Multi Token Batch',      description: 'MultisendV2 batch payments with any supported token (not just default AlphaUSD).',                                                                             category: 'payroll',      price: 5,  capabilities: ['multi-token-batch', 'any-token-multisend'] },
  { id: 'proof-auditor',        name: 'Proof Auditor',          description: 'AIProofRegistry deep audit — commitment stats, verification history, slash records.',                                                                          category: 'verification', price: 3,  capabilities: ['proof-audit', 'registry-stats', 'accountability-report'] },
  { id: 'vault-inspector',      name: 'Vault Inspector',        description: 'ShieldVaultV2 state inspection — commitment registry, nullifier status, deposit history.',                                                                     category: 'security',     price: 2,  capabilities: ['vault-inspect', 'commitment-check', 'nullifier-status'] },
  { id: 'gas-profiler',         name: 'Gas Profiler',           description: 'Per-operation gas cost profiling on Tempo L1 for all Agentic Finance contract operations.',                                                                             category: 'analytics',    price: 2,  capabilities: ['gas-profile', 'cost-per-operation', 'optimization'] },
  { id: 'recurring-payment',    name: 'Recurring Payment',      description: 'Create multiple milestone streams for recurring scheduled payments (weekly, monthly).',                                                                        category: 'stream',       price: 5,  capabilities: ['recurring-payment', 'scheduled-stream', 'periodic'] },
  { id: 'contract-reader',      name: 'Contract Reader',        description: 'Comprehensive read of all Agentic Finance contract states — NexusV2, ShieldVault, Stream, Multisend.',                                                                  category: 'analytics',    price: 2,  capabilities: ['contract-read', 'state-inspection', 'comprehensive'] },
  { id: 'wallet-sweeper',       name: 'Wallet Sweeper',         description: 'Emergency token sweep — move all tokens from current wallet to a safe destination address.',                                                                   category: 'security',     price: 3,  capabilities: ['token-sweep', 'emergency-transfer', 'wallet-migration'] },
  { id: 'escrow-batch-settler', name: 'Escrow Batch Settler',   description: 'Batch settle or refund multiple NexusV2 escrow jobs in a single operation.',                                                                                  category: 'escrow',       price: 8,  capabilities: ['batch-settle', 'batch-refund', 'multi-escrow'] },
  { id: 'token-minter',         name: 'Token Minter',           description: 'Deploy custom ERC20 tokens with fine-grained control — name, symbol, supply, decimals.',                                                                      category: 'deployment',   price: 5,  capabilities: ['token-mint', 'custom-erc20', 'fine-grained-deploy'] },
  { id: 'chain-monitor',        name: 'Chain Monitor',          description: 'Tempo L1 chain health monitoring — block info, gas prices, network activity.',                                                                                 category: 'analytics',    price: 1,  capabilities: ['chain-health', 'block-info', 'network-monitor'] },
];

// Build the Agent Card once at module load (cached by Next.js)
function buildAgentCard(): A2AAgentCard {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://agt.finance';

  return {
    name: 'Agentic Finance',
    description: 'Agent-to-Agent payment infrastructure on Tempo L1 with 32 on-chain AI agents. Features ZK-SNARK PLONK proofs, trustless escrow, milestone streams, AI proof accountability, and multi-agent orchestration.',
    url: `${baseUrl}/api/a2a/rpc`,
    provider: {
      organization: 'Agentic Finance',
      url: baseUrl,
    },
    version: '1.0.0',
    documentationUrl: `${baseUrl}/developers`,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    authentication: {
      schemes: ['apiKey', 'wallet'],
      credentials: 'X-API-Key header (pp_xxx) or X-Wallet-Address header (0x...)',
    },
    defaultInputModes: ['application/json', 'text/plain'],
    defaultOutputModes: ['application/json'],
    skills: AGENT_MANIFESTS.map(agentToA2ASkill),
    extensions: {
      agtfi: {
        chainId: 42431,
        network: 'Tempo Moderato Testnet',
        contracts: {
          NexusV2:          '0x6A467Cd4156093bB528e448C04366586a1052Fab',
          ShieldVaultV2:    '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
          PlonkVerifierV2:  '0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B',
          AIProofRegistry:  '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
          StreamV1:         '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C',
          MultisendV2:      '0x25f4d3f12C579002681a52821F3a6251c46D4575',
          ReputationRegistry: '0x9332c1B2bb94C96DA2D729423f345c76dB3494D0',
          SecurityDeposit:  '0x8C1d4da4034FFEB5E3809aa017785cB70B081A80',
        },
        aiProofRegistry: true,
        zkProofs: true,
        reputationRegistry: true,
        securityDeposit: true,
        totalAgents: 32,
      },
    },
  };
}

// ── GET Handler ─────────────────────────────────────────────

export async function GET() {
  const card = buildAgentCard();

  return NextResponse.json(card, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
