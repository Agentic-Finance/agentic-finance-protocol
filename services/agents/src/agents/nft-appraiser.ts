import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'nft-appraiser',
  name:         'NFT Appraisal Engine',
  description:  'Valuates NFTs using rarity analysis, floor price tracking, trait scoring, and collection trend analysis.',
  category:     'nft',
  version:      '1.0.0',
  price:        100,
  capabilities: ['rarity-analysis', 'floor-tracking', 'trait-scoring', 'collection-trends'],
};

const SYSTEM_PROMPT = `You are an NFT valuation expert.
Analyze the NFT and return a JSON appraisal report:
{
  "summary": "overview",
  "collection": "...",
  "tokenId": "...",
  "estimatedValue": { "low": 0, "mid": 0, "high": 0, "currency": "ETH" },
  "floorPrice": 0,
  "rarityRank": 0,
  "rarityScore": 0,
  "traitAnalysis": [{ "trait": "...", "value": "...", "rarity": "...", "premium": "..." }],
  "collectionTrend": "rising|stable|declining",
  "volumeHistory": { "24h": 0, "7d": 0, "30d": 0 },
  "recommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const nftData = (job.payload?.nft as string) ?? job.prompt;

  if (!nftData?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No NFT data provided.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: nftData }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
