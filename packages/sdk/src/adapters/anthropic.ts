/**
 * Anthropic Tool-Use Adapter for PayPol Agents
 *
 * Converts PayPol marketplace agents into Anthropic tool-use definitions.
 * Works with Claude's tool-use API (Claude 3 Opus, Sonnet, Haiku, etc.)
 *
 * @example
 * ```typescript
 * import { AgentClient } from 'paypol-sdk';
 * import { toAnthropicTools, handleAnthropicToolUse } from 'paypol-sdk/adapters/anthropic';
 *
 * const client = new AgentClient('https://paypol.xyz');
 * const tools = await toAnthropicTools(client);
 *
 * const response = await anthropic.messages.create({
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: 4096,
 *   tools,
 *   messages: [{ role: 'user', content: 'Audit this smart contract for vulnerabilities' }],
 * });
 *
 * // Handle tool use
 * const toolUse = response.content.find(c => c.type === 'tool_use');
 * if (toolUse) {
 *   const result = await handleAnthropicToolUse(client, toolUse, '0xMyWallet');
 * }
 * ```
 */

import { AgentClient } from '../AgentClient';

// ── Anthropic Types ──────────────────────────────────────

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface AnthropicToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

// ── Agent Catalog ────────────────────────────────────────

const AGENT_CATALOG: { id: string; name: string; description: string; category: string }[] = [
  { id: 'contract-auditor', name: 'Contract Auditor', description: 'Audit Solidity smart contracts for vulnerabilities, reentrancy bugs, and security issues on Tempo L1', category: 'security' },
  { id: 'yield-optimizer', name: 'Yield Optimizer', description: 'Analyze and optimize DeFi yield farming strategies across protocols', category: 'defi' },
  { id: 'payroll-planner', name: 'Payroll Planner', description: 'Plan and execute crypto payroll distributions with tax optimization', category: 'payroll' },
  { id: 'gas-predictor', name: 'Gas Predictor', description: 'Predict gas costs and recommend optimal transaction timing', category: 'analytics' },
  { id: 'arbitrage-scanner', name: 'Arbitrage Scanner', description: 'Scan for cross-DEX arbitrage opportunities in real-time', category: 'defi' },
  { id: 'compliance-advisor', name: 'Compliance Advisor', description: 'Provide regulatory compliance analysis for crypto operations', category: 'compliance' },
  { id: 'nft-forensics', name: 'NFT Forensics', description: 'Analyze NFT provenance, wash trading, and fraud patterns', category: 'security' },
  { id: 'bridge-analyzer', name: 'Bridge Analyzer', description: 'Analyze cross-chain bridge security and capital efficiency', category: 'security' },
  { id: 'dao-advisor', name: 'DAO Advisor', description: 'Provide governance analysis, voting power assessment, and proposal recommendations', category: 'analytics' },
  { id: 'risk-analyzer', name: 'Risk Analyzer', description: 'Assess portfolio risk using VaR, correlation analysis, and mitigation strategies', category: 'analytics' },
  { id: 'crypto-tax-navigator', name: 'Crypto Tax Navigator', description: 'Navigate multi-jurisdiction crypto tax regulations and optimize reporting', category: 'compliance' },
  { id: 'portfolio-rebalancer', name: 'Portfolio Rebalancer', description: 'Rebalance crypto portfolio based on market conditions and risk parameters', category: 'defi' },
  { id: 'token-deployer', name: 'Token Deployer', description: 'Deploy ERC20 tokens with custom parameters on Tempo L1', category: 'deployment' },
  { id: 'airdrop-tracker', name: 'Airdrop Tracker', description: 'Track and claim eligible airdrops for a wallet address', category: 'analytics' },
  { id: 'mev-sentinel', name: 'MEV Sentinel', description: 'Monitor and protect against MEV extraction attacks', category: 'security' },
  { id: 'liquidity-manager', name: 'Liquidity Manager', description: 'Manage LP positions and optimize liquidity provisioning across DEXs', category: 'defi' },
  { id: 'whale-tracker', name: 'Whale Tracker', description: 'Track large wallet movements and whale accumulation patterns', category: 'analytics' },
  { id: 'social-radar', name: 'Social Radar', description: 'Monitor social media sentiment and trending tokens', category: 'analytics' },
  { id: 'omnibridge-router', name: 'OmniBridge Router', description: 'Find optimal cross-chain bridging routes by cost and speed', category: 'defi' },
  { id: 'nft-appraiser', name: 'NFT Appraiser', description: 'Appraise NFT value based on rarity, market data, and collection trends', category: 'analytics' },
  { id: 'proposal-writer', name: 'Proposal Writer', description: 'Draft governance proposals with on-chain analysis and impact assessment', category: 'analytics' },
  { id: 'vesting-planner', name: 'Vesting Planner', description: 'Plan and manage token vesting schedules with cliff and linear unlock', category: 'payroll' },
  { id: 'defi-insurance', name: 'DeFi Insurance', description: 'Analyze DeFi insurance options, coverage gaps, and premium optimization', category: 'defi' },
  { id: 'contract-deploy-pro', name: 'Contract Deploy Pro', description: 'Deploy and verify smart contracts on Tempo L1 with gas optimization', category: 'deployment' },
  { id: 'escrow-guardian', name: 'Escrow Guardian', description: 'Create and manage escrow transactions via NexusV2 smart contract', category: 'escrow' },
  { id: 'shield-master', name: 'Shield Master', description: 'Execute ZK-shielded private payments via ShieldVaultV2', category: 'privacy' },
  { id: 'multisend-pro', name: 'Multisend Pro', description: 'Batch send payments to multiple recipients via MultisendV2', category: 'payments' },
  { id: 'stream-architect', name: 'Stream Architect', description: 'Create and manage milestone-based payment streams via StreamV1', category: 'streams' },
  { id: 'proof-verifier', name: 'Proof Verifier', description: 'Verify AI execution proofs on-chain via AIProofRegistry', category: 'verification' },
  { id: 'agent-coordinator', name: 'Agent Coordinator', description: 'Orchestrate multi-agent A2A workflows with dependency resolution', category: 'orchestration' },
  { id: 'payroll-autopilot', name: 'Payroll Autopilot', description: 'Set up recurring automated payroll with conditional rules', category: 'payroll' },
  { id: 'admin-dashboard', name: 'Admin Dashboard', description: 'Monitor protocol health, TVL, and agent performance metrics', category: 'admin' },
];

// ── Converters ───────────────────────────────────────────

/**
 * Convert PayPol agents to Anthropic tool-use definitions.
 *
 * @param client   AgentClient instance (used for dynamic agent list)
 * @param agentIds Optional filter — only include these agent IDs
 */
export async function toAnthropicTools(
  client?: AgentClient,
  agentIds?: string[],
): Promise<AnthropicTool[]> {
  let agents = AGENT_CATALOG;

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

  if (agentIds) {
    agents = agents.filter(a => agentIds.includes(a.id));
  }

  return agents.map(agent => ({
    name: `paypol_${agent.id.replace(/-/g, '_')}`,
    description: `[PayPol Agent] ${agent.name}: ${agent.description}`,
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: `Task instruction for ${agent.name}. Be specific about what you want analyzed or executed.`,
        },
        payload: {
          type: 'string',
          description: 'Optional JSON string with additional structured data (e.g. contract source code, wallet addresses, parameters)',
        },
      },
      required: ['prompt'],
    },
  }));
}

/**
 * Handle an Anthropic tool use block by dispatching to the correct PayPol agent.
 *
 * @param client       AgentClient instance
 * @param toolUse      The tool_use block from Claude's response
 * @param callerWallet Wallet address of the caller
 * @returns            AnthropicToolResult ready to send back in the conversation
 */
export async function handleAnthropicToolUse(
  client: AgentClient,
  toolUse: AnthropicToolUse,
  callerWallet: string,
): Promise<AnthropicToolResult> {
  const agentId = toolUse.name.replace('paypol_', '').replace(/_/g, '-');
  const input = toolUse.input as { prompt?: string; payload?: string };

  if (!input.prompt) {
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify({ error: 'Missing required "prompt" parameter' }),
    };
  }

  try {
    const result = await client.hire(
      agentId,
      input.prompt,
      callerWallet,
      {
        payload: input.payload ? JSON.parse(input.payload) : undefined,
      },
    );

    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify(result),
    };
  } catch (err: any) {
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify({ error: err.message || 'Agent execution failed' }),
    };
  }
}

/**
 * Get the static agent catalog (no API call needed).
 */
export function getAgentCatalog() {
  return [...AGENT_CATALOG];
}
