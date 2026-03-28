// ============================================================================
// @agtfi/types — Shared TypeScript types for Agentic Finance Protocol
// ============================================================================

// ---------------------------------------------------------------------------
// Payment Types
// ---------------------------------------------------------------------------

/** Status of a payment through the protocol */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/** A request to initiate a payment between agents or wallets */
export interface PaymentRequest {
  /** Unique identifier for this payment request */
  id: string;
  /** Sender wallet address */
  from: string;
  /** Recipient wallet address */
  to: string;
  /** Amount in token's smallest unit (wei-equivalent) */
  amount: string;
  /** Token contract address */
  token: string;
  /** Chain ID where the payment should be executed */
  chainId: number;
  /** Optional memo or reference for the payment */
  memo?: string;
  /** Whether ZK compliance proof is required */
  requiresProof?: boolean;
  /** Deadline as unix timestamp (seconds) */
  deadline?: number;
  /** ISO 8601 timestamp of when the request was created */
  createdAt: string;
}

/** Result of an executed payment */
export interface PaymentResult {
  /** The original payment request ID */
  requestId: string;
  /** Transaction hash on-chain */
  txHash: string;
  /** Current status of the payment */
  status: PaymentStatus;
  /** Block number where tx was included */
  blockNumber?: number;
  /** Gas used by the transaction */
  gasUsed?: string;
  /** ZK proof hash if compliance proof was generated */
  proofHash?: string;
  /** Error message if payment failed */
  error?: string;
  /** ISO 8601 timestamp of completion */
  completedAt?: string;
}

/** An escrow job managed by NexusV2 */
export interface EscrowJob {
  /** On-chain escrow job ID */
  jobId: string;
  /** Depositor address */
  depositor: string;
  /** Beneficiary address */
  beneficiary: string;
  /** Escrowed amount in smallest unit */
  amount: string;
  /** Token contract address */
  token: string;
  /** Chain ID */
  chainId: number;
  /** Current escrow state */
  state: 'active' | 'released' | 'refunded' | 'disputed';
  /** Conditions that must be met to release */
  releaseConditions?: string[];
  /** Arbiter address for disputes */
  arbiter?: string;
  /** Deadline as unix timestamp */
  deadline: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/** A streaming payment job via StreamV1 */
export interface StreamJob {
  /** On-chain stream ID */
  streamId: string;
  /** Sender address */
  sender: string;
  /** Recipient address */
  recipient: string;
  /** Total amount to be streamed */
  totalAmount: string;
  /** Amount already claimed by recipient */
  claimedAmount: string;
  /** Token contract address */
  token: string;
  /** Chain ID */
  chainId: number;
  /** Stream rate per second in smallest unit */
  ratePerSecond: string;
  /** Start time as unix timestamp */
  startTime: number;
  /** End time as unix timestamp */
  endTime: number;
  /** Whether the stream is currently active */
  active: boolean;
  /** Whether the stream can be cancelled by sender */
  cancellable: boolean;
}

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

/** Categories of agent capabilities */
export type AgentCapability =
  | 'payment'
  | 'escrow'
  | 'streaming'
  | 'proof-generation'
  | 'proof-verification'
  | 'compliance'
  | 'reputation'
  | 'multisend'
  | 'swap'
  | 'bridge'
  | 'oracle'
  | 'governance'
  | 'analytics'
  | 'monitoring';

/** Agent registration status */
export type AgentStatus = 'active' | 'inactive' | 'suspended' | 'pending';

/** A registered AI agent in the protocol */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Wallet address controlled by this agent */
  walletAddress: string;
  /** List of capabilities this agent supports */
  capabilities: AgentCapability[];
  /** Current operational status */
  status: AgentStatus;
  /** Agent's reputation score (0-1000) */
  reputationScore: number;
  /** Number of successful tasks completed */
  tasksCompleted: number;
  /** Chain IDs this agent operates on */
  supportedChains: number[];
  /** A2A endpoint URL for inter-agent communication */
  endpoint?: string;
  /** Agent category for discovery */
  category: string;
  /** ISO 8601 registration timestamp */
  registeredAt: string;
  /** ISO 8601 last active timestamp */
  lastActiveAt?: string;
}

/** Agent card for A2A discovery (Google A2A spec) */
export interface AgentCard {
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent endpoint URL */
  url: string;
  /** Protocol version */
  version: string;
  /** Supported capabilities */
  capabilities: {
    /** Whether the agent supports streaming responses */
    streaming: boolean;
    /** Whether the agent supports push notifications */
    pushNotifications: boolean;
    /** Whether state transition history is available */
    stateTransitionHistory: boolean;
  };
  /** Skills this agent can perform */
  skills: AgentSkill[];
  /** Default input modes accepted */
  defaultInputModes: string[];
  /** Default output modes produced */
  defaultOutputModes: string[];
  /** Authentication configuration */
  authentication?: {
    schemes: string[];
    credentials?: string;
  };
}

/** A skill advertised by an agent */
export interface AgentSkill {
  /** Unique skill identifier */
  id: string;
  /** Human-readable skill name */
  name: string;
  /** Skill description */
  description: string;
  /** Input modes this skill accepts */
  inputModes?: string[];
  /** Output modes this skill produces */
  outputModes?: string[];
  /** JSON schema for skill parameters */
  parameters?: Record<string, unknown>;
}

/** Message format for agent-to-agent communication */
export interface A2AMessage {
  /** Unique message ID */
  id: string;
  /** Sender agent ID */
  from: string;
  /** Recipient agent ID */
  to: string;
  /** Message type */
  type: 'task' | 'result' | 'status' | 'error' | 'heartbeat';
  /** Message payload */
  payload: Record<string, unknown>;
  /** Correlation ID for request/response pairing */
  correlationId?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Digital signature of the payload */
  signature?: string;
}

// ---------------------------------------------------------------------------
// Chain Types
// ---------------------------------------------------------------------------

/** Configuration for a supported blockchain */
export interface ChainConfig {
  /** Chain ID */
  chainId: number;
  /** Human-readable chain name */
  name: string;
  /** Short chain identifier */
  shortName: string;
  /** RPC endpoint URLs (primary + fallbacks) */
  rpcUrls: string[];
  /** WebSocket RPC URLs */
  wsUrls?: string[];
  /** Block explorer base URL */
  explorerUrl: string;
  /** Block explorer API URL */
  explorerApiUrl?: string;
  /** Native token symbol */
  nativeToken: string;
  /** Native token decimals */
  nativeDecimals: number;
  /** Average block time in seconds */
  blockTime: number;
  /** Whether gas is free (testnet) */
  freeGas: boolean;
  /** Chain-specific quirks and workarounds */
  quirks?: ChainQuirk[];
  /** Whether this chain is a testnet */
  isTestnet: boolean;
}

/** Known chain quirks that require special handling */
export interface ChainQuirk {
  /** Quirk identifier */
  id: string;
  /** Description of the quirk */
  description: string;
  /** Workaround instructions */
  workaround: string;
}

/** Token metadata for a specific chain */
export interface TokenInfo {
  /** Token contract address */
  address: string;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Token decimals */
  decimals: number;
  /** Chain ID where this token lives */
  chainId: number;
  /** Whether this is a TIP-20 precompile token */
  isTip20?: boolean;
  /** Logo URI */
  logoUri?: string;
}

/** Deployed contract addresses for a specific chain */
export interface ContractAddresses {
  /** Chain ID */
  chainId: number;
  /** NexusV2 payment router */
  nexusV2?: string;
  /** ShieldVaultV2 privacy vault */
  shieldVaultV2?: string;
  /** PlonkVerifierV2 on-chain verifier */
  plonkVerifierV2?: string;
  /** AI proof registry */
  aiProofRegistry?: string;
  /** StreamV1 streaming payments */
  streamV1?: string;
  /** MultisendV2 batch transfers */
  multisendV2?: string;
  /** Compliance verifier contract */
  complianceVerifier?: string;
  /** Compliance registry contract */
  complianceRegistry?: string;
  /** Reputation verifier contract */
  reputationVerifier?: string;
  /** Reputation registry contract */
  reputationRegistry?: string;
  /** Agent discovery registry */
  agentDiscoveryRegistry?: string;
  /** Proof chain settlement */
  proofChainSettlement?: string;
}

// ---------------------------------------------------------------------------
// Proof Types
// ---------------------------------------------------------------------------

/** Supported proof types in the protocol */
export type ProofType = 'compliance' | 'reputation' | 'identity' | 'payment' | 'custom';

/** A ZK-SNARK proof generated by the protocol */
export interface ZKProof {
  /** Proof type identifier */
  type: ProofType;
  /** SNARK protocol used */
  protocol: 'plonk' | 'groth16';
  /** Proof data (pi_a, pi_b, pi_c for Groth16; commitments for PLONK) */
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  /** Public signals / inputs */
  publicSignals: string[];
  /** Verification key hash */
  vkeyHash: string;
  /** Circuit identifier used to generate this proof */
  circuitId: string;
  /** On-chain proof hash after registration */
  onChainHash?: string;
  /** ISO 8601 generation timestamp */
  generatedAt: string;
  /** Proof generation time in milliseconds */
  generationTimeMs: number;
}

/** Compliance proof for regulatory checks */
export interface ComplianceProof extends ZKProof {
  type: 'compliance';
  /** Jurisdiction code */
  jurisdiction: string;
  /** Compliance rule IDs that were checked */
  ruleIds: string[];
  /** Expiry timestamp for the proof */
  expiresAt: string;
}

/** Reputation proof for agent trust scores */
export interface ReputationProof extends ZKProof {
  type: 'reputation';
  /** Agent ID whose reputation is proven */
  agentId: string;
  /** Minimum reputation threshold proven */
  minScore: number;
  /** Number of completed tasks proven */
  minTasks: number;
}

/** Input parameters for proof generation */
export interface ProofInput {
  /** Circuit name to use */
  circuit: string;
  /** Private inputs (not revealed on-chain) */
  privateInputs: Record<string, string | string[]>;
  /** Public inputs (revealed on-chain) */
  publicInputs: Record<string, string | string[]>;
}

// ---------------------------------------------------------------------------
// Transaction Types
// ---------------------------------------------------------------------------

/** Transaction status on-chain */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'dropped';

/** A blockchain transaction */
export interface Transaction {
  /** Transaction hash */
  hash: string;
  /** Sender address */
  from: string;
  /** Recipient address (contract or EOA) */
  to: string;
  /** Value in native token (wei) */
  value: string;
  /** Encoded calldata */
  data: string;
  /** Chain ID */
  chainId: number;
  /** Nonce */
  nonce: number;
  /** Gas limit */
  gasLimit: string;
  /** Gas price or max fee per gas */
  gasPrice?: string;
  /** EIP-1559 max fee per gas */
  maxFeePerGas?: string;
  /** EIP-1559 max priority fee per gas */
  maxPriorityFeePerGas?: string;
  /** Transaction type (0 = legacy, 2 = EIP-1559) */
  type: number;
}

/** Receipt returned after a transaction is mined */
export interface TransactionReceipt {
  /** Transaction hash */
  hash: string;
  /** Block number */
  blockNumber: number;
  /** Block hash */
  blockHash: string;
  /** Transaction index within the block */
  transactionIndex: number;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Gas used by this transaction */
  gasUsed: string;
  /** Effective gas price paid */
  effectiveGasPrice: string;
  /** Whether the transaction succeeded (1) or reverted (0) */
  status: 0 | 1;
  /** Contract address if this was a deployment */
  contractAddress?: string;
  /** Decoded event logs */
  logs: TransactionLog[];
  /** Cumulative gas used in the block up to this tx */
  cumulativeGasUsed: string;
}

/** A log entry emitted by a transaction */
export interface TransactionLog {
  /** Contract address that emitted the log */
  address: string;
  /** Indexed topics */
  topics: string[];
  /** Non-indexed data */
  data: string;
  /** Log index in the block */
  logIndex: number;
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
}

// ---------------------------------------------------------------------------
// Protocol Types
// ---------------------------------------------------------------------------

/** Protocol-wide configuration */
export interface ProtocolConfig {
  /** Protocol version string */
  version: string;
  /** Platform fee in basis points (e.g., 500 = 5%) */
  platformFeeBps: number;
  /** Maximum single transfer amount */
  maxTransferAmount: string;
  /** Minimum single transfer amount */
  minTransferAmount: string;
  /** Maximum number of recipients in a multisend */
  maxMultisendRecipients: number;
  /** Maximum stream duration in seconds */
  maxStreamDuration: number;
  /** Proof expiry duration in seconds */
  proofExpirySeconds: number;
}

/** Circuit configuration for proof generation */
export interface CircuitConfig {
  /** Circuit name identifier */
  name: string;
  /** Number of constraints in the circuit */
  constraintCount: number;
  /** Expected proof generation time in milliseconds */
  expectedProofTimeMs: number;
  /** Path to the circuit's WASM file */
  wasmPath: string;
  /** Path to the circuit's zkey file */
  zkeyPath: string;
  /** Path to the verification key JSON */
  vkeyPath: string;
  /** Number of public inputs */
  publicInputCount: number;
  /** Number of private inputs */
  privateInputCount: number;
}
