/**
 * Google A2A Protocol Types & Utilities
 *
 * Implements the Agent2Agent (A2A) open protocol specification.
 * Provides Agent Card generation, JSON-RPC 2.0 message handling,
 * task lifecycle management, and PayPol agent mapping.
 *
 * Spec: https://a2a-protocol.org/latest/specification/
 */

// ── A2A Protocol Types ─────────────────────────────────────

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  provider?: {
    organization: string;
    url: string;
  };
  version: string;
  documentationUrl?: string;
  capabilities: A2ACapabilities;
  authentication: {
    schemes: string[];
    credentials?: string;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2AAgentSkill[];
  /** PayPol extension: on-chain verification */
  extensions?: {
    paypol?: {
      chainId: number;
      network: string;
      contracts: Record<string, string>;
      aiProofRegistry: boolean;
      zkProofs: boolean;
      reputationRegistry: boolean;
      securityDeposit: boolean;
      totalAgents: number;
    };
  };
}

export interface A2ACapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
}

export interface A2AAgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

// ── A2A Task Types ─────────────────────────────────────────

export type A2ATaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'rejected'
  | 'auth-required';

export interface A2ATask {
  id: string;
  contextId?: string;
  status: {
    state: A2ATaskState;
    message?: A2AMessage;
    timestamp: string;
  };
  messages?: A2AMessage[];
  artifacts?: A2AArtifact[];
  metadata?: Record<string, unknown>;
  /** PayPol extension: link to on-chain job */
  _paypol?: {
    jobId?: string;
    agentId?: string;
    a2aChainId?: string;
    aiProof?: {
      commitmentId?: string;
      commitTxHash?: string;
      verifyTxHash?: string;
    };
  };
}

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export type A2APart = A2ATextPart | A2AFilePart | A2ADataPart;

export interface A2ATextPart {
  type: 'text';
  text: string;
}

export interface A2AFilePart {
  type: 'file';
  file: {
    name?: string;
    mimeType?: string;
    bytes?: string; // base64
    uri?: string;
  };
}

export interface A2ADataPart {
  type: 'data';
  data: Record<string, unknown>;
}

export interface A2AArtifact {
  name?: string;
  description?: string;
  parts: A2APart[];
  index?: number;
  append?: boolean;
  lastChunk?: boolean;
  metadata?: Record<string, unknown>;
}

// ── JSON-RPC 2.0 Types ────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ── A2A Error Codes ────────────────────────────────────────

export const A2A_ERRORS = {
  TASK_NOT_FOUND:       { code: -32001, message: 'Task not found' },
  TASK_NOT_CANCELABLE:  { code: -32002, message: 'Task is not cancelable' },
  UNSUPPORTED_OP:       { code: -32003, message: 'Unsupported operation' },
  CONTENT_TYPE_ERROR:   { code: -32004, message: 'Content type not supported' },
  INVALID_REQUEST:      { code: -32600, message: 'Invalid request' },
  METHOD_NOT_FOUND:     { code: -32601, message: 'Method not found' },
  INVALID_PARAMS:       { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR:       { code: -32603, message: 'Internal error' },
  AUTH_REQUIRED:        { code: -32010, message: 'Authentication required' },
} as const;

// ── PayPol Agent → A2A Skill Mapper ────────────────────────

/** Category → tag mapping for A2A skill discovery */
const CATEGORY_TAGS: Record<string, string[]> = {
  escrow:       ['payment', 'escrow', 'settlement', 'dispute', 'trustless'],
  security:     ['security', 'privacy', 'zk-proof', 'shield', 'encryption'],
  payroll:      ['payroll', 'salary', 'batch-payment', 'accounting'],
  deployment:   ['deployment', 'smart-contract', 'token', 'erc20'],
  analytics:    ['analytics', 'monitoring', 'benchmark', 'profiling'],
  verification: ['verification', 'proof', 'accountability', 'audit'],
  defi:         ['defi', 'vault', 'deposit', 'yield', 'stream'],
  treasury:     ['treasury', 'balance', 'portfolio', 'management'],
  stream:       ['stream', 'milestone', 'progressive', 'payment'],
};

/**
 * Convert a PayPol agent manifest to an A2A AgentSkill.
 * Maps native capabilities → A2A tags + examples.
 */
export function agentToA2ASkill(agent: {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  price: number;
}): A2AAgentSkill {
  const categoryTags = CATEGORY_TAGS[agent.category] || [agent.category];
  const capTags = agent.capabilities.map(c => c.replace(/-/g, ' '));

  return {
    id: agent.id,
    name: agent.name,
    description: `${agent.description} (Price: ${agent.price} AlphaUSD)`,
    tags: [...new Set([...categoryTags, ...capTags, 'on-chain', 'tempo-l1'])],
    examples: generateExamples(agent.id, agent.capabilities),
    inputModes: ['application/json', 'text/plain'],
    outputModes: ['application/json'],
  };
}

/** Generate example prompts based on agent capabilities */
function generateExamples(agentId: string, capabilities: string[]): string[] {
  const examples: Record<string, string[]> = {
    'escrow-manager':       ['Create an escrow job for 100 AlphaUSD', 'Settle escrow job #5'],
    'shield-executor':      ['Send a private ZK payment of 50 AlphaUSD', 'Execute shielded payout'],
    'payroll-planner':      ['Plan payroll for 10 employees totaling 5000 AlphaUSD'],
    'token-deployer':       ['Deploy a new ERC20 token called TestCoin'],
    'token-minter':         ['Mint 1000 tokens with 18 decimals'],
    'stream-creator':       ['Create a milestone stream with 3 payments'],
    'stream-manager':       ['Submit milestone #2 for stream #1', 'Approve milestone'],
    'proof-verifier':       ['Commit AI plan hash on-chain', 'Verify execution result'],
    'escrow-lifecycle':     ['Start job #3', 'Complete job #5', 'Rate worker 5 stars'],
    'escrow-dispute':       ['Dispute escrow job #7', 'Check timeout for job #2'],
    'coordinator-agent':    ['Orchestrate a complex task across multiple agents'],
    'balance-scanner':      ['Scan portfolio balance across all tokens'],
    'token-transfer':       ['Transfer 100 AlphaUSD to 0x...'],
    'multisend-batch':      ['Batch send to 5 recipients'],
    'vault-depositor':      ['Deposit 500 AlphaUSD to ShieldVault'],
    'allowance-manager':    ['Approve NexusV2 to spend 1000 AlphaUSD'],
    'fee-collector':        ['Collect accumulated platform fees'],
    'multi-token-sender':   ['Send AlphaUSD and BetaUSD to one recipient'],
    'treasury-manager':     ['Get full treasury overview'],
    'bulk-escrow':          ['Create 5 escrow jobs in batch'],
    'multi-token-batch':    ['Batch multi-token payments to multiple recipients'],
    'proof-auditor':        ['Audit AIProofRegistry statistics'],
    'vault-inspector':      ['Inspect ShieldVault commitment status'],
    'gas-profiler':         ['Profile gas costs for all PayPol operations'],
    'recurring-payment':    ['Set up weekly recurring payment of 100 AlphaUSD'],
    'contract-reader':      ['Read all PayPol contract states'],
    'wallet-sweeper':       ['Sweep all tokens to safe wallet 0x...'],
    'escrow-batch-settler': ['Batch settle jobs #1, #2, #3'],
    'chain-monitor':        ['Check Tempo L1 chain health and block info'],
    'tempo-benchmark':      ['Benchmark gas costs: Tempo vs Ethereum'],
    'stream-inspector':     ['Inspect stream #2 milestone details'],
    'contract-deploy-pro':  ['Deploy a production smart contract'],
  };

  return examples[agentId] || [`Use ${agentId} for ${capabilities.join(', ')}`];
}

// ── In-Memory Task Store ───────────────────────────────────
// Production: replace with Redis/DB. This serves A2A protocol tasks.

const taskStore = new Map<string, A2ATask>();

export function getTask(taskId: string): A2ATask | undefined {
  return taskStore.get(taskId);
}

export function setTask(task: A2ATask): void {
  taskStore.set(task.id, task);
}

export function listTasks(contextId?: string, status?: A2ATaskState): A2ATask[] {
  const tasks = [...taskStore.values()];
  return tasks.filter(t => {
    if (contextId && t.contextId !== contextId) return false;
    if (status && t.status.state !== status) return false;
    return true;
  });
}

export function deleteTask(taskId: string): boolean {
  return taskStore.delete(taskId);
}

// ── JSON-RPC Helpers ───────────────────────────────────────

export function jsonRpcSuccess(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

export function jsonRpcError(
  id: string | number,
  error: { code: number; message: string; data?: unknown },
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error };
}
