import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'arbitrage-scanner',
  name:         'Flash Arbitrage Sniper',
  description:  'Scans DEX volumes and token prices across chains to identify arbitrage opportunities using DeFiLlama + CoinGecko data.',
  category:     'defi',
  version:      '1.0.0',
  price:        250,
  capabilities: ['arbitrage-detection', 'cross-dex-analysis', 'price-spread-calculation', 'mev-analysis'],
};

// ── Data Fetchers ─────────────────────────────────────────

interface DexProtocol {
  name: string;
  totalVolume24h: number;
  change_1d: number;
  chains: string[];
}

interface TokenPrice {
  [tokenId: string]: { usd: number; usd_24h_change: number };
}

async function fetchDexVolumes(): Promise<DexProtocol[]> {
  try {
    const { data } = await axios.get('https://api.llama.fi/overview/dexs', { timeout: 10000 });
    return (data.protocols || [])
      .filter((p: any) => p.totalVolume24h > 1_000_000)
      .sort((a: any, b: any) => b.totalVolume24h - a.totalVolume24h)
      .slice(0, 15)
      .map((p: any) => ({
        name: p.name,
        totalVolume24h: p.totalVolume24h,
        change_1d: p.change_1d || 0,
        chains: p.chains || [],
      }));
  } catch {
    return [];
  }
}

async function fetchTokenPrices(tokens: string[]): Promise<TokenPrice> {
  try {
    const ids = tokens.join(',');
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { timeout: 8000 }
    );
    return data;
  } catch {
    return {};
  }
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const tokenPair = (job.payload?.tokenPair as string) ?? 'ETH/USDC';
  const chains = (job.payload?.chains as string[]) ?? [];
  const [tokenA, tokenB] = tokenPair.split('/').map(t => t.trim());

  // Fetch live data in parallel
  const tokenIds = [tokenA, tokenB].map(t => t.toLowerCase() === 'eth' ? 'ethereum' : t.toLowerCase() === 'btc' ? 'bitcoin' : t.toLowerCase());
  const [dexVolumes, prices] = await Promise.all([
    fetchDexVolumes(),
    fetchTokenPrices(tokenIds),
  ]);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
Token pair: ${tokenPair}
Target chains: ${chains.length > 0 ? chains.join(', ') : 'All chains'}
User request: ${job.prompt}

Live DEX volume data (top 15 by 24h volume):
${JSON.stringify(dexVolumes, null, 2)}

Token prices:
${JSON.stringify(prices, null, 2)}

Analyze cross-DEX arbitrage opportunities for this token pair. Return a JSON response:
{
  "opportunities": [
    {
      "rank": 1,
      "buyDex": "Uniswap",
      "sellDex": "SushiSwap",
      "chain": "Ethereum",
      "estimatedSpreadPct": 0.5,
      "estimatedProfitUSD": 50,
      "confidence": "high|medium|low",
      "riskFactors": ["slippage", "gas costs"],
      "executionStrategy": "..."
    }
  ],
  "marketConditions": {
    "volatility": "high|medium|low",
    "bestTimeWindow": "...",
    "gasConsiderations": "..."
  },
  "summary": "one-paragraph analysis",
  "warnings": ["..."]
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1536,
    system: 'You are an expert MEV and DeFi arbitrage analyst. Analyze DEX data to identify profitable cross-exchange arbitrage opportunities. Be realistic about risks and costs. Always include gas costs and slippage in profit calculations.',
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
