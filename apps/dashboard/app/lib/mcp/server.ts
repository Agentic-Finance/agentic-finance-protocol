/**
 * PayPol MCP Server — Model Context Protocol
 * Exposes PayPol payment capabilities as MCP tools
 * Any AI agent (Claude, GPT, Gemini) can use PayPol as a payment tool
 *
 * MCP Spec: https://modelcontextprotocol.io
 * Protocol version: 2025-03-26
 */

import prisma from '@/app/lib/prisma';
import { publicClient, getDaemonWalletClient, getDaemonAccount } from '@/app/lib/tempo/clients';
import { tempoModerato } from '@/app/lib/tempo/chain';
import {
  NEXUS_V2_VIEM_ABI,
  ERC20_VIEM_ABI,
  STREAM_V1_VIEM_ABI,
  SHIELD_V2_VIEM_ABI,
  MULTISEND_V2_VIEM_ABI,
} from '@/app/lib/tempo/contracts';
import {
  PAYPOL_NEXUS_V2_ADDRESS,
  STREAM_V1_ADDRESS,
  PAYPOL_SHIELD_V2_ADDRESS,
  PAYPOL_MULTISEND_V2_ADDRESS,
  SUPPORTED_TOKENS,
  PAYPOL_TREASURY_WALLET,
} from '@/app/lib/constants';
import { formatUnits, parseUnits, keccak256, encodePacked, type Address } from 'viem';

/** Helper: get wallet client with account for writeContract calls */
function getWriteClient() {
  const walletClient = getDaemonWalletClient();
  if (!walletClient) throw new Error('Daemon wallet not configured');
  const account = getDaemonAccount();
  if (!account) throw new Error('Daemon account not configured');
  return { walletClient, account };
}

// ────────────────────────────────────────────
// MCP Protocol Constants
// ────────────────────────────────────────────

export const MCP_PROTOCOL_VERSION = '2025-03-26';
export const SERVER_NAME = 'paypol-mcp';
export const SERVER_VERSION = '1.0.0';

// ────────────────────────────────────────────
// MCP Tool Definitions
// ────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'send_payment',
    description:
      'Send AlphaUSD payment from the daemon treasury to a recipient wallet on Tempo L1. Supports instant settlement via ERC-20 transfer.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient wallet address (0x...)' },
        amount: { type: 'number', description: 'Amount in AlphaUSD (e.g., 10.5)' },
        memo: { type: 'string', description: 'Optional payment memo/note' },
      },
      required: ['to', 'amount'],
    },
  },
  {
    name: 'create_escrow',
    description:
      'Create an escrow-backed job on NexusV2 smart contract. Funds are locked until the worker completes the task. Supports dispute resolution and auto-timeout refund.',
    inputSchema: {
      type: 'object',
      properties: {
        worker: { type: 'string', description: 'Worker/agent wallet address' },
        amount: { type: 'number', description: 'Budget in AlphaUSD' },
        deadline_hours: { type: 'number', description: 'Deadline in hours (default 72)' },
        description: { type: 'string', description: 'Task description' },
      },
      required: ['worker', 'amount'],
    },
  },
  {
    name: 'check_balance',
    description:
      'Check AlphaUSD balance for any wallet address on Tempo L1 (Chain 42431). Returns balance in human-readable format.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: { type: 'string', description: 'Wallet address to check (0x...)' },
        token: { type: 'string', description: 'Token symbol (default: AlphaUSD). Options: AlphaUSD, pathUSD, BetaUSD, ThetaUSD' },
      },
      required: ['wallet'],
    },
  },
  {
    name: 'list_agents',
    description:
      'List available AI agents in the PayPol marketplace. Filter by category, rating, or verification status.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category: security, defi, payroll, analytics, automation, compliance, governance, tax, nft, deployment',
        },
        min_rating: { type: 'number', description: 'Minimum rating (1-5)' },
        verified_only: { type: 'boolean', description: 'Only show verified agents' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'hire_agent',
    description:
      'Hire an AI agent from the PayPol marketplace to perform a task. Creates an escrow-backed job with the agent, including negotiation and execution.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'MarketplaceAgent UUID' },
        prompt: { type: 'string', description: 'Task description / prompt for the agent' },
        budget: { type: 'number', description: 'Budget in AlphaUSD' },
        client_wallet: { type: 'string', description: 'Client wallet address (who is paying)' },
      },
      required: ['agent_id', 'prompt', 'budget', 'client_wallet'],
    },
  },
  {
    name: 'create_stream',
    description:
      'Create a milestone-based payment stream. Funds are released progressively as milestones are completed and approved.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_wallet: { type: 'string', description: 'Agent/worker wallet address' },
        milestones: {
          type: 'array',
          description: 'Array of milestones: [{amount, deliverable}]',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Milestone payment amount' },
              deliverable: { type: 'string', description: 'What to deliver' },
            },
          },
        },
        deadline_hours: { type: 'number', description: 'Stream deadline in hours (default 168)' },
        client_wallet: { type: 'string', description: 'Client wallet address' },
      },
      required: ['agent_wallet', 'milestones', 'client_wallet'],
    },
  },
  {
    name: 'shield_payment',
    description:
      'Create a ZK-shielded (private) payment using Poseidon commitments and PLONK proofs. Hides the transaction amount and recipient from public view.',
    inputSchema: {
      type: 'object',
      properties: {
        recipient: { type: 'string', description: 'Recipient wallet address' },
        amount: { type: 'number', description: 'Amount in AlphaUSD' },
        memo: { type: 'string', description: 'Private memo (not stored on-chain)' },
      },
      required: ['recipient', 'amount'],
    },
  },
  {
    name: 'multisend',
    description:
      'Send batch payments to multiple recipients in a single transaction. Gas-efficient for payroll and distributions.',
    inputSchema: {
      type: 'object',
      properties: {
        payments: {
          type: 'array',
          description: 'Array of payments: [{to, amount}]',
          items: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient address' },
              amount: { type: 'number', description: 'Amount in AlphaUSD' },
            },
          },
        },
        memo: { type: 'string', description: 'Batch memo/label' },
      },
      required: ['payments'],
    },
  },
  {
    name: 'get_tvl',
    description:
      'Get the Total Value Locked (TVL) across all PayPol smart contracts on Tempo L1.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_agent_reputation',
    description:
      'Get the on-chain reputation score and tier for an AI agent on PayPol.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_wallet: { type: 'string', description: 'Agent wallet address' },
      },
      required: ['agent_wallet'],
    },
  },
];

// ────────────────────────────────────────────
// MCP Tool Execution Engine
// ────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (toolName) {
      case 'send_payment':
        return await handleSendPayment(args);
      case 'create_escrow':
        return await handleCreateEscrow(args);
      case 'check_balance':
        return await handleCheckBalance(args);
      case 'list_agents':
        return await handleListAgents(args);
      case 'hire_agent':
        return await handleHireAgent(args);
      case 'create_stream':
        return await handleCreateStream(args);
      case 'shield_payment':
        return await handleShieldPayment(args);
      case 'multisend':
        return await handleMultisend(args);
      case 'get_tvl':
        return await handleGetTVL();
      case 'get_agent_reputation':
        return await handleGetReputation(args);
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}

// ────────────────────────────────────────────
// Tool Handlers
// ────────────────────────────────────────────

async function handleSendPayment(args: Record<string, any>) {
  const { to, amount, memo } = args;
  if (!to || !amount) throw new Error('Missing required fields: to, amount');

  const tokenAddress = SUPPORTED_TOKENS[0].address as Address;
  const parsedAmount = parseUnits(String(amount), 6);

  const { walletClient, account } = getWriteClient();

  const txHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_VIEM_ABI,
    functionName: 'transfer',
    args: [to as Address, parsedAmount],
    account,
    chain: tempoModerato,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          txHash,
          from: PAYPOL_TREASURY_WALLET,
          to,
          amount,
          token: 'AlphaUSD',
          memo: memo || null,
          chain: 'Tempo Moderato (42431)',
        }),
      },
    ],
  };
}

async function handleCreateEscrow(args: Record<string, any>) {
  const { worker, amount, deadline_hours = 72, description } = args;
  if (!worker || !amount) throw new Error('Missing required fields: worker, amount');

  const tokenAddress = SUPPORTED_TOKENS[0].address as Address;
  const parsedAmount = parseUnits(String(amount), 6);
  const deadlineSeconds = BigInt(Math.floor(deadline_hours * 3600));

  const { walletClient, account } = getWriteClient();

  // Approve NexusV2 to spend tokens
  await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_VIEM_ABI,
    functionName: 'approve',
    args: [PAYPOL_NEXUS_V2_ADDRESS as Address, parsedAmount],
    account,
    chain: tempoModerato,
  });

  // Create job on NexusV2
  const txHash = await walletClient.writeContract({
    address: PAYPOL_NEXUS_V2_ADDRESS as Address,
    abi: NEXUS_V2_VIEM_ABI,
    functionName: 'createJob',
    args: [
      worker as Address,
      PAYPOL_TREASURY_WALLET as Address, // judge = daemon
      tokenAddress,
      parsedAmount,
      deadlineSeconds,
    ],
    account,
    chain: tempoModerato,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          txHash,
          worker,
          amount,
          deadline_hours,
          description: description || null,
          contract: PAYPOL_NEXUS_V2_ADDRESS,
        }),
      },
    ],
  };
}

async function handleCheckBalance(args: Record<string, any>) {
  const { wallet, token = 'AlphaUSD' } = args;
  if (!wallet) throw new Error('Missing required field: wallet');

  const tokenInfo = SUPPORTED_TOKENS.find(
    (t) => t.symbol.toLowerCase() === token.toLowerCase()
  ) || SUPPORTED_TOKENS[0];

  const balance = await publicClient.readContract({
    address: tokenInfo.address as Address,
    abi: ERC20_VIEM_ABI,
    functionName: 'balanceOf',
    args: [wallet as Address],
  });

  const formatted = formatUnits(balance as bigint, tokenInfo.decimals);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          wallet,
          token: tokenInfo.symbol,
          balance: formatted,
          raw: (balance as bigint).toString(),
          decimals: tokenInfo.decimals,
        }),
      },
    ],
  };
}

async function handleListAgents(args: Record<string, any>) {
  const { category, min_rating, verified_only, limit = 10 } = args;

  const agents = await prisma.marketplaceAgent.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
      ...(min_rating ? { avgRating: { gte: min_rating } } : {}),
      ...(verified_only ? { isVerified: true } : {}),
    },
    orderBy: [{ isVerified: 'desc' }, { avgRating: 'desc' }, { totalJobs: 'desc' }],
    take: Math.min(limit, 50),
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      skills: true,
      basePrice: true,
      isVerified: true,
      avgRating: true,
      totalJobs: true,
      successRate: true,
      responseTime: true,
      avatarEmoji: true,
      source: true,
    },
  });

  const formatted = agents.map((a) => ({
    ...a,
    skills: JSON.parse(a.skills),
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ agents: formatted, count: formatted.length }),
      },
    ],
  };
}

async function handleHireAgent(args: Record<string, any>) {
  const { agent_id, prompt, budget, client_wallet } = args;
  if (!agent_id || !prompt || !budget || !client_wallet)
    throw new Error('Missing required fields');

  const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agent_id } });
  if (!agent) throw new Error(`Agent not found: ${agent_id}`);
  if (!agent.isActive) throw new Error(`Agent is inactive: ${agent.name}`);

  const job = await prisma.agentJob.create({
    data: {
      agentId: agent.id,
      clientWallet: client_wallet,
      prompt,
      budget,
      token: 'AlphaUSD',
      status: 'CREATED',
      taskDescription: prompt.slice(0, 200),
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          jobId: job.id,
          agent: { id: agent.id, name: agent.name, emoji: agent.avatarEmoji },
          budget,
          status: 'CREATED',
          message: `Job created with agent ${agent.name}. Proceed to escrow lock for execution.`,
        }),
      },
    ],
  };
}

async function handleCreateStream(args: Record<string, any>) {
  const { agent_wallet, milestones, deadline_hours = 168, client_wallet } = args;
  if (!agent_wallet || !milestones || !client_wallet)
    throw new Error('Missing required fields');

  const totalBudget = milestones.reduce(
    (sum: number, m: any) => sum + (m.amount || 0),
    0
  );

  const streamJob = await prisma.streamJob.create({
    data: {
      clientWallet: client_wallet,
      agentWallet: agent_wallet,
      totalBudget,
      status: 'ACTIVE',
      deadline: new Date(Date.now() + deadline_hours * 3600 * 1000),
      milestones: {
        create: milestones.map((m: any, i: number) => ({
          index: i,
          amount: m.amount,
          deliverable: m.deliverable || `Milestone ${i + 1}`,
          status: 'PENDING',
        })),
      },
    },
    include: { milestones: true },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          streamId: streamJob.id,
          totalBudget,
          milestoneCount: milestones.length,
          deadline: streamJob.deadline,
          milestones: streamJob.milestones.map((m) => ({
            index: m.index,
            amount: m.amount,
            deliverable: m.deliverable,
            status: m.status,
          })),
        }),
      },
    ],
  };
}

async function handleShieldPayment(args: Record<string, any>) {
  const { recipient, amount, memo } = args;
  if (!recipient || !amount) throw new Error('Missing required fields');

  // Create a shielded payment request via TimeVaultPayload
  // The daemon will pick this up and generate the ZK proof
  const payload = await prisma.timeVaultPayload.create({
    data: {
      workspaceId: 'mcp-shield', // use default MCP workspace
      name: memo || 'MCP Shield Payment',
      recipientWallet: recipient,
      amount,
      isShielded: true,
      status: 'Pending',
      token: 'AlphaUSD',
    },
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          payloadId: payload.id,
          recipient,
          amount,
          status: 'PENDING_ZK_PROOF',
          message:
            'Shielded payment queued. The daemon will generate Poseidon commitment + PLONK proof and execute via ShieldVaultV2.',
        }),
      },
    ],
  };
}

async function handleMultisend(args: Record<string, any>) {
  const { payments, memo } = args;
  if (!payments || !Array.isArray(payments) || payments.length === 0)
    throw new Error('Missing or empty payments array');

  const recipients = payments.map((p: any) => p.to as Address);
  const amounts = payments.map((p: any) => parseUnits(String(p.amount), 6));
  const totalAmount = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

  const batchId = keccak256(
    encodePacked(
      ['string', 'uint256'],
      [memo || 'mcp-batch', BigInt(Date.now())]
    )
  );

  const { walletClient, account } = getWriteClient();

  const tokenAddress = SUPPORTED_TOKENS[0].address as Address;

  // Approve MultisendV2
  await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_VIEM_ABI,
    functionName: 'approve',
    args: [PAYPOL_MULTISEND_V2_ADDRESS as Address, parseUnits(String(totalAmount), 6)],
    account,
    chain: tempoModerato,
  });

  // Deposit to MultisendV2
  await walletClient.writeContract({
    address: PAYPOL_MULTISEND_V2_ADDRESS as Address,
    abi: MULTISEND_V2_VIEM_ABI,
    functionName: 'depositFunds',
    args: [parseUnits(String(totalAmount), 6)],
    account,
    chain: tempoModerato,
  });

  // Execute batch
  const txHash = await walletClient.writeContract({
    address: PAYPOL_MULTISEND_V2_ADDRESS as Address,
    abi: MULTISEND_V2_VIEM_ABI,
    functionName: 'executePublicBatch',
    args: [recipients, amounts, batchId],
    account,
    chain: tempoModerato,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          txHash,
          batchId,
          recipientCount: payments.length,
          totalAmount,
          memo: memo || null,
        }),
      },
    ],
  };
}

async function handleGetTVL() {
  const tokenAddress = SUPPORTED_TOKENS[0].address as Address;
  const contracts = [
    { name: 'NexusV2 (Escrow)', address: PAYPOL_NEXUS_V2_ADDRESS },
    { name: 'ShieldVaultV2 (Privacy)', address: PAYPOL_SHIELD_V2_ADDRESS },
    { name: 'StreamV1 (Milestones)', address: STREAM_V1_ADDRESS },
    { name: 'MultisendV2 (Batch)', address: PAYPOL_MULTISEND_V2_ADDRESS },
  ];

  const balances = await Promise.all(
    contracts.map(async (c) => {
      const bal = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_VIEM_ABI,
        functionName: 'balanceOf',
        args: [c.address as Address],
      });
      const formatted = parseFloat(formatUnits(bal as bigint, 6));
      return { name: c.name, address: c.address, balance: formatted };
    })
  );

  const totalTVL = balances.reduce((sum, b) => sum + b.balance, 0);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          totalTVL: `$${totalTVL.toFixed(2)}`,
          chain: 'Tempo Moderato (42431)',
          token: 'AlphaUSD',
          contracts: balances,
        }),
      },
    ],
  };
}

async function handleGetReputation(args: Record<string, any>) {
  const { agent_wallet } = args;
  if (!agent_wallet) throw new Error('Missing required field: agent_wallet');

  // Fetch from database
  const agent = await prisma.marketplaceAgent.findFirst({
    where: { ownerWallet: agent_wallet },
    include: {
      _count: { select: { jobs: true, reviews: true } },
    },
  });

  // Fetch completed/failed stats
  const [completedJobs, failedJobs] = await Promise.all([
    prisma.agentJob.count({
      where: { agent: { ownerWallet: agent_wallet }, status: 'COMPLETED' },
    }),
    prisma.agentJob.count({
      where: { agent: { ownerWallet: agent_wallet }, status: 'FAILED' },
    }),
  ]);

  const tier =
    completedJobs >= 100
      ? 'Legend'
      : completedJobs >= 50
        ? 'Expert'
        : completedJobs >= 20
          ? 'Veteran'
          : completedJobs >= 5
            ? 'Active'
            : 'Newcomer';

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          wallet: agent_wallet,
          agent: agent
            ? { name: agent.name, emoji: agent.avatarEmoji, verified: agent.isVerified }
            : null,
          stats: {
            totalJobs: completedJobs + failedJobs,
            completedJobs,
            failedJobs,
            successRate:
              completedJobs + failedJobs > 0
                ? ((completedJobs / (completedJobs + failedJobs)) * 100).toFixed(1) + '%'
                : 'N/A',
            avgRating: agent?.avgRating || 0,
            tier,
          },
        }),
      },
    ],
  };
}

// ────────────────────────────────────────────
// MCP JSON-RPC Handler
// ────────────────────────────────────────────

export interface MCPRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

export async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      };

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      if (!name) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: 'Missing tool name' },
        };
      }
      const tool = MCP_TOOLS.find((t) => t.name === name);
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        };
      }
      const result = await executeTool(name, args || {});
      return { jsonrpc: '2.0', id, result };
    }

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}
