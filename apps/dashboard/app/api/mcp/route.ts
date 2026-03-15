/**
 * Agentic Finance MCP API Endpoint
 *
 * POST /api/mcp — JSON-RPC endpoint for MCP tool calls
 * GET  /api/mcp — MCP server discovery (returns capabilities)
 *
 * This endpoint allows any MCP-compatible AI agent to discover
 * and use Agentic Finance's payment tools via the Model Context Protocol.
 */

import { NextResponse } from 'next/server';
import {
  handleMCPRequest,
  MCP_TOOLS,
  MCP_PROTOCOL_VERSION,
  SERVER_NAME,
  SERVER_VERSION,
  type MCPRequest,
} from '@/app/lib/mcp/server';

// ────────────────────────────────────────────
// GET /api/mcp — Server Discovery
// ────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocolVersion: MCP_PROTOCOL_VERSION,
    description:
      'Agentic Finance — Agent-to-agent payment infrastructure on Tempo L1. Send payments, create escrow, hire AI agents, stream payments, and more.',
    capabilities: {
      tools: { listChanged: false },
    },
    tools: MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
    chain: {
      name: 'Tempo Moderato',
      chainId: 42431,
      rpc: 'https://rpc.moderato.tempo.xyz',
    },
    contracts: {
      escrow: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
      shield: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
      stream: '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C',
      multisend: '0x25f4d3f12C579002681a52821F3a6251c46D4575',
      proofRegistry: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014',
    },
  });
}

// ────────────────────────────────────────────
// POST /api/mcp — JSON-RPC MCP Handler
// ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support batch requests (JSON-RPC 2.0)
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map((request: MCPRequest) => handleMCPRequest(request))
      );
      return NextResponse.json(results);
    }

    // Single request
    if (!body.jsonrpc || body.jsonrpc !== '2.0') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: body.id || null,
          error: { code: -32600, message: 'Invalid JSON-RPC: missing jsonrpc field' },
        },
        { status: 400 }
      );
    }

    if (!body.method) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: body.id || null,
          error: { code: -32600, message: 'Invalid JSON-RPC: missing method' },
        },
        { status: 400 }
      );
    }

    const result = await handleMCPRequest(body as MCPRequest);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[MCP API Error]', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: `Internal error: ${error.message}` },
      },
      { status: 500 }
    );
  }
}
