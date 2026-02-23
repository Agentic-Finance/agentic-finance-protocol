/**
 * PayPol MCP Server
 *
 * Exposes all native PayPol agents as MCP (Model Context Protocol) tools,
 * allowing Claude and other MCP-compatible clients to hire agents directly.
 *
 * Usage:
 *   node dist/index.js
 *   Then add to Claude Desktop config or connect via MCP client.
 *
 * Protocol: https://modelcontextprotocol.io
 */

import { Server }   from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const AGENT_API = process.env.PAYPOL_AGENT_API ?? 'http://localhost:3001';

// ── Tool definitions ──────────────────────────────────────

const TOOLS = [
  {
    name:        'paypol_audit_contract',
    description: 'Audit a Solidity smart contract for security vulnerabilities. Returns a structured report with findings, severities, and recommendations.',
    inputSchema: {
      type:       'object',
      properties: {
        contractCode: { type: 'string', description: 'Full Solidity source code to audit' },
      },
      required: ['contractCode'],
    },
  },
  {
    name:        'paypol_optimize_yield',
    description: 'Find the best DeFi yield opportunities for a given token and risk profile using live DeFiLlama data.',
    inputSchema: {
      type:       'object',
      properties: {
        token:     { type: 'string', description: 'Token symbol (e.g. USDC, ETH)' },
        amount:    { type: 'number', description: 'Amount in USD to invest' },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Risk tolerance' },
      },
      required: ['token'],
    },
  },
  {
    name:        'paypol_plan_payroll',
    description: 'Optimize a batch payroll. Groups recipients by gas efficiency and produces a ready-to-execute payment schedule.',
    inputSchema: {
      type:       'object',
      properties: {
        employees: {
          type:  'array',
          items: {
            type:       'object',
            properties: {
              name:   { type: 'string' },
              wallet: { type: 'string' },
              amount: { type: 'number' },
              token:  { type: 'string' },
            },
            required: ['wallet', 'amount'],
          },
          description: 'List of employees to pay',
        },
        budget:   { type: 'number', description: 'Optional total budget cap in USD' },
        schedule: { type: 'string', description: 'Payment schedule (immediate | weekly | monthly)' },
      },
      required: ['employees'],
    },
  },
  {
    name:        'paypol_predict_gas',
    description: 'Predict the optimal gas price and best time window to execute an on-chain transaction.',
    inputSchema: {
      type:       'object',
      properties: {
        urgency: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How urgently the transaction must be sent' },
        chain:   { type: 'string', description: 'Target chain (ethereum, polygon...)' },
      },
    },
  },
] as const;

// ── Tool → agent mapping ──────────────────────────────────

const TOOL_TO_AGENT: Record<string, string> = {
  paypol_audit_contract: 'contract-auditor',
  paypol_optimize_yield: 'yield-optimizer',
  paypol_plan_payroll:   'payroll-planner',
  paypol_predict_gas:    'gas-predictor',
};

// ── Helper ────────────────────────────────────────────────

async function executeAgent(agentId: string, prompt: string, payload: Record<string, unknown>) {
  const { data } = await axios.post(`${AGENT_API}/agents/${agentId}/execute`, {
    prompt,
    payload,
    callerWallet: 'mcp-client',
  });
  return data;
}

// ── MCP Server ────────────────────────────────────────────

const server = new Server(
  { name: 'paypol-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS as unknown as typeof TOOLS[number][],
}));

// Execute a tool call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const agentId = TOOL_TO_AGENT[name];

  if (!agentId) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }

  try {
    // Build a natural-language prompt from arguments
    const prompt = args.contractCode
      ? `Audit this Solidity contract:\n${args.contractCode}`
      : JSON.stringify(args);

    const result = await executeAgent(agentId, prompt as string, args as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `PayPol agent error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  process.stderr.write('[paypol-mcp] Server ready\n');
});
