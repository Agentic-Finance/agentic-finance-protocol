/**
 * APS-1: Agent Payment Standard v2.1
 *
 * Core type definitions for the PayPol Agent Payment Standard.
 * These interfaces define the protocol for how AI agents discover,
 * negotiate, escrow, execute, verify, and settle payments.
 *
 * Framework-agnostic - works with OpenAI, Anthropic, LangChain,
 * CrewAI, MCP, Eliza, or any HTTP-based agent.
 *
 * Changelog v2.1:
 * - Added EscrowProvider interface for pluggable on-chain escrow
 * - Added A2A (Agent-to-Agent) orchestration types
 * - Added SecurityDeposit types for agent staking
 * - Added APS1ErrorCode enum for structured error handling
 * - Added APS1Event type for lifecycle event streaming
 * - Added ReputationTier enum
 * - Added APS1ProtocolConfig for customizable deployments
 */

// ── Agent Manifest ─────────────────────────────────────────

/**
 * APS-1 Agent Manifest - the identity card of every APS-1 compliant agent.
 * Served at GET /manifest endpoint.
 */
export interface APS1Manifest {
  /** Protocol version identifier */
  aps: '1.0' | '2.0' | '2.1';
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
  /** Agent's reputation tier */
  reputationTier?: APS1ReputationTier;
  /** Agent's wallet address on Tempo L1 */
  walletAddress: string;
  /** Security deposit tier (v2.0) */
  securityDepositTier?: APS1SecurityDepositTier;
  /** Whether agent supports A2A sub-task delegation (v2.0) */
  a2aEnabled?: boolean;
  /** HTTP endpoints */
  endpoints: APS1Endpoints;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export type APS1Category =
  | 'security' | 'escrow' | 'payments' | 'streams'
  | 'analytics' | 'deployment' | 'privacy' | 'verification'
  | 'orchestration' | 'payroll' | 'admin' | 'defi'
  | 'compliance' | 'automation';

export interface APS1Pricing {
  /** Base price in USD */
  basePrice: number;
  /** Currency (always USD in v1/v2) */
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
  /** POST /a2a-execute - A2A sub-task delegation (v2.0) */
  a2aExecute?: string;
  /** GET /events - SSE event stream (v2.0) */
  events?: string;
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
  /** Maximum negotiation rounds (v2.0) */
  maxRounds?: number;
  /** Current round number (v2.0) */
  round?: number;
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
  /** A2A context (v2.0 — present when this is a sub-task) */
  a2a?: {
    /** Parent job that spawned this sub-task */
    parentJobId: string;
    /** Parent agent that delegated */
    parentAgentId: string;
    /** Recursion depth (max 5 to prevent runaway) */
    depth: number;
    /** Budget allocated for this sub-task */
    budgetAllocation: number;
    /** Unique chain ID grouping all related jobs */
    a2aChainId: string;
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
  /** Structured error code (v2.0) */
  errorCode?: APS1ErrorCode;
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
  /** A2A child jobs (v2.0 — sub-tasks this agent spawned) */
  a2a?: {
    /** Child jobs created during execution */
    childJobs: Array<{
      jobId: string;
      agentId: string;
      status: 'success' | 'error' | 'pending';
      executionTimeMs: number;
    }>;
    /** Total A2A chain ID */
    a2aChainId: string;
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

// ── Escrow Provider Interface (v2.0) ──────────────────────

/**
 * Abstract interface for pluggable escrow backends.
 * Implement this to wire APS-1 to any smart contract or payment system.
 *
 * Reference implementations:
 * - NexusV2EscrowProvider (PayPol NexusV2 contract)
 * - StreamV1EscrowProvider (PayPol StreamV1 contract)
 */
export interface APS1EscrowProvider {
  /** Human-readable provider name */
  readonly name: string;
  /** Payment method this provider handles */
  readonly method: APS1PaymentMethod;

  /**
   * Create an escrow lock on-chain.
   * @returns Escrow receipt with on-chain IDs
   */
  createEscrow(params: APS1EscrowParams): Promise<APS1EscrowReceipt>;

  /**
   * Settle (release payment to agent) after successful execution.
   */
  settleEscrow(onChainId: number): Promise<APS1EscrowSettlement>;

  /**
   * Refund (return funds to client) after failed execution or timeout.
   */
  refundEscrow(onChainId: number): Promise<APS1EscrowSettlement>;

  /**
   * Open a dispute for arbitration.
   */
  disputeEscrow?(onChainId: number, reason: string): Promise<APS1EscrowSettlement>;

  /**
   * Check escrow status on-chain.
   */
  getEscrowStatus(onChainId: number): Promise<APS1EscrowStatus>;
}

/** Receipt returned after escrow creation */
export interface APS1EscrowReceipt {
  /** On-chain job/stream ID */
  onChainId: number;
  /** Transaction hash of escrow creation */
  txHash: string;
  /** Contract address */
  contractAddress: string;
  /** Escrow deadline (unix timestamp) */
  deadline: number;
  /** Explorer URL */
  explorerUrl: string;
}

/** Settlement receipt */
export interface APS1EscrowSettlement {
  /** Transaction hash */
  txHash: string;
  /** Settlement type */
  type: 'settle' | 'refund' | 'dispute';
  /** Amount transferred */
  amount: string;
  /** Platform fee deducted */
  platformFee: string;
  /** Explorer URL */
  explorerUrl: string;
}

/** On-chain escrow status */
export interface APS1EscrowStatus {
  /** On-chain job/stream ID */
  onChainId: number;
  /** Current status */
  status: 'created' | 'executing' | 'completed' | 'settled' | 'refunded' | 'disputed' | 'timeout';
  /** Amount locked */
  amount: string;
  /** Employer wallet */
  employer: string;
  /** Worker (agent) wallet */
  worker: string;
  /** Deadline (unix timestamp) */
  deadline: number;
}

// ── AI Proof Provider Interface (v2.0) ────────────────────

/**
 * Abstract interface for AI execution verification.
 * Implement this to wire APS-1 to any proof registry.
 *
 * Reference: PayPol AIProofRegistry on Tempo L1
 */
export interface APS1ProofProvider {
  /** Provider name */
  readonly name: string;

  /**
   * Commit a plan hash before execution begins.
   * @param planHash - keccak256(planned approach)
   * @param onChainJobId - associated escrow job ID (optional)
   * @returns Commitment receipt
   */
  commit(planHash: string, onChainJobId?: number): Promise<APS1ProofCommitment>;

  /**
   * Verify execution result against commitment.
   * @param commitmentId - ID from commit()
   * @param resultHash - keccak256(actual result)
   * @returns Verification receipt
   */
  verify(commitmentId: string, resultHash: string): Promise<APS1ProofVerification>;

  /**
   * Get proof statistics from the registry.
   */
  getStats?(): Promise<APS1ProofStats>;
}

/** Commitment receipt */
export interface APS1ProofCommitment {
  /** Commitment ID */
  commitmentId: string;
  /** Plan hash committed */
  planHash: string;
  /** Transaction hash */
  txHash: string;
  /** Explorer URL */
  explorerUrl: string;
}

/** Verification receipt */
export interface APS1ProofVerification {
  /** Whether plan matched result */
  matched: boolean;
  /** Result hash verified */
  resultHash: string;
  /** Transaction hash */
  txHash: string;
  /** Explorer URL */
  explorerUrl: string;
}

/** Proof statistics */
export interface APS1ProofStats {
  totalCommitments: number;
  totalVerified: number;
  totalMatched: number;
  totalMismatched: number;
  totalSlashed: number;
}

// ── A2A (Agent-to-Agent) Types (v2.0) ─────────────────────

/**
 * A2A sub-task request — when an agent hires another agent.
 */
export interface APS1A2ARequest {
  /** Parent job that triggered the sub-task */
  parentJobId: string;
  /** Agent making the request (parent) */
  parentAgentId: string;
  /** Target agent to hire */
  targetAgentId: string;
  /** Task prompt */
  prompt: string;
  /** Budget allocated for this sub-task (USD) */
  budgetAllocation: number;
  /** Recursion depth (enforce max 5) */
  depth: number;
  /** Chain ID grouping all related A2A jobs */
  a2aChainId: string;
}

/**
 * Coordinator plan for multi-agent orchestration.
 */
export interface APS1CoordinatorPlan {
  /** Unique chain ID for this orchestration */
  a2aChainId: string;
  /** Ordered steps to execute */
  steps: APS1CoordinatorStep[];
  /** Total budget across all steps (USD) */
  totalBudget: number;
  /** AI reasoning for the plan */
  reasoning: string;
}

export interface APS1CoordinatorStep {
  /** Step index (0-based) */
  stepIndex: number;
  /** Agent to hire for this step */
  agentId: string;
  /** Prompt for this step */
  prompt: string;
  /** Budget for this step (USD) */
  budgetAllocation: number;
  /** Steps that must complete before this one */
  dependsOn: number[];
}

// ── Security Deposit Types (v2.0) ─────────────────────────

export type APS1SecurityDepositTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface APS1SecurityDeposit {
  /** Agent wallet address */
  agentWallet: string;
  /** Current tier */
  tier: APS1SecurityDepositTier;
  /** Amount deposited (token smallest unit) */
  amount: string;
  /** Fee discount in basis points */
  feeDiscountBps: number;
  /** Lock expiry (unix timestamp) */
  lockExpiry: number;
}

// ── Reputation Types (v2.0) ───────────────────────────────

export type APS1ReputationTier = 'newcomer' | 'rising' | 'trusted' | 'elite' | 'legend';

export interface APS1ReputationSnapshot {
  /** Agent wallet address */
  agentWallet: string;
  /** Composite score (0-10000) */
  compositeScore: number;
  /** Tier label */
  tier: APS1ReputationTier;
  /** Component scores */
  components: {
    /** Average on-chain rating (0-5, weight 30%) */
    onChainRating: number;
    /** Average off-chain review (0-5, weight 25%) */
    offChainRating: number;
    /** Completed / (Completed + Failed) (weight 25%) */
    completionRate: number;
    /** AI proof matched / verified (weight 20%) */
    proofReliability: number;
  };
  /** Total jobs completed */
  totalJobs: number;
  /** Last updated (unix timestamp) */
  lastUpdated: number;
}

// ── Error Codes (v2.0) ────────────────────────────────────

/**
 * Structured error codes for APS-1 protocol errors.
 * Use these instead of freeform error strings for machine-readable errors.
 */
export enum APS1ErrorCode {
  // Discovery errors (1xxx)
  AGENT_NOT_FOUND = 'APS1_1001',
  AGENT_UNAVAILABLE = 'APS1_1002',
  MANIFEST_INVALID = 'APS1_1003',

  // Negotiation errors (2xxx)
  NEGOTIATION_REJECTED = 'APS1_2001',
  PRICE_BELOW_MINIMUM = 'APS1_2002',
  PRICE_ABOVE_MAXIMUM = 'APS1_2003',
  MAX_ROUNDS_EXCEEDED = 'APS1_2004',

  // Escrow errors (3xxx)
  ESCROW_CREATE_FAILED = 'APS1_3001',
  ESCROW_INSUFFICIENT_BALANCE = 'APS1_3002',
  ESCROW_APPROVAL_FAILED = 'APS1_3003',
  ESCROW_SETTLE_FAILED = 'APS1_3004',
  ESCROW_REFUND_FAILED = 'APS1_3005',
  ESCROW_TIMEOUT = 'APS1_3006',
  ESCROW_ALREADY_SETTLED = 'APS1_3007',

  // Execution errors (4xxx)
  EXECUTION_FAILED = 'APS1_4001',
  EXECUTION_TIMEOUT = 'APS1_4002',
  EXECUTION_INVALID_ENVELOPE = 'APS1_4003',
  EXECUTION_HANDLER_MISSING = 'APS1_4004',

  // Proof errors (5xxx)
  PROOF_COMMIT_FAILED = 'APS1_5001',
  PROOF_VERIFY_FAILED = 'APS1_5002',
  PROOF_MISMATCH = 'APS1_5003',

  // A2A errors (6xxx)
  A2A_MAX_DEPTH_EXCEEDED = 'APS1_6001',
  A2A_BUDGET_EXCEEDED = 'APS1_6002',
  A2A_CHILD_FAILED = 'APS1_6003',

  // General errors (9xxx)
  INTERNAL_ERROR = 'APS1_9001',
  NETWORK_ERROR = 'APS1_9002',
  VALIDATION_ERROR = 'APS1_9003',
}

// ── Lifecycle Events (v2.0) ───────────────────────────────

/**
 * APS-1 Lifecycle Event - emitted at each protocol phase.
 * Can be used with SSE, webhooks, or event buses.
 */
export interface APS1Event {
  /** Event type */
  type: APS1EventType;
  /** Job ID this event belongs to */
  jobId: string;
  /** Agent ID */
  agentId: string;
  /** Event-specific payload */
  data: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
}

export type APS1EventType =
  // Discovery phase
  | 'agent.discovered'
  // Negotiation phase
  | 'negotiation.proposed'
  | 'negotiation.countered'
  | 'negotiation.accepted'
  | 'negotiation.rejected'
  // Escrow phase
  | 'escrow.creating'
  | 'escrow.created'
  | 'escrow.failed'
  // Proof phase
  | 'proof.committing'
  | 'proof.committed'
  // Execution phase
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  // Verification phase
  | 'proof.verifying'
  | 'proof.verified'
  | 'proof.mismatched'
  // Settlement phase
  | 'escrow.settling'
  | 'escrow.settled'
  | 'escrow.refunded'
  | 'escrow.disputed'
  // A2A events
  | 'a2a.child_started'
  | 'a2a.child_completed'
  | 'a2a.child_failed';

// ── Protocol Configuration (v2.0) ────────────────────────

/**
 * Customizable protocol configuration for different deployments.
 * Override defaults for custom chains, fee structures, etc.
 */
export interface APS1ProtocolConfig {
  /** Chain ID (default: 42431 for Tempo L1) */
  chainId: number;
  /** Network name (default: "Tempo L1 Moderato") */
  network: string;
  /** RPC URL */
  rpcUrl: string;
  /** Block explorer base URL */
  explorerUrl: string;
  /** Platform fee in basis points (default: 500 = 5%) */
  platformFeeBps: number;
  /** Contract addresses */
  contracts: {
    nexusV2: string;
    shieldVaultV2?: string;
    multisendV2?: string;
    aiProofRegistry?: string;
    streamV1?: string;
    reputation?: string;
    securityDeposit?: string;
  };
  /** Default token for payments */
  defaultToken: APS1TokenConfig;
  /** All supported tokens */
  supportedTokens: APS1TokenConfig[];
}

// ── Protocol Constants ─────────────────────────────────────

export const APS1_VERSION = '2.0' as const;
export const APS1_CHAIN_ID = 42431;
export const APS1_NETWORK = 'Tempo L1 Moderato';
export const APS1_RPC_URL = 'https://rpc.moderato.tempo.xyz';
export const APS1_EXPLORER_URL = 'https://explore.tempo.xyz';
export const APS1_PLATFORM_FEE_BPS = 500; // 5%
export const APS1_MAX_A2A_DEPTH = 5;
export const APS1_MAX_NEGOTIATION_ROUNDS = 10;

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
  SecurityDeposit: '0x8C1d4da4034FFEB5E3809aa017785cB70B081A80',
} as const;

/** Default Tempo L1 protocol configuration */
export const APS1_DEFAULT_CONFIG: APS1ProtocolConfig = {
  chainId: APS1_CHAIN_ID,
  network: APS1_NETWORK,
  rpcUrl: APS1_RPC_URL,
  explorerUrl: APS1_EXPLORER_URL,
  platformFeeBps: APS1_PLATFORM_FEE_BPS,
  contracts: {
    nexusV2: APS1_CONTRACTS.NexusV2,
    shieldVaultV2: APS1_CONTRACTS.ShieldVaultV2,
    multisendV2: APS1_CONTRACTS.MultisendV2,
    aiProofRegistry: APS1_CONTRACTS.AIProofRegistry,
    streamV1: APS1_CONTRACTS.StreamV1,
    reputation: APS1_CONTRACTS.Reputation,
    securityDeposit: APS1_CONTRACTS.SecurityDeposit,
  },
  defaultToken: APS1_DEFAULT_TOKENS[0],
  supportedTokens: APS1_DEFAULT_TOKENS,
};

/** Security deposit tier thresholds (in USD) */
export const APS1_DEPOSIT_TIERS = {
  bronze: { minDeposit: 50, feeDiscountBps: 50 },   // $50 → 0.5% discount
  silver: { minDeposit: 200, feeDiscountBps: 150 },  // $200 → 1.5% discount
  gold:   { minDeposit: 1000, feeDiscountBps: 300 }, // $1000 → 3% discount
} as const;

/** Reputation tier thresholds */
export const APS1_REPUTATION_TIERS = {
  newcomer: { min: 0, max: 3000 },
  rising:   { min: 3001, max: 6000 },
  trusted:  { min: 6001, max: 8000 },
  elite:    { min: 8001, max: 9500 },
  legend:   { min: 9501, max: 10000 },
} as const;
