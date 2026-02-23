import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'gas-predictor',
  name:         'Gas Price Predictor',
  description:  'Fetches live gas data and predicts the optimal time window to execute a transaction based on urgency and cost targets.',
  category:     'analytics',
  version:      '1.0.0',
  price:        1,
  capabilities: ['gas-forecast', 'optimal-timing', 'cost-estimation'],
};

// ── Gas data helper ───────────────────────────────────────

interface GasData {
  safe:      number;
  propose:   number;
  fast:      number;
  baseFee:   number;
  source:    string;
}

async function fetchGasData(chain: string): Promise<GasData> {
  // Etherscan-compatible endpoint (works for Ethereum mainnet)
  // Replace API key via env for production use
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY ?? 'YourApiKeyToken';
    const { data } = await axios.get(
      `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`,
      { timeout: 5000 },
    );
    if (data.status === '1') {
      return {
        safe:    Number(data.result.SafeGasPrice),
        propose: Number(data.result.ProposeGasPrice),
        fast:    Number(data.result.FastGasPrice),
        baseFee: Number(data.result.suggestBaseFee),
        source:  'etherscan',
      };
    }
  } catch { /* fall through to mock */ }

  // Fallback: return synthetic data so the agent still works without a key
  return { safe: 15, propose: 20, fast: 30, baseFee: 12, source: 'mock' };
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const urgency = (job.payload?.urgency as string) ?? 'medium'; // low | medium | high
  const chain   = (job.payload?.chain   as string) ?? 'ethereum';

  const gasData = await fetchGasData(chain);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
User request: ${job.prompt}
Urgency: ${urgency}
Chain: ${chain}

Current gas prices (Gwei):
${JSON.stringify(gasData, null, 2)}

Return a JSON prediction:
{
  "recommendedGasGwei": 0,
  "strategy": "safe|propose|fast",
  "optimalWindowHours": "e.g. next 1-2 hours",
  "estimatedCostUSD": 0,
  "reasoning": "...",
  "currentMarket": "low|normal|high|very-high"
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    system:     'You are a blockchain gas optimization expert. Analyze gas prices and recommend optimal transaction timing.',
    messages:   [{ role: 'user', content: userMessage }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); }
  catch { result = { rawReport: rawText, gasData }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
