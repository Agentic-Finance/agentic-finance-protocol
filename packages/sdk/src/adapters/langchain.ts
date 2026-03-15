/**
 * Agentic Finance LangChain Adapter
 *
 * Converts Agentic Finance APS-1 agents into LangChain-compatible tools.
 * Works with LangChain, LangGraph, and any LangChain-compatible framework.
 *
 * Usage:
 *   import { toAgentic FinanceLangChainTools, handleLangChainToolCall } from 'agentic-finance-sdk/adapters';
 *
 *   // Get tools for LangChain agent
 *   const tools = toAgentic FinanceLangChainTools();
 *
 *   // Use with LangChain ChatAgent
 *   const agent = new ChatAgent({ tools });
 *
 *   // Handle tool invocations
 *   const result = await handleLangChainToolCall(toolName, args, callerWallet);
 */

import axios from 'axios';

const AGENT_API = process.env.AGTFI_AGENT_API ?? 'http://localhost:3001';

// ── LangChain Tool Definition ──────────────────────────────

export interface LangChainToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  /** Agentic Finance agent ID mapped to this tool */
  _agtfi_agent_id: string;
  /** Agentic Finance agent category */
  _agtfi_category: string;
}

// ── Agent Catalog (all 32 native + dynamic) ───────────────

interface AgentDef {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  params: Record<string, { type: string; description: string; required?: boolean }>;
}

const CORE_AGENTS: AgentDef[] = [
  {
    id: 'escrow-manager', name: 'Escrow Manager', category: 'escrow', price: 0.50,
    description: 'Create, settle, refund, or dispute NexusV2 escrow jobs on Tempo L1',
    params: {
      prompt: { type: 'string', description: 'Natural language instruction (e.g. "Create escrow for 100 AlphaUSD to 0x...")', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address (0x...)', required: true },
    },
  },
  {
    id: 'token-transfer', name: 'Token Transfer', category: 'payments', price: 0.10,
    description: 'Transfer ERC20 tokens on Tempo L1 (AlphaUSD, pathUSD, BetaUSD, ThetaUSD)',
    params: {
      prompt: { type: 'string', description: 'Transfer instruction (e.g. "Send 50 AlphaUSD to 0x...")', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'contract-auditor', name: 'Contract Auditor', category: 'security', price: 5.00,
    description: 'Audit Solidity smart contracts for security vulnerabilities on Tempo L1',
    params: {
      prompt: { type: 'string', description: 'Contract code or audit instruction', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'payroll-planner', name: 'Payroll Planner', category: 'payroll', price: 2.00,
    description: 'Plan and execute batch payroll payments via MultisendVaultV2',
    params: {
      prompt: { type: 'string', description: 'Payroll instruction (e.g. "Pay Alice 100, Bob 200...")', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'proof-verifier', name: 'AI Proof Verifier', category: 'verification', price: 0.25,
    description: 'Commit and verify AI execution proofs on the AIProofRegistry',
    params: {
      prompt: { type: 'string', description: 'Proof instruction (e.g. "Commit plan hash for job 123")', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'stream-creator', name: 'Stream Creator', category: 'streams', price: 0.50,
    description: 'Create milestone-based payment streams on StreamV1',
    params: {
      prompt: { type: 'string', description: 'Stream instruction', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'balance-scanner', name: 'Balance Scanner', category: 'analytics', price: 0.10,
    description: 'Scan token balances and portfolio analysis across Tempo L1 tokens',
    params: {
      prompt: { type: 'string', description: 'Balance query (e.g. "Check balances for 0x...")', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'coordinator-agent', name: 'Multi-Agent Coordinator', category: 'orchestration', price: 3.00,
    description: 'Orchestrate multiple agents in sequence or parallel for complex tasks (A2A)',
    params: {
      prompt: { type: 'string', description: 'Complex task requiring multiple agents', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'shield-executor', name: 'ZK Shield Executor', category: 'privacy', price: 1.00,
    description: 'Execute ZK-SNARK shielded payments via ShieldVaultV2',
    params: {
      prompt: { type: 'string', description: 'Shielded payment instruction', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
  {
    id: 'token-deployer', name: 'Token Deployer', category: 'deployment', price: 5.00,
    description: 'Deploy custom ERC20 tokens on Tempo L1',
    params: {
      prompt: { type: 'string', description: 'Token deployment instruction', required: true },
      callerWallet: { type: 'string', description: 'Your wallet address', required: true },
    },
  },
];

// ── Tool Conversion ────────────────────────────────────────

/**
 * Convert Agentic Finance agents to LangChain-compatible tool definitions.
 * Returns tools that can be used with LangChain agents, ChatModels, or LangGraph.
 */
export function toAgentic FinanceLangChainTools(
  agents?: AgentDef[],
): LangChainToolDefinition[] {
  const catalog = agents ?? CORE_AGENTS;

  return catalog.map(agent => ({
    name: `agtfi_${agent.id.replace(/-/g, '_')}`,
    description: `[Agentic Finance ${agent.category}] ${agent.description}. Price: $${agent.price}/job. APS-1 compliant with on-chain execution.`,
    parameters: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(agent.params).map(([key, def]) => [
          key,
          { type: def.type, description: def.description },
        ]),
      ),
      required: Object.entries(agent.params)
        .filter(([, def]) => def.required)
        .map(([key]) => key),
    },
    _agtfi_agent_id: agent.id,
    _agtfi_category: agent.category,
  }));
}

/**
 * Handle a LangChain tool invocation by routing to the correct Agentic Finance agent.
 * Returns the agent's execution result.
 */
export async function handleLangChainToolCall(
  toolName: string,
  args: Record<string, string>,
  callerWallet?: string,
): Promise<{ success: boolean; result: unknown; agentId: string; executionTimeMs: number }> {
  // Map tool name back to agent ID: agtfi_token_transfer → token-transfer
  const agentId = toolName.replace(/^agtfi_/, '').replace(/_/g, '-');

  const wallet = callerWallet ?? args.callerWallet ?? '0x0000000000000000000000000000000000000000';

  try {
    const { data } = await axios.post(`${AGENT_API}/agents/${agentId}/execute`, {
      jobId: `langchain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt: args.prompt,
      callerWallet: wallet,
      payload: args,
    });

    return {
      success: data.status === 'success',
      result: data.result ?? data,
      agentId,
      executionTimeMs: data.executionTimeMs ?? 0,
    };
  } catch (err: any) {
    return {
      success: false,
      result: { error: err.message },
      agentId,
      executionTimeMs: 0,
    };
  }
}

/**
 * Create a LangChain StructuredTool-compatible class.
 * For use with LangChain's `StructuredTool` base class.
 *
 * Usage:
 *   const toolConfig = createAgentic FinanceStructuredToolConfig('escrow-manager');
 *   const tool = new StructuredTool(toolConfig);
 *   const result = await tool.call({ prompt: '...', callerWallet: '0x...' });
 */
export function createAgentic FinanceStructuredToolConfig(agentId: string) {
  const agent = CORE_AGENTS.find(a => a.id === agentId);
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);

  return {
    name: `agtfi_${agent.id.replace(/-/g, '_')}`,
    description: agent.description,
    schema: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(agent.params).map(([key, def]) => [
          key,
          { type: def.type, description: def.description },
        ]),
      ),
      required: Object.entries(agent.params)
        .filter(([, def]) => def.required)
        .map(([key]) => key),
    },
    func: async (args: Record<string, string>) => {
      const result = await handleLangChainToolCall(`agtfi_${agent.id.replace(/-/g, '_')}`, args);
      return JSON.stringify(result);
    },
  };
}
