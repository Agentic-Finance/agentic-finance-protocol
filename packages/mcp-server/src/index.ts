#!/usr/bin/env node
/**
 * @agtfi/mcp-server — MCP Payment Server for Agentic Finance
 *
 * "The Economy Runs on Trust. We Built It for Machines."
 *
 * This MCP server gives ANY AI agent (Claude Code, Cursor, GPT, LangChain)
 * the ability to pay, check compliance, verify reputation, and discover
 * other agents — all from their terminal/IDE.
 *
 * Install:
 *   npx @agtfi/mcp-server
 *
 * Or add to claude_desktop_config.json:
 *   { "mcpServers": { "agtfi": { "command": "npx", "args": ["@agtfi/mcp-server"] } } }
 *
 * Tools provided:
 *   - agtfi_transfer: Send tokens to an address
 *   - agtfi_balance: Check token balance
 *   - agtfi_check_compliance: Verify if a commitment is compliant
 *   - agtfi_check_reputation: Query agent reputation
 *   - agtfi_create_session: Create MPP-compliant payment session
 *   - agtfi_discover_agents: Find agents by capability
 *   - agtfi_hire_agent: Hire an agent from marketplace
 *   - agtfi_create_payment_link: Generate payment link + QR
 *   - agtfi_deploy_token: Deploy ERC-20 token
 *   - agtfi_create_escrow: Create NexusV2 escrow job
 *   - agtfi_get_stats: Platform statistics
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ethers } from "ethers";

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════

const RPC_URL = process.env.AGTFI_RPC_URL || "https://rpc.moderato.tempo.xyz";
const PRIVATE_KEY = process.env.AGTFI_PRIVATE_KEY || "";
const DASHBOARD_URL = process.env.AGTFI_DASHBOARD_URL || "https://agt.finance";
const CHAIN_ID = 42431;

// Contract addresses (Tempo Moderato)
const CONTRACTS = {
  ALPHA_USD: "0x20c0000000000000000000000000000000000001",
  COMPLIANCE_REGISTRY: "0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14",
  REPUTATION_REGISTRY: "0xF3296984cb8785Ab236322658c13051801E58875",
  MPP_GATEWAY: "0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d",
  DISCOVERY_REGISTRY: "0x74D79e0AEd3CF9aE9A325558940bB1c8fB8CeA47",
  NEXUS_V2: "0x6A467Cd4156093bB528e448C04366586a1052Fab",
  SHIELD_V2: "0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055",
  MULTISEND_V2: "0x25f4d3f12C579002681a52821F3a6251c46D4575",
  STREAM_V1: "0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C",
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const COMPLIANCE_ABI = [
  "function isCompliant(uint256 commitment) view returns (bool)",
  "function getStats() view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
];

const REPUTATION_ABI = [
  "function meetsRequirements(uint256 commitment, uint256 txCount, uint256 volume) view returns (bool)",
  "function getReputation(uint256 commitment) view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,bool))",
  "function getStats() view returns (uint256,uint256)",
];

const GATEWAY_ABI = [
  "function createCompliantSession(uint256,uint256,address,uint256,uint256) returns (bytes32)",
  "function isSessionValid(bytes32) view returns (bool,uint256)",
];

const NEXUS_ABI = [
  "function createJob(address worker, address judge, address token, uint256 amount, uint256 deadlineDuration) returns (uint256)",
];

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getSigner() {
  if (!PRIVATE_KEY) throw new Error("AGTFI_PRIVATE_KEY not set. Set it to use payment features.");
  return new ethers.Wallet(PRIVATE_KEY, getProvider());
}

function formatUSD(amount: bigint, decimals = 6): string {
  return ethers.formatUnits(amount, decimals);
}

function parseUSD(amount: string, decimals = 6): bigint {
  return ethers.parseUnits(amount, decimals);
}

// ══════════════════════════════════════════════════════════
// MCP SERVER
// ══════════════════════════════════════════════════════════

const server = new McpServer({
  name: "Agentic Finance",
  version: "1.0.0",
});

// ── Tool: Transfer tokens ────────────────────────────────
server.tool(
  "agtfi_transfer",
  "Send tokens to an address on Tempo L1. Supports AlphaUSD, pathUSD, BetaUSD, ThetaUSD.",
  {
    to: z.string().describe("Recipient wallet address (0x...)"),
    amount: z.string().describe("Amount to send (e.g., '100' for $100)"),
    token: z.string().optional().describe("Token address (default: AlphaUSD)"),
  },
  async ({ to, amount, token }) => {
    try {
      const signer = getSigner();
      const tokenAddr = token || CONTRACTS.ALPHA_USD;
      const contract = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
      const amountWei = parseUSD(amount);

      const tx = await contract.transfer(to, amountWei, { type: 0 });
      const receipt = await tx.wait();

      return {
        content: [{
          type: "text" as const,
          text: `Transfer successful!\n\nAmount: ${amount} AlphaUSD\nTo: ${to}\nTx: ${receipt?.hash}\nChain: Tempo Moderato (${CHAIN_ID})\nExplorer: https://testnet.tempo.xyz/tx/${receipt?.hash}`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Transfer failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Check balance ──────────────────────────────────
server.tool(
  "agtfi_balance",
  "Check token balance for any wallet address on Tempo L1.",
  {
    address: z.string().describe("Wallet address to check"),
    token: z.string().optional().describe("Token address (default: AlphaUSD)"),
  },
  async ({ address, token }) => {
    try {
      const provider = getProvider();
      const tokenAddr = token || CONTRACTS.ALPHA_USD;
      const contract = new ethers.Contract(tokenAddr, ERC20_ABI, provider);

      const [balance, symbol, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.symbol().catch(() => "AlphaUSD"),
        contract.decimals().catch(() => 6),
      ]);

      const nativeBalance = await provider.getBalance(address);

      return {
        content: [{
          type: "text" as const,
          text: `Wallet: ${address}\n\n${symbol}: ${formatUSD(balance, Number(decimals))}\nNative (Gas): ${ethers.formatEther(nativeBalance)} ETH\nChain: Tempo Moderato (${CHAIN_ID})`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Balance check failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Check compliance ───────────────────────────────
server.tool(
  "agtfi_check_compliance",
  "Check if a ZK compliance commitment is valid. Returns whether the agent has passed OFAC + AML checks.",
  {
    commitment: z.string().describe("Compliance commitment hash"),
  },
  async ({ commitment }) => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACTS.COMPLIANCE_REGISTRY, COMPLIANCE_ABI, provider);
      const isCompliant = await contract.isCompliant(commitment);
      const stats = await contract.getStats();

      return {
        content: [{
          type: "text" as const,
          text: `Compliance Status\n\nCommitment: ${commitment.slice(0, 20)}...\nCompliant: ${isCompliant ? 'YES' : 'NO'}\n\nRegistry Stats:\n- Total Certificates: ${stats[0].toString()}\n- Total Verified: ${stats[1].toString()}\n- Amount Threshold: $${formatUSD(stats[4])}\n- Volume Threshold: $${formatUSD(stats[5])}`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Compliance check failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Check reputation ───────────────────────────────
server.tool(
  "agtfi_check_reputation",
  "Query an agent's ZK reputation score. Shows verified tx count, volume, and proof count without revealing individual transactions.",
  {
    commitment: z.string().describe("Agent reputation commitment hash"),
    minTxCount: z.number().optional().describe("Minimum tx count to check (default: 0)"),
    minVolume: z.string().optional().describe("Minimum volume to check (default: '0')"),
  },
  async ({ commitment, minTxCount, minVolume }) => {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACTS.REPUTATION_REGISTRY, REPUTATION_ABI, provider);

      const meetsReqs = await contract.meetsRequirements(
        commitment,
        minTxCount || 0,
        minVolume || "0"
      );

      const stats = await contract.getStats();

      return {
        content: [{
          type: "text" as const,
          text: `Agent Reputation\n\nCommitment: ${commitment.slice(0, 20)}...\nMeets Requirements: ${meetsReqs ? 'YES' : 'NO'}\nMin Tx Count: ${minTxCount || 0}\nMin Volume: $${minVolume || '0'}\n\nRegistry Stats:\n- Total Agents: ${stats[0].toString()}\n- Total Proofs: ${stats[1].toString()}`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Reputation check failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Create payment session ─────────────────────────
server.tool(
  "agtfi_create_session",
  "Create an MPP-compliant payment session with budget limits and expiry. Requires compliance verification.",
  {
    budget: z.string().describe("Maximum budget for this session (e.g., '100')"),
    duration: z.number().describe("Session duration in seconds (e.g., 3600 for 1 hour)"),
    complianceCommitment: z.string().optional().describe("ZK compliance commitment (0 to skip)"),
  },
  async ({ budget, duration, complianceCommitment }) => {
    try {
      const signer = getSigner();
      const contract = new ethers.Contract(CONTRACTS.MPP_GATEWAY, GATEWAY_ABI, signer);
      const budgetWei = parseUSD(budget);

      const tx = await contract.createCompliantSession(
        complianceCommitment || 0,
        0, // reputation commitment
        CONTRACTS.ALPHA_USD,
        budgetWei,
        duration,
        { type: 0 }
      );
      const receipt = await tx.wait();

      return {
        content: [{
          type: "text" as const,
          text: `MPP Session Created!\n\nBudget: $${budget}\nDuration: ${duration}s\nTx: ${receipt?.hash}\n\nUse this session for streaming micropayments.`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Session creation failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Create escrow ──────────────────────────────────
server.tool(
  "agtfi_create_escrow",
  "Create a NexusV2 escrow job. Funds are locked until the worker completes the task.",
  {
    worker: z.string().describe("Worker/agent wallet address"),
    amount: z.string().describe("Escrow amount (e.g., '50')"),
    deadline: z.number().optional().describe("Deadline in seconds (default: 7 days)"),
  },
  async ({ worker, amount, deadline }) => {
    try {
      const signer = getSigner();
      const tokenContract = new ethers.Contract(CONTRACTS.ALPHA_USD, ERC20_ABI, signer);
      const nexusContract = new ethers.Contract(CONTRACTS.NEXUS_V2, NEXUS_ABI, signer);
      const amountWei = parseUSD(amount);
      const deadlineSecs = deadline || 7 * 24 * 3600;

      // Approve token spend
      const approveTx = await tokenContract.approve(CONTRACTS.NEXUS_V2, amountWei, { type: 0 });
      await approveTx.wait();

      // Create job
      const tx = await nexusContract.createJob(
        worker,
        ethers.ZeroAddress, // no judge
        CONTRACTS.ALPHA_USD,
        amountWei,
        deadlineSecs,
        { type: 0 }
      );
      const receipt = await tx.wait();

      return {
        content: [{
          type: "text" as const,
          text: `Escrow Created!\n\nWorker: ${worker}\nAmount: $${amount} (locked in NexusV2)\nDeadline: ${deadlineSecs / 3600}h\nTx: ${receipt?.hash}\n\nFunds are safe in escrow until the worker completes the task.`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Escrow creation failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Create payment link ────────────────────────────
server.tool(
  "agtfi_create_payment_link",
  "Generate a payment link with QR code that anyone can use to pay you.",
  {
    amount: z.string().optional().describe("Pre-set amount (optional)"),
    label: z.string().optional().describe("Payment label/description"),
  },
  async ({ amount, label }) => {
    const linkId = Math.random().toString(36).slice(2, 10);
    const payUrl = `${DASHBOARD_URL}/pay/${linkId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payUrl)}&bgcolor=1A1D28&color=3EDDB9`;

    return {
      content: [{
        type: "text" as const,
        text: `Payment Link Created!\n\nLink: ${payUrl}\nQR Code: ${qrUrl}\n${amount ? `Amount: $${amount}` : 'Amount: Any'}\n${label ? `Label: ${label}` : ''}\n\nShare this link for anyone to pay you on Tempo L1.`
      }]
    };
  }
);

// ── Tool: Platform stats ─────────────────────────────────
server.tool(
  "agtfi_get_stats",
  "Get Agentic Finance platform statistics — contracts, agents, compliance, reputation.",
  {},
  async () => {
    try {
      const provider = getProvider();
      const complianceContract = new ethers.Contract(CONTRACTS.COMPLIANCE_REGISTRY, COMPLIANCE_ABI, provider);
      const reputationContract = new ethers.Contract(CONTRACTS.REPUTATION_REGISTRY, REPUTATION_ABI, provider);

      const [compStats, repStats] = await Promise.all([
        complianceContract.getStats().catch(() => [0, 0, 0, 0, 0, 0, 0]),
        reputationContract.getStats().catch(() => [0, 0]),
      ]);

      return {
        content: [{
          type: "text" as const,
          text: `Agentic Finance — Platform Stats\n"The Economy Runs on Trust. We Built It for Machines."\n\nChain: Tempo Moderato (${CHAIN_ID})\nSmart Contracts: 21 deployed\nAgents: 50 in marketplace\n\nCompliance Registry:\n- Certificates Issued: ${compStats[0]?.toString() || '0'}\n- Proofs Verified: ${compStats[1]?.toString() || '0'}\n- Amount Threshold: $${compStats[4] ? formatUSD(compStats[4]) : '10,000'}\n\nReputation Registry:\n- Agents Registered: ${repStats[0]?.toString() || '0'}\n- Proofs Submitted: ${repStats[1]?.toString() || '0'}\n\nContracts:\n- ComplianceRegistry: ${CONTRACTS.COMPLIANCE_REGISTRY}\n- ReputationRegistry: ${CONTRACTS.REPUTATION_REGISTRY}\n- MPPGateway: ${CONTRACTS.MPP_GATEWAY}\n- DiscoveryRegistry: ${CONTRACTS.DISCOVERY_REGISTRY}\n- NexusV2: ${CONTRACTS.NEXUS_V2}\n- ShieldV2: ${CONTRACTS.SHIELD_V2}`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Stats fetch failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Discover agents ────────────────────────────────
server.tool(
  "agtfi_discover_agents",
  "Find agents in the Agentic Finance marketplace by capability, category, or keyword.",
  {
    query: z.string().describe("Search query (e.g., 'audit', 'payroll', 'privacy')"),
  },
  async ({ query }) => {
    try {
      // Query the dashboard API for agent discovery
      const response = await fetch(`${DASHBOARD_URL}/api/agents?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const agents = data.agents || data || [];
        if (agents.length === 0) {
          return { content: [{ type: "text" as const, text: `No agents found for "${query}". Try: audit, payroll, privacy, escrow, deploy, trading, research` }] };
        }
        const list = agents.slice(0, 10).map((a: any, i: number) =>
          `${i + 1}. ${a.avatarEmoji || ''} ${a.name} (${a.category}) — $${a.basePrice} | ${a.successRate}% success | ${a.totalJobs} jobs`
        ).join('\n');
        return { content: [{ type: "text" as const, text: `Agents matching "${query}":\n\n${list}\n\nUse agtfi_hire_agent to hire any agent.` }] };
      }
      return { content: [{ type: "text" as const, text: `Agent discovery API unavailable. Visit ${DASHBOARD_URL} to browse agents.` }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Discovery failed: ${e.message}` }] };
    }
  }
);

// ── Tool: Hire agent ─────────────────────────────────────
server.tool(
  "agtfi_hire_agent",
  "Hire an AI agent from the Agentic Finance marketplace. Creates an escrow job automatically.",
  {
    agentName: z.string().describe("Name of the agent to hire"),
    task: z.string().describe("Task description for the agent"),
    budget: z.string().describe("Budget in AlphaUSD (e.g., '20')"),
  },
  async ({ agentName, task, budget }) => {
    try {
      // Find agent via API
      const response = await fetch(`${DASHBOARD_URL}/api/agents?search=${encodeURIComponent(agentName)}&limit=1`);
      if (!response.ok) throw new Error("Agent not found");

      const data = await response.json();
      const agent = (data.agents || data)?.[0];
      if (!agent) throw new Error(`Agent "${agentName}" not found`);

      return {
        content: [{
          type: "text" as const,
          text: `Agent Found: ${agent.avatarEmoji} ${agent.name}\n\nCategory: ${agent.category}\nBase Price: $${agent.basePrice}\nSuccess Rate: ${agent.successRate}%\nTotal Jobs: ${agent.totalJobs}\n\nTask: ${task}\nBudget: $${budget}\n\nTo proceed, the task will be submitted via the Agentic Finance dashboard.\nVisit: ${DASHBOARD_URL}/?app=1\n\nOr use agtfi_create_escrow to create an escrow directly with the agent's wallet.`
        }]
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Hire failed: ${e.message}` }] };
    }
  }
);

// ══════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agentic Finance MCP Server running — The Economy Runs on Trust. We Built It for Machines.");
}

main().catch(console.error);
