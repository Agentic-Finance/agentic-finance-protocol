/**
 * PayPol MCP Server v2.1
 *
 * Exposes ALL PayPol agents as MCP (Model Context Protocol) tools,
 * allowing Claude and other MCP-compatible clients to:
 *   - Discover and hire any of 32+ specialized AI agents
 *   - Execute on-chain transactions (transfers, escrow, streams)
 *   - Verify AI execution with ZK proofs
 *   - Manage multi-agent orchestration (A2A)
 *
 * v2.1 Features:
 *   - Dynamic agent discovery (fetches from live service)
 *   - Escrow management tools (create, settle, refund, dispute)
 *   - AI Proof tools (commit, verify)
 *   - Reputation lookup
 *   - All 32 native agents + community agents
 *
 * Usage:
 *   PAYPOL_AGENT_API=http://localhost:3001 node dist/index.js
 *   Then add to Claude Desktop's MCP config.
 *
 * Protocol: https://modelcontextprotocol.io
 * APS-1: https://paypol.xyz/aps-1
 */

import { Server }   from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const AGENT_API = process.env.PAYPOL_AGENT_API ?? 'http://localhost:3001';
const DASHBOARD_API = process.env.PAYPOL_DASHBOARD_API ?? 'http://localhost:3000';

// ── Core MCP Tool Definitions ────────────────────────────

const CORE_TOOLS = [
  // ── Agent Execution Tools ─────────────────────────
  {
    name: 'paypol_hire_agent',
    description: 'Hire any PayPol agent by ID. This is the universal tool for executing agent tasks. Supports 32+ specialized agents including: contract-auditor, token-transfer, escrow-manager, payroll-planner, shield-executor, stream-creator, proof-verifier, coordinator-agent, balance-scanner, token-deployer, and more. Use paypol_list_agents to discover available agents.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID (e.g. "contract-auditor", "token-transfer", "escrow-manager")' },
        prompt:   { type: 'string', description: 'Natural language instruction for the agent' },
        caller_wallet: { type: 'string', description: 'Your wallet address (0x...). Use "mcp-client" if not applicable.' },
      },
      required: ['agent_id', 'prompt'],
    },
  },
  {
    name: 'paypol_list_agents',
    description: 'List all available PayPol agents with their capabilities, pricing, and categories. Use this to discover which agents can handle a task.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category: security, escrow, payments, streams, analytics, deployment, privacy, verification, orchestration, payroll, admin' },
      },
    },
  },

  // ── Escrow Management Tools ───────────────────────
  {
    name: 'paypol_create_escrow',
    description: 'Create an on-chain escrow to safely pay an agent. Locks funds in NexusV2 contract. The agent only gets paid after successful completion. Supports dispute resolution and automatic timeout refund.',
    inputSchema: {
      type: 'object',
      properties: {
        worker_wallet: { type: 'string', description: 'Agent wallet address to pay' },
        amount:        { type: 'number', description: 'Amount in USD to lock in escrow' },
        deadline_hours: { type: 'number', description: 'Deadline in hours (default: 48)' },
        token:         { type: 'string', description: 'Token to use (default: AlphaUSD)' },
      },
      required: ['worker_wallet', 'amount'],
    },
  },
  {
    name: 'paypol_settle_escrow',
    description: 'Settle an escrow to release payment to the agent after successful job completion.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'On-chain escrow job ID to settle' },
      },
      required: ['job_id'],
    },
  },

  // ── AI Proof Tools ────────────────────────────────
  {
    name: 'paypol_verify_proof',
    description: 'Verify an AI agent execution proof on-chain. Checks if the agent followed its committed plan. Returns matched/mismatched status from the AIProofRegistry.',
    inputSchema: {
      type: 'object',
      properties: {
        commitment_id: { type: 'string', description: 'Commitment ID from the AIProofRegistry' },
        result_data:   { type: 'string', description: 'The execution result to verify against the commitment' },
      },
      required: ['commitment_id', 'result_data'],
    },
  },

  // ── Payment Tools ─────────────────────────────────
  {
    name: 'paypol_transfer_tokens',
    description: 'Transfer ERC20 tokens on Tempo L1. Supports AlphaUSD, pathUSD, BetaUSD, ThetaUSD. Executes real on-chain transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        recipient:   { type: 'string', description: 'Recipient wallet address (0x...)' },
        amount:      { type: 'number', description: 'Amount to send' },
        token:       { type: 'string', description: 'Token symbol (AlphaUSD, pathUSD, BetaUSD, ThetaUSD)', enum: ['AlphaUSD', 'pathUSD', 'BetaUSD', 'ThetaUSD'] },
      },
      required: ['recipient', 'amount'],
    },
  },
  {
    name: 'paypol_batch_payroll',
    description: 'Execute batch payroll payments to multiple recipients in a single transaction via MultisendVaultV2.',
    inputSchema: {
      type: 'object',
      properties: {
        recipients: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              wallet: { type: 'string', description: 'Recipient wallet' },
              amount: { type: 'number', description: 'Amount to pay' },
              name:   { type: 'string', description: 'Recipient name (optional)' },
            },
            required: ['wallet', 'amount'],
          },
          description: 'List of recipients to pay',
        },
      },
      required: ['recipients'],
    },
  },

  // ── Analytics Tools ───────────────────────────────
  {
    name: 'paypol_check_balance',
    description: 'Check token balances for a wallet on Tempo L1. Returns balances for all supported tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to check (0x...)' },
      },
      required: ['wallet'],
    },
  },
  {
    name: 'paypol_get_reputation',
    description: 'Get the on-chain reputation score for an agent. Returns composite score (0-10000), tier (newcomer/rising/trusted/elite/legend), and breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID or wallet address' },
      },
      required: ['agent_id'],
    },
  },
] as const;

// ── Helper Functions ──────────────────────────────────────

async function executeAgent(agentId: string, prompt: string, payload: Record<string, unknown> = {}) {
  const { data } = await axios.post(`${AGENT_API}/agents/${agentId}/execute`, {
    jobId: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    payload,
    callerWallet: payload.caller_wallet ?? 'mcp-client',
  }, { timeout: 120000 });
  return data;
}

async function listAgents(category?: string) {
  const { data } = await axios.get(`${AGENT_API}/agents`, { timeout: 10000 });
  const agents = Array.isArray(data) ? data : [];
  if (category) {
    return agents.filter((a: any) => a.category === category);
  }
  return agents;
}

// ── Tool Handler Routing ─────────────────────────────────

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'paypol_hire_agent': {
      const agentId = args.agent_id as string;
      const prompt = args.prompt as string;
      const result = await executeAgent(agentId, prompt, args);
      return JSON.stringify(result, null, 2);
    }

    case 'paypol_list_agents': {
      const agents = await listAgents(args.category as string);
      const summary = agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        price: a.price ?? '$0',
        capabilities: a.capabilities?.slice(0, 5) ?? a.skills?.slice(0, 5) ?? [],
        description: a.description?.slice(0, 120),
      }));
      return JSON.stringify({ count: summary.length, agents: summary }, null, 2);
    }

    case 'paypol_create_escrow': {
      const prompt = `Create escrow job: pay ${args.worker_wallet} amount ${args.amount} AlphaUSD with deadline ${args.deadline_hours ?? 48} hours`;
      return JSON.stringify(await executeAgent('escrow-manager', prompt, args), null, 2);
    }

    case 'paypol_settle_escrow': {
      const prompt = `Settle escrow job ID ${args.job_id}`;
      return JSON.stringify(await executeAgent('escrow-manager', prompt, args), null, 2);
    }

    case 'paypol_verify_proof': {
      const prompt = `Verify commitment ${args.commitment_id} against result: ${args.result_data}`;
      return JSON.stringify(await executeAgent('proof-verifier', prompt, args), null, 2);
    }

    case 'paypol_transfer_tokens': {
      const token = args.token ?? 'AlphaUSD';
      const prompt = `Transfer ${args.amount} ${token} to ${args.recipient}`;
      return JSON.stringify(await executeAgent('token-transfer', prompt, args), null, 2);
    }

    case 'paypol_batch_payroll': {
      const recipients = args.recipients as Array<{ wallet: string; amount: number; name?: string }>;
      const lines = recipients.map(r => `${r.name ?? r.wallet}: ${r.amount} AlphaUSD`).join(', ');
      const prompt = `Execute batch payroll: ${lines}`;
      return JSON.stringify(await executeAgent('payroll-planner', prompt, args), null, 2);
    }

    case 'paypol_check_balance': {
      const prompt = `Check all token balances for wallet ${args.wallet}`;
      return JSON.stringify(await executeAgent('balance-scanner', prompt, args), null, 2);
    }

    case 'paypol_get_reputation': {
      try {
        const { data } = await axios.get(`${DASHBOARD_API}/api/reputation`, {
          params: { wallet: args.agent_id },
          timeout: 10000,
        });
        return JSON.stringify(data, null, 2);
      } catch {
        return JSON.stringify({ error: 'Reputation lookup failed', agentId: args.agent_id });
      }
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── MCP Server Setup ─────────────────────────────────────

const server = new Server(
  { name: 'paypol-mcp', version: '2.1.0' },
  { capabilities: { tools: {} } },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: CORE_TOOLS as unknown as typeof CORE_TOOLS[number][],
}));

// Execute a tool call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    const result = await handleToolCall(name, args as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `PayPol error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  process.stderr.write('[paypol-mcp v2.1] Server ready — APS-1 Agent Payment Standard\n');
  process.stderr.write(`[paypol-mcp] Agent API: ${AGENT_API}\n`);
  process.stderr.write(`[paypol-mcp] Tools: ${CORE_TOOLS.length} tools available\n`);
});
