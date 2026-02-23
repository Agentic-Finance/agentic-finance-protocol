import Anthropic from '@anthropic-ai/sdk';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

export const manifest: AgentDescriptor = {
  id:           'social-radar',
  name:         'SentiChain Social Radar',
  description:  'Analyzes crypto sentiment across Twitter, Discord, and Telegram. Detects hype cycles, FUD patterns, and influencer activity.',
  category:     'analytics',
  version:      '1.0.0',
  price:        65,
  capabilities: ['sentiment-analysis', 'social-monitoring', 'hype-detection', 'influencer-tracking'],
};

const SYSTEM_PROMPT = `You are a crypto social sentiment analyst.
Analyze the token/project sentiment and return a JSON report:
{
  "summary": "overview",
  "overallSentiment": "very-bullish|bullish|neutral|bearish|very-bearish",
  "sentimentScore": 0,
  "platforms": {
    "twitter": { "mentions": 0, "sentiment": "...", "topInfluencers": ["..."] },
    "discord": { "activity": "high|medium|low", "sentiment": "..." },
    "telegram": { "activity": "high|medium|low", "sentiment": "..." }
  },
  "trendingTopics": ["..."],
  "fudAlerts": ["..."],
  "hypeIndicators": ["..."],
  "recommendations": ["..."]
}
Return ONLY valid JSON.`;

export const handler: AgentHandler = async (job) => {
  const start = Date.now();
  const query = (job.payload?.token as string) ?? job.prompt;

  if (!query?.trim()) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'No token or project specified.',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: query }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  let result: unknown;
  try { result = JSON.parse(rawText); } catch { result = { rawReport: rawText }; }

  return {
    jobId: job.jobId, agentId: job.agentId, status: 'success',
    result, executionTimeMs: Date.now() - start, timestamp: Date.now(),
  } satisfies JobResult;
};
