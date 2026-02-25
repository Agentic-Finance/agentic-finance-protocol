/**
 * OpenAI Function-Calling Adapter for PayPol Agents
 *
 * Converts PayPol marketplace agents into OpenAI function-calling tools.
 * Works with the OpenAI Chat Completions API (GPT-4, GPT-3.5-turbo, etc.)
 *
 * @example
 * ```typescript
 * import { AgentClient } from 'paypol-sdk';
 * import { toOpenAITools, handleOpenAIToolCall } from 'paypol-sdk/adapters/openai';
 *
 * const client = new AgentClient('https://paypol.xyz');
 * const tools = await toOpenAITools(client);
 *
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Audit this Solidity contract' }],
 *   tools,
 * });
 *
 * // Handle tool call
 * const toolCall = response.choices[0].message.tool_calls?.[0];
 * if (toolCall) {
 *   const result = await handleOpenAIToolCall(client, toolCall, '0xMyWallet');
 * }
 * ```
 */

import { AgentClient } from '../AgentClient';

// ── OpenAI Types ─────────────────────────────────────────

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required: string[];
    };
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ── Agent Catalog ────────────────────────────────────────

const AGENT_CATALOG: { id: string; name: string; description: string; category: string }[] = [
  { id: 'contract-auditor', name: 'Contract Auditor', description: 'Audit Solidity smart contracts for vulnerabilities and security issues', category: 'security' },
  { id: 'yield-optimizer', name: 'Yield Optimizer', description: 'Analyze and optimize DeFi yield farming strategies', category: 'defi' },
  { id: 'payroll-planner', name: 'Payroll Planner', description: 'Plan and execute crypto payroll distributions', category: 'payroll' },
  { id: 'gas-predictor', name: 'Gas Predictor', description: 'Predict gas costs and optimal transaction timing', category: 'analytics' },
  { id: 'arbitrage-scanner', name: 'Arbitrage Scanner', description: 'Scan for cross-DEX arbitrage opportunities', category: 'defi' },
  { id: 'compliance-advisor', name: 'Compliance Advisor', description: 'Provide regulatory compliance analysis for crypto operations', category: 'compliance' },
  { id: 'nft-forensics', name: 'NFT Forensics', description: 'Analyze NFT provenance and detect fraud patterns', category: 'security' },
  { id: 'bridge-analyzer', name: 'Bridge Analyzer', description: 'Analyze cross-chain bridge security and efficiency', category: 'security' },
  { id: 'dao-advisor', name: 'DAO Advisor', description: 'Provide governance analysis and proposal recommendations', category: 'analytics' },
  { id: 'risk-analyzer', name: 'Risk Analyzer', description: 'Assess portfolio risk and provide mitigation strategies', category: 'analytics' },
  { id: 'crypto-tax-navigator', name: 'Crypto Tax Navigator', description: 'Navigate crypto tax regulations and optimize reporting', category: 'compliance' },
  { id: 'portfolio-rebalancer', name: 'Portfolio Rebalancer', description: 'Rebalance crypto portfolio based on market conditions', category: 'defi' },
  { id: 'token-deployer', name: 'Token Deployer', description: 'Deploy ERC20 tokens with custom parameters on Tempo L1', category: 'deployment' },
  { id: 'airdrop-tracker', name: 'Airdrop Tracker', description: 'Track and claim eligible airdrops for a wallet', category: 'analytics' },
  { id: 'mev-sentinel', name: 'MEV Sentinel', description: 'Monitor and protect against MEV attacks', category: 'security' },
  { id: 'liquidity-manager', name: 'Liquidity Manager', description: 'Manage LP positions and optimize liquidity provisioning', category: 'defi' },
  { id: 'whale-tracker', name: 'Whale Tracker', description: 'Track large wallet movements and whale activity', category: 'analytics' },
  { id: 'social-radar', name: 'Social Radar', description: 'Monitor social media sentiment for crypto assets', category: 'analytics' },
  { id: 'omnibridge-router', name: 'OmniBridge Router', description: 'Find optimal cross-chain bridging routes', category: 'defi' },
  { id: 'nft-appraiser', name: 'NFT Appraiser', description: 'Appraise NFT value based on market data', category: 'analytics' },
  { id: 'proposal-writer', name: 'Proposal Writer', description: 'Draft governance proposals for DAOs', category: 'analytics' },
  { id: 'vesting-planner', name: 'Vesting Planner', description: 'Plan and manage token vesting schedules', category: 'payroll' },
  { id: 'defi-insurance', name: 'DeFi Insurance', description: 'Analyze DeFi insurance options and coverage', category: 'defi' },
  { id: 'contract-deploy-pro', name: 'Contract Deploy Pro', description: 'Deploy and verify smart contracts on Tempo L1', category: 'deployment' },
  { id: 'escrow-guardian', name: 'Escrow Guardian', description: 'Create and manage escrow transactions on NexusV2', category: 'escrow' },
  { id: 'shield-master', name: 'Shield Master', description: 'Execute ZK-shielded private payments via ShieldVaultV2', category: 'privacy' },
  { id: 'multisend-pro', name: 'Multisend Pro', description: 'Batch send payments to multiple recipients via MultisendV2', category: 'payments' },
  { id: 'stream-architect', name: 'Stream Architect', description: 'Create and manage milestone-based payment streams', category: 'streams' },
  { id: 'proof-verifier', name: 'Proof Verifier', description: 'Verify AI execution proofs on-chain via AIProofRegistry', category: 'verification' },
  { id: 'agent-coordinator', name: 'Agent Coordinator', description: 'Orchestrate multi-agent A2A workflows', category: 'orchestration' },
  { id: 'payroll-autopilot', name: 'Payroll Autopilot', description: 'Set up recurring automated payroll with conditional rules', category: 'payroll' },
  { id: 'admin-dashboard', name: 'Admin Dashboard', description: 'Monitor protocol health, TVL, and agent performance', category: 'admin' },
];

// ── Converters ───────────────────────────────────────────

/**
 * Convert PayPol agents to OpenAI function-calling tools.
 *
 * @param client  AgentClient instance (used for dynamic agent list)
 * @param agentIds  Optional filter — only include these agent IDs
 */
export async function toOpenAITools(
  client?: AgentClient,
  agentIds?: string[],
): Promise<OpenAITool[]> {
  let agents = AGENT_CATALOG;

  // If client provided, try to fetch live agent list
  if (client) {
    try {
      const live = await client.listAgents();
      if (live.length > 0) {
        agents = live.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
        }));
      }
    } catch {
      // Fall back to static catalog
    }
  }

  // Filter if specific IDs requested
  if (agentIds) {
    agents = agents.filter(a => agentIds.includes(a.id));
  }

  return agents.map(agent => ({
    type: 'function' as const,
    function: {
      name: `paypol_${agent.id.replace(/-/g, '_')}`,
      description: `[PayPol Agent] ${agent.name}: ${agent.description}`,
      parameters: {
        type: 'object' as const,
        properties: {
          prompt: {
            type: 'string',
            description: `Task instruction for ${agent.name}`,
          },
          payload: {
            type: 'string',
            description: 'Optional JSON payload with additional data (e.g. contract source code)',
          },
        },
        required: ['prompt'],
      },
    },
  }));
}

/**
 * Handle an OpenAI tool call by dispatching it to the correct PayPol agent.
 *
 * @param client       AgentClient instance
 * @param toolCall     The tool call from OpenAI's response
 * @param callerWallet Wallet address of the caller
 * @returns            JSON string of the agent's result
 */
export async function handleOpenAIToolCall(
  client: AgentClient,
  toolCall: OpenAIToolCall,
  callerWallet: string,
): Promise<string> {
  const fnName = toolCall.function.name;
  const agentId = fnName.replace('paypol_', '').replace(/_/g, '-');

  let args: { prompt: string; payload?: string };
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    return JSON.stringify({ error: 'Invalid tool call arguments' });
  }

  try {
    const result = await client.hire(
      agentId,
      args.prompt,
      callerWallet,
      {
        payload: args.payload ? JSON.parse(args.payload) : undefined,
      },
    );
    return JSON.stringify(result);
  } catch (err: any) {
    return JSON.stringify({ error: err.message || 'Agent execution failed' });
  }
}

/**
 * Get the static agent catalog (no API call needed).
 */
export function getAgentCatalog() {
  return [...AGENT_CATALOG];
}
