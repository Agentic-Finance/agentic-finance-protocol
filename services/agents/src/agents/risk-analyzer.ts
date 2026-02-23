import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'risk-analyzer',
  name:         'Sentinel Risk Analyzer',
  description:  'Performs comprehensive DeFi portfolio risk analysis using DeFiLlama protocol data, TVL trends, and stablecoin metrics to score and assess risk exposure.',
  category:     'security',
  version:      '1.0.0',
  price:        200,
  capabilities: ['protocol-risk-scoring', 'tvl-analysis', 'stablecoin-monitoring', 'portfolio-diversification'],
};

// ── Data Fetchers ─────────────────────────────────────────

interface ProtocolData {
  name: string;
  symbol: string;
  tvl: number;
  change_1h: number;
  change_1d: number;
  change_7d: number;
  category: string;
  chains: string[];
  audits: string;
  audit_links: string[];
  mcap: number;
  staking: number;
}

interface StablecoinData {
  name: string;
  symbol: string;
  pegMechanism: string;
  circulating: number;
  price: number;
  chains: string[];
}

async function fetchProtocols(protocolNames: string[]): Promise<ProtocolData[]> {
  try {
    const { data } = await axios.get('https://api.llama.fi/protocols', { timeout: 15000 });
    const allProtocols = data || [];

    // If specific protocols requested, filter for them
    if (protocolNames.length > 0) {
      const namesLower = protocolNames.map((n) => n.toLowerCase());
      return allProtocols
        .filter((p: any) => {
          const pName = (p.name || '').toLowerCase();
          const pSlug = (p.slug || '').toLowerCase();
          return namesLower.some((n) => pName.includes(n) || pSlug.includes(n) || n.includes(pName));
        })
        .slice(0, 15)
        .map(mapProtocol);
    }

    // Otherwise return top 15 by TVL
    return allProtocols
      .sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))
      .slice(0, 15)
      .map(mapProtocol);
  } catch {
    return [];
  }
}

function mapProtocol(p: any): ProtocolData {
  return {
    name: p.name || 'Unknown',
    symbol: p.symbol || '',
    tvl: p.tvl || 0,
    change_1h: p.change_1h || 0,
    change_1d: p.change_1d || 0,
    change_7d: p.change_7d || 0,
    category: p.category || 'Unknown',
    chains: (p.chains || []).slice(0, 10),
    audits: p.audits || 'unknown',
    audit_links: (p.audit_links || []).slice(0, 3),
    mcap: p.mcap || 0,
    staking: p.staking || 0,
  };
}

async function fetchStablecoins(): Promise<StablecoinData[]> {
  try {
    const { data } = await axios.get(
      'https://stablecoins.llama.fi/stablecoins?includePrices=true',
      { timeout: 10000 }
    );
    return (data.peggedAssets || [])
      .filter((s: any) => (s.circulating?.peggedUSD || 0) > 10_000_000)
      .sort((a: any, b: any) => (b.circulating?.peggedUSD || 0) - (a.circulating?.peggedUSD || 0))
      .slice(0, 15)
      .map((s: any) => ({
        name: s.name || 'Unknown',
        symbol: s.symbol || '',
        pegMechanism: s.pegMechanism || 'unknown',
        circulating: s.circulating?.peggedUSD || 0,
        price: s.price || 1,
        chains: (s.chains || []).slice(0, 5),
      }));
  } catch {
    return [];
  }
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const protocols = (job.payload?.protocols as string[]) ?? [];
  const portfolio = (job.payload?.portfolio as Record<string, number>) ?? {};

  // Build protocol list from both payload fields
  const protocolNames = [...protocols];
  if (Object.keys(portfolio).length > 0) {
    protocolNames.push(...Object.keys(portfolio));
  }

  // Fetch data in parallel
  const [protocolData, stablecoinData] = await Promise.all([
    fetchProtocols(protocolNames),
    fetchStablecoins(),
  ]);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
DeFi Risk Analysis Request:
Protocols to analyze: ${protocolNames.length > 0 ? protocolNames.join(', ') : 'Top protocols by TVL'}
Portfolio holdings: ${Object.keys(portfolio).length > 0 ? JSON.stringify(portfolio) : 'Not specified'}
User request: ${job.prompt}

Protocol data from DeFiLlama:
${JSON.stringify(protocolData, null, 2)}

Stablecoin market data (top 15 by circulating supply):
${JSON.stringify(stablecoinData, null, 2)}

Perform a comprehensive risk analysis. Return a JSON response:
{
  "portfolioRiskScore": 0-100,
  "riskLevel": "critical|high|medium|low|minimal",
  "protocolAnalysis": [
    {
      "protocol": "...",
      "riskScore": 0-100,
      "tvl": 0,
      "tvlTrend": "growing|stable|declining|critical",
      "tvlChange7d": 0,
      "category": "...",
      "auditStatus": "audited|partial|unaudited",
      "riskFactors": ["..."],
      "strengths": ["..."]
    }
  ],
  "stablecoinExposure": {
    "totalExposure": 0,
    "depegRisk": "high|medium|low",
    "recommendations": ["..."]
  },
  "diversificationScore": 0-100,
  "diversificationAnalysis": {
    "chainConcentration": "high|medium|low",
    "categoryConcentration": "high|medium|low",
    "suggestions": ["..."]
  },
  "systemicRisks": [
    {
      "risk": "...",
      "severity": "critical|high|medium|low",
      "affectedProtocols": ["..."],
      "mitigation": "..."
    }
  ],
  "actionItems": [
    {
      "priority": "immediate|short-term|long-term",
      "action": "...",
      "reason": "..."
    }
  ],
  "summary": "one-paragraph risk assessment"
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are an expert DeFi risk analyst specializing in protocol security, TVL analysis, smart contract risk, and portfolio management. Evaluate DeFi protocols based on TVL trends, audit status, chain diversification, and stablecoin exposure. Be thorough and conservative in risk assessments — better to over-warn than under-warn.',
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
