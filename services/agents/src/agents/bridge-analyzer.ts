import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'bridge-analyzer',
  name:         'Bridge Guardian',
  description:  'Analyzes cross-chain bridge protocols for security, fees, and speed. Recommends optimal bridging routes using DeFiLlama bridge data.',
  category:     'security',
  version:      '1.0.0',
  price:        180,
  capabilities: ['bridge-comparison', 'security-scoring', 'fee-analysis', 'route-optimization'],
};

// ── Data Fetchers ─────────────────────────────────────────

interface BridgeProtocol {
  id: number;
  name: string;
  displayName: string;
  volumePrevDay: number;
  volumePrev2Day: number;
  lastDailyVolume: number;
  currentDayVolume: number;
  chains: string[];
}

interface BridgeDetail {
  name: string;
  currentDayVolume: number;
  lastDailyVolume: number;
  dayBeforeLastVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
  chainBreakdown: Record<string, { withdrawals: number; deposits: number }>;
}

async function fetchBridgeList(): Promise<BridgeProtocol[]> {
  try {
    const { data } = await axios.get('https://bridges.llama.fi/bridges?includeChains=true', {
      timeout: 10000,
    });
    return (data.bridges || [])
      .filter((b: any) => b.lastDailyVolume > 100000)
      .sort((a: any, b: any) => (b.lastDailyVolume || 0) - (a.lastDailyVolume || 0))
      .slice(0, 20)
      .map((b: any) => ({
        id: b.id,
        name: b.name,
        displayName: b.displayName || b.name,
        volumePrevDay: b.volumePrevDay || 0,
        volumePrev2Day: b.volumePrev2Day || 0,
        lastDailyVolume: b.lastDailyVolume || 0,
        currentDayVolume: b.currentDayVolume || 0,
        chains: b.chains || [],
      }));
  } catch {
    return [];
  }
}

async function fetchBridgeDetail(bridgeId: number): Promise<BridgeDetail | null> {
  try {
    const { data } = await axios.get(`https://bridges.llama.fi/bridge/${bridgeId}`, {
      timeout: 10000,
    });
    // Aggregate chain breakdown from recent data
    const chainBreakdown: Record<string, { withdrawals: number; deposits: number }> = {};
    if (data.chainBreakdown) {
      for (const [chain, volumes] of Object.entries(data.chainBreakdown)) {
        const vol = volumes as any;
        chainBreakdown[chain] = {
          withdrawals: vol.currentDayVolumeWithdrawals || vol.lastDayVolumeWithdrawals || 0,
          deposits: vol.currentDayVolumeDeposits || vol.lastDayVolumeDeposits || 0,
        };
      }
    }
    return {
      name: data.displayName || data.name || 'Unknown',
      currentDayVolume: data.currentDayVolume || 0,
      lastDailyVolume: data.lastDailyVolume || 0,
      dayBeforeLastVolume: data.dayBeforeLastVolume || 0,
      weeklyVolume: data.weeklyVolume || 0,
      monthlyVolume: data.monthlyVolume || 0,
      chainBreakdown,
    };
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const fromChain = (job.payload?.fromChain as string) ?? '';
  const toChain = (job.payload?.toChain as string) ?? '';
  const amount = (job.payload?.amount as string) ?? '';
  const token = (job.payload?.token as string) ?? 'ETH';

  // Fetch all bridges
  const bridges = await fetchBridgeList();

  // Find bridges that support the requested chains
  const relevantBridges = bridges.filter((b) => {
    if (!fromChain && !toChain) return true;
    const chainsLower = b.chains.map((c) => c.toLowerCase());
    const fromMatch = !fromChain || chainsLower.includes(fromChain.toLowerCase());
    const toMatch = !toChain || chainsLower.includes(toChain.toLowerCase());
    return fromMatch && toMatch;
  });

  // Fetch details for top 5 relevant bridges
  const topBridges = relevantBridges.slice(0, 5);
  const bridgeDetails = await Promise.all(
    topBridges.map((b) => fetchBridgeDetail(b.id))
  );

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
Bridge analysis request:
From chain: ${fromChain || 'Any'}
To chain: ${toChain || 'Any'}
Amount: ${amount || 'Not specified'}
Token: ${token}
User request: ${job.prompt}

Top bridge protocols (by daily volume):
${JSON.stringify(topBridges, null, 2)}

Detailed bridge data:
${JSON.stringify(bridgeDetails.filter(Boolean), null, 2)}

All available bridges summary (top 20 by volume):
${JSON.stringify(bridges.map(b => ({ name: b.displayName, dailyVolume: b.lastDailyVolume, chains: b.chains.slice(0, 10) })), null, 2)}

Analyze these bridge protocols and recommend the best option. Return a JSON response:
{
  "recommendations": [
    {
      "rank": 1,
      "bridgeName": "...",
      "securityScore": 0-100,
      "dailyVolume": 0,
      "supportedChains": ["..."],
      "estimatedFees": "...",
      "estimatedTime": "...",
      "pros": ["..."],
      "cons": ["..."],
      "riskFactors": ["..."]
    }
  ],
  "routeAnalysis": {
    "fromChain": "${fromChain || 'N/A'}",
    "toChain": "${toChain || 'N/A'}",
    "optimalRoute": "...",
    "alternativeRoutes": ["..."]
  },
  "securityInsights": {
    "recentIncidents": ["..."],
    "auditStatus": ["..."],
    "tvlTrend": "increasing|stable|decreasing"
  },
  "summary": "one-paragraph recommendation",
  "warnings": ["..."]
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1536,
    system: 'You are an expert cross-chain bridge security analyst. Evaluate bridge protocols based on security track record, volume, fees, speed, and supported chains. Prioritize security over speed/cost. Flag any bridges with known security incidents.',
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); }
  catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
