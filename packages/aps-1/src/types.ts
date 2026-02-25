/**
 * APS-1: Agent Payment Standard v1.0
 *
 * Core type definitions for the PayPol Agent Payment Standard.
 * These interfaces define the protocol for how AI agents discover,
 * negotiate, escrow, execute, verify, and settle payments.
 *
 * Framework-agnostic - works with OpenAI, Anthropic, LangChain,
 * CrewAI, MCP, Eliza, or any HTTP-based agent.
 */

// ── Agent Manifest ─────────────────────────────────────────

/**
 * APS-1 Agent Manifest - the identity card of every APS-1 compliant agent.
 * Served at GET /manifest endpoint.
 */
export interface APS1Manifest {
  /** Protocol version identifier */
  aps: '1.0';
  /** Unique agent identifier (kebab-case, e.g. "contract-auditor") */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** What the agent does (1-3 sentences) */
  description: string;
  /** Agent category */
  category: APS1Category;
  /** Semantic version (semver) */
  version: string;
  /** Pricing configuration */
  pricing: APS1Pricing;
  /** List of capabilities/skills */
  capabilities: string[];
  /** Supported payment methods */
  paymentMethods: APS1PaymentMethod[];
  /** ERC20 token addresses the agent accepts */
  supportedTokens: APS1TokenConfig[];
  /** Whether the agent uses AIProofRegistry for verifiable execution */
  proofEnabled: boolean;
  /** Agent's reputation score (0-10000, from ReputationRegistry) */
  reputationScore?: number;
  /** Agent's wallet address on Tempo L1 */
  walletAddress: string;
  /** HTTP endpoints */
  endpoints: APS1Endpoints;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export type APS1Category =
  | 'security' | 'escrow' | 'payments' | 'streams'
  | 'analytics' | 'deployment' | 'privacy' | 'verification'
  | 'orchestration' | 'payroll' | 'admin';

export interface APS1Pricing {
  /** Base price in USD */
  basePrice: number;
  /** Currency (always USD in v1) */
  currency: 'USD';
  /** Whether the agent accepts price negotiation */
  negotiable: boolean;
  /** Minimum acceptable price (if negotiable) */
  minPrice?: number;
  /** Maximum price (if negotiable) */
  maxPrice?: number;
}

export type APS1PaymentMethod =
  | 'nexus-escrow'        // Full NexusV2 escrow lifecycle
  | 'stream-milestone'    // Progressive StreamV1 milestone payments
  | 'direct-transfer';    // Simple ERC20 transfer (no escrow)

export interface APS1TokenConfig {
  /** Token symbol (e.g. "AlphaUSD") */
  symbol: string;
  /** ERC20 contract address on Tempo L1 */
  address: string;
  /** Token decimals */
  decimals: number;
}

export interface APS1Endpoints {
  /** GET /manifest - returns APS1Manifest */
  manifest: string;
  /** POST /execute - executes a job */
  execute: string;
  /** POST /negotiate - optional price negotiation */
  negotiate?: string;
  /** GET /status/:jobId - check job status */
  status?: string;
  /** GET /health - health check */
  health?: string;
}

// ── Negotiation ────────────────────────────────────────────

/**
 * APS-1 Negotiation Message - for optional price negotiation between
 * client and agent before escrow lockup.
 */
export interface APS1NegotiationMessage {
  /** Message type in the negotiation flow */
  type: 'propose' | 'counter' | 'accept' | 'reject';
  /** Job ID this negotiation is for */
  jobId: string;
  /** Proposed/countered price in USD */
  price: number;
  /** Currency */
  currency: 'USD';
  /** Optional human-readable message */
  message?: string;
  /** ISO timestamp */
  timestamp: string;
}

// ── Escrow Parameters ──────────────────────────────────────

/**
 * APS-1 Escrow Parameters - defines how funds are locked before execution.
 */
export interface APS1EscrowParams {
  /** Which payment method to use */
  method: APS1PaymentMethod;
  /** ERC20 token address */
  token: string;
  /** Amount to lock (in token's smallest unit) */
  amount: string;
  /** Amount in USD (for display) */
  amountUSD: number;
  /** Deadline in seconds from now */
  deadlineSeconds: number;
  /** Worker (agent) wallet address */
  workerWallet: string;
  /** Judge wallet address (for NexusV2 disputes) */
  judgeWallet?: string;
  /** Milestones (for stream-milestone method) */
  milestones?: APS1Milestone[];
}

export interface APS1Milestone {
  /** Amount for this milestone (in token's smallest unit) */
  amount: string;
  /** Description of the deliverable */
  deliverable: string;
}

// ── Execution ──────────────────────────────────────────────

/**
 * APS-1 Execution Envelope - the standardized job request sent to an agent.
 * This is what gets POSTed to the agent's /execute endpoint.
 */
export interface APS1ExecutionEnvelope {
  /** Unique job identifier */
  jobId: string;
  /** Agent identifier */
  agentId: string;
  /** Natural language prompt describing the task */
  prompt: string;
  /** Optional structured payload */
  payload?: Record<string, unknown>;
  /** Client's wallet address */
  callerWallet: string;
  /** Escrow information (if funds are locked) */
  escrow?: {
    /** Smart contract address holding the funds */
    contractAddress: string;
    /** On-chain job/stream ID */
    onChainId: number;
    /** Transaction hash of the escrow creation */
    txHash: string;
    /** Payment method used */
    method: APS1PaymentMethod;
  };
  /** AI Proof commitment (if proofEnabled) */
  proof?: {
    /** keccak256 hash of the agent's planned approach */
    planHash: string;
    /** Commitment ID from AIProofRegistry */
    commitmentId: string;
    /** Transaction hash of the commit() call */
    commitTxHash: string;
  };
  /** ISO timestamp */
  timestamp: string;
}

// ── Result ─────────────────────────────────────────────────

/**
 * APS-1 Execution Result - the standardized response from an agent.
 */
export interface APS1Result {
  /** Job identifier (matches envelope.jobId) */
  jobId: string;
  /** Agent identifier */
  agentId: string;
  /** Execution status */
  status: 'success' | 'error' | 'pending';
  /** Result data (agent-specific) */
  result?: unknown;
  /** Error message (if status === 'error') */
  error?: string;
  /** On-chain execution details */
  onChain?: {
    /** Whether real on-chain transactions were executed */
    executed: boolean;
    /** Transaction hashes */
    transactions: APS1Transaction[];
    /** Network identifier */
    network: string;
    /** Chain ID */
    chainId: number;
  };
  /** AI Proof verification (if proofEnabled) */
  proof?: {
    /** keccak256 hash of the actual execution result */
    resultHash: string;
    /** Transaction hash of the verify() call */
    verifyTxHash: string;
    /** Whether plan hash matched result hash */
    matched: boolean;
  };
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** ISO timestamp */
  timestamp: string;
}

export interface APS1Transaction {
  /** Transaction hash */
  hash: string;
  /** Block number */
  blockNumber: number;
  /** Gas used */
  gasUsed: string;
  /** Tempo Explorer URL */
  explorerUrl: string;
  /** Description of what this TX did */
  description?: string;
}

// ── Settlement ─────────────────────────────────────────────

/**
 * APS-1 Settlement Event - emitted when escrow is settled.
 */
export interface APS1Settlement {
  /** Job identifier */
  jobId: string;
  /** Settlement type */
  type: 'settle' | 'refund' | 'dispute';
  /** Amount paid to agent (after fee deduction) */
  agentPayout: string;
  /** Platform fee amount */
  platformFee: string;
  /** Settlement transaction hash */
  txHash: string;
  /** ISO timestamp */
  timestamp: string;
}

// ── Protocol Constants ─────────────────────────────────────

export const APS1_VERSION = '1.0' as const;
export const APS1_CHAIN_ID = 42431;
export const APS1_NETWORK = 'Tempo L1 Moderato';
export const APS1_PLATFORM_FEE_BPS = 800; // 8%

/** Default supported tokens on Tempo L1 */
export const APS1_DEFAULT_TOKENS: APS1TokenConfig[] = [
  { symbol: 'AlphaUSD', address: '0x20c0000000000000000000000000000000000001', decimals: 6 },
  { symbol: 'pathUSD',  address: '0x20c0000000000000000000000000000000000000', decimals: 6 },
  { symbol: 'BetaUSD',  address: '0x20c0000000000000000000000000000000000002', decimals: 6 },
  { symbol: 'ThetaUSD', address: '0x20c0000000000000000000000000000000000003', decimals: 6 },
];

/** PayPol smart contract addresses on Tempo L1 */
export const APS1_CONTRACTS = {
  NexusV2:         '0x6A467Cd4156093bB528e448C04366586a1052Fab',
  ShieldVaultV2:   '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
  MultisendV2:     '0x25f4d3f12C579002681a52821F3a6251c46D4575',
  AIProofRegistry: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
  StreamV1:        '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C',
  Reputation:      '0x9332c1B2bb94C96DA2D729423f345c76dB3494D0',
} as const;
