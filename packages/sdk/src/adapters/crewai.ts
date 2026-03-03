/**
 * PayPol CrewAI Adapter
 *
 * Converts PayPol APS-1 agents into CrewAI-compatible tool definitions.
 * CrewAI uses @tool decorators in Python, but this adapter provides
 * the TypeScript equivalent for CrewAI's Node.js/TypeScript runtime
 * and also generates Python code snippets for Python users.
 *
 * Usage (TypeScript):
 *   import { toCrewAITools, handleCrewAIToolCall, generateCrewAIPython } from 'paypol-sdk/adapters';
 *
 *   // Get tool definitions for CrewAI
 *   const tools = toCrewAITools();
 *
 *   // Generate Python code for CrewAI Python users
 *   const pythonCode = generateCrewAIPython();
 */

import axios from 'axios';

const AGENT_API = process.env.PAYPOL_AGENT_API ?? 'http://localhost:3001';

// ── CrewAI Tool Definition ────────────────────────────────

export interface CrewAIToolDefinition {
  /** Tool name (snake_case) */
  name: string;
  /** Tool description for the AI agent */
  description: string;
  /** Expected arguments */
  args_schema: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
  /** PayPol agent metadata */
  metadata: {
    paypol_agent_id: string;
    category: string;
    price_usd: number;
    aps_version: string;
    on_chain: boolean;
  };
}

// ── Agent Catalog ─────────────────────────────────────────

interface AgentDef {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
}

const AGENT_CATALOG: AgentDef[] = [
  { id: 'escrow-manager', name: 'Escrow Manager', category: 'escrow', price: 0.50,
    description: 'Create, settle, refund, or dispute NexusV2 escrow jobs on Tempo L1 blockchain' },
  { id: 'token-transfer', name: 'Token Transfer', category: 'payments', price: 0.10,
    description: 'Transfer ERC20 tokens (AlphaUSD, pathUSD, BetaUSD, ThetaUSD) on Tempo L1' },
  { id: 'contract-auditor', name: 'Smart Contract Auditor', category: 'security', price: 5.00,
    description: 'Audit Solidity smart contracts for security vulnerabilities and best practices' },
  { id: 'payroll-planner', name: 'Batch Payroll Planner', category: 'payroll', price: 2.00,
    description: 'Plan and execute batch payroll payments via MultisendVaultV2' },
  { id: 'proof-verifier', name: 'AI Proof Verifier', category: 'verification', price: 0.25,
    description: 'Commit and verify AI execution proofs on the AIProofRegistry for accountability' },
  { id: 'stream-creator', name: 'Milestone Stream Creator', category: 'streams', price: 0.50,
    description: 'Create milestone-based payment streams on StreamV1 contract' },
  { id: 'balance-scanner', name: 'Portfolio Scanner', category: 'analytics', price: 0.10,
    description: 'Scan wallet token balances and provide portfolio analysis on Tempo L1' },
  { id: 'coordinator-agent', name: 'Multi-Agent Coordinator', category: 'orchestration', price: 3.00,
    description: 'Orchestrate multiple specialized agents in sequence or parallel for complex tasks' },
  { id: 'shield-executor', name: 'ZK Privacy Executor', category: 'privacy', price: 1.00,
    description: 'Execute zero-knowledge shielded payments via ZK-SNARK proofs on ShieldVaultV2' },
  { id: 'token-deployer', name: 'Token Factory', category: 'deployment', price: 5.00,
    description: 'Deploy custom ERC20 tokens with configurable parameters on Tempo L1' },
  { id: 'gas-profiler', name: 'Gas Profiler', category: 'analytics', price: 0.10,
    description: 'Profile gas costs for smart contract operations on Tempo L1' },
  { id: 'treasury-manager', name: 'Treasury Overview', category: 'analytics', price: 0.25,
    description: 'Provide treasury overview across all PayPol vaults and contracts' },
  { id: 'recurring-payment', name: 'Recurring Payment Scheduler', category: 'payments', price: 0.50,
    description: 'Set up scheduled recurring payments on Tempo L1' },
  { id: 'chain-monitor', name: 'Chain Health Monitor', category: 'analytics', price: 0.10,
    description: 'Monitor Tempo L1 chain health, block times, and network status' },
];

// ── Tool Conversion ────────────────────────────────────────

/**
 * Convert PayPol agents to CrewAI tool definitions.
 */
export function toCrewAITools(agents?: AgentDef[]): CrewAIToolDefinition[] {
  const catalog = agents ?? AGENT_CATALOG;

  return catalog.map(agent => ({
    name: `paypol_${agent.id.replace(/-/g, '_')}`,
    description: `${agent.description}. Costs $${agent.price} per execution. Uses APS-1 protocol with on-chain verification.`,
    args_schema: {
      prompt: {
        type: 'string',
        description: 'Natural language instruction for the agent',
        required: true,
      },
      caller_wallet: {
        type: 'string',
        description: 'Wallet address (0x...) of the caller',
        required: true,
      },
    },
    metadata: {
      paypol_agent_id: agent.id,
      category: agent.category,
      price_usd: agent.price,
      aps_version: '2.1',
      on_chain: true,
    },
  }));
}

/**
 * Handle a CrewAI tool invocation by routing to the correct PayPol agent.
 */
export async function handleCrewAIToolCall(
  toolName: string,
  args: { prompt: string; caller_wallet: string },
): Promise<string> {
  const agentId = toolName.replace(/^paypol_/, '').replace(/_/g, '-');

  try {
    const { data } = await axios.post(`${AGENT_API}/agents/${agentId}/execute`, {
      jobId: `crewai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt: args.prompt,
      callerWallet: args.caller_wallet,
    });

    return JSON.stringify({
      status: data.status,
      result: data.result,
      agentId,
      onChain: data.onChain ?? data.transaction ? true : false,
      executionTimeMs: data.executionTimeMs,
    });
  } catch (err: any) {
    return JSON.stringify({
      status: 'error',
      error: err.message,
      agentId,
    });
  }
}

/**
 * Generate Python code for CrewAI Python users.
 * Returns a complete Python module that wraps the PayPol API.
 */
export function generateCrewAIPython(apiUrl?: string): string {
  const url = apiUrl ?? AGENT_API;
  const agents = AGENT_CATALOG;

  return `"""
PayPol CrewAI Tools - Auto-generated Python adapter
APS-1 Protocol v2.1 - Agent Payment Standard

Usage:
    from paypol_crewai import PayPolAuditTool, PayPolTransferTool

    crew = Crew(
        agents=[auditor_agent, finance_agent],
        tasks=[audit_task, payment_task],
        tools=[PayPolAuditTool(), PayPolTransferTool()],
    )
"""

import json
import requests
from crewai_tools import BaseTool
from pydantic import BaseModel, Field

PAYPOL_API = "${url}"

class PayPolToolInput(BaseModel):
    prompt: str = Field(description="Natural language instruction for the agent")
    caller_wallet: str = Field(description="Wallet address (0x...) of the caller")

def _call_paypol_agent(agent_id: str, prompt: str, caller_wallet: str) -> str:
    """Call a PayPol agent via the APS-1 API."""
    try:
        resp = requests.post(
            f"{PAYPOL_API}/agents/{agent_id}/execute",
            json={
                "jobId": f"crewai-py-{agent_id}",
                "prompt": prompt,
                "callerWallet": caller_wallet,
            },
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        return json.dumps({
            "status": data.get("status"),
            "result": data.get("result"),
            "onChain": bool(data.get("onChain") or data.get("transaction")),
            "executionTimeMs": data.get("executionTimeMs", 0),
        })
    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)})

${agents.map(a => `
class PayPol${a.name.replace(/\s+/g, '')}Tool(BaseTool):
    name: str = "paypol_${a.id.replace(/-/g, '_')}"
    description: str = "${a.description}. Costs $${a.price}/job. APS-1 v2.1."
    args_schema: type[BaseModel] = PayPolToolInput

    def _run(self, prompt: str, caller_wallet: str) -> str:
        return _call_paypol_agent("${a.id}", prompt, caller_wallet)
`).join('')}

# Convenience list of all tools
ALL_PAYPOL_TOOLS = [
${agents.map(a => `    PayPol${a.name.replace(/\s+/g, '')}Tool(),`).join('\n')}
]
`;
}
