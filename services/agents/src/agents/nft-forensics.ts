import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'nft-forensics',
  name:         'NFT Forensics Investigator',
  description:  'Investigates NFT collections for wash trading, suspicious activity, and provenance analysis using on-chain data and marketplace APIs.',
  category:     'security',
  version:      '1.0.0',
  price:        200,
  capabilities: ['wash-trading-detection', 'provenance-analysis', 'collection-health-scoring', 'holder-concentration'],
};

// ── Data Fetchers ─────────────────────────────────────────

interface CollectionStats {
  name: string;
  floorPrice: number;
  volume24h: number;
  volumeAll: number;
  tokenCount: number;
  ownerCount: number;
  onSaleCount: number;
  createdAt: string;
}

async function fetchCollectionData(contractAddress: string): Promise<CollectionStats | null> {
  try {
    // Reservoir API (free tier, no key needed for basic queries)
    const { data } = await axios.get(
      `https://api.reservoir.tools/collections/v7?contract=${contractAddress}&limit=1`,
      { timeout: 10000, headers: { 'accept': 'application/json' } }
    );
    const c = data.collections?.[0];
    if (!c) return null;
    return {
      name: c.name || 'Unknown',
      floorPrice: c.floorAsk?.price?.amount?.native || 0,
      volume24h: c.volume?.['1day'] || 0,
      volumeAll: c.volume?.allTime || 0,
      tokenCount: c.tokenCount || 0,
      ownerCount: c.ownerCount || 0,
      onSaleCount: c.onSaleCount || 0,
      createdAt: c.createdAt || 'unknown',
    };
  } catch {
    return null;
  }
}

async function fetchNftSalesActivity(contractAddress: string): Promise<any[]> {
  try {
    const { data } = await axios.get(
      `https://api.reservoir.tools/sales/v6?contract=${contractAddress}&limit=20`,
      { timeout: 10000, headers: { 'accept': 'application/json' } }
    );
    return (data.sales || []).map((s: any) => ({
      price: s.price?.amount?.native || 0,
      from: s.from,
      to: s.to,
      timestamp: s.timestamp,
      marketplace: s.orderSource || 'unknown',
    }));
  } catch {
    return [];
  }
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const contractAddress = (job.payload?.contractAddress as string) ?? '';
  const collectionSlug = (job.payload?.collectionSlug as string) ?? '';
  const targetAddress = contractAddress || collectionSlug;

  if (!targetAddress) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'Contract address or collection slug is required (payload.contractAddress or payload.collectionSlug)',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  // Fetch data in parallel
  const [collectionStats, salesActivity] = await Promise.all([
    fetchCollectionData(targetAddress),
    fetchNftSalesActivity(targetAddress),
  ]);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
NFT Contract: ${targetAddress}
User request: ${job.prompt}

Collection stats:
${collectionStats ? JSON.stringify(collectionStats, null, 2) : 'Unable to fetch collection data — analyze based on available information'}

Recent sales activity (last 20 sales):
${salesActivity.length > 0 ? JSON.stringify(salesActivity, null, 2) : 'No sales data available'}

Perform a forensic analysis of this NFT collection. Return a JSON response:
{
  "collectionName": "...",
  "healthScore": 0-100,
  "washTradingAnalysis": {
    "riskLevel": "high|medium|low|none",
    "suspiciousPatterns": ["..."],
    "estimatedWashVolumePct": 0,
    "evidence": ["..."]
  },
  "holderAnalysis": {
    "totalHolders": 0,
    "concentrationRisk": "high|medium|low",
    "whaleHoldersPct": 0,
    "uniqueBuyerRatio": 0
  },
  "marketHealth": {
    "floorPriceETH": 0,
    "volumeTrend": "increasing|stable|decreasing",
    "listingRatio": 0,
    "liquidityAssessment": "..."
  },
  "provenanceFlags": ["..."],
  "recommendations": ["..."],
  "overallVerdict": "legitimate|suspicious|high-risk"
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1536,
    system: 'You are an expert NFT forensics investigator specializing in wash trading detection, provenance analysis, and marketplace manipulation. Analyze on-chain data patterns to identify suspicious activity. Be thorough but fair in your assessments.',
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
