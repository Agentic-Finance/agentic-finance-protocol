import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AgentDescriptor, AgentHandler, JobResult } from '../types';

// ── Manifest ──────────────────────────────────────────────

export const manifest: AgentDescriptor = {
  id:           'dao-advisor',
  name:         'DAO Governance Advisor',
  description:  'Analyzes DAO proposals, voting patterns, and governance health using Snapshot data. Provides voting recommendations and governance insights.',
  category:     'governance',
  version:      '1.0.0',
  price:        120,
  capabilities: ['proposal-analysis', 'voting-recommendations', 'governance-health', 'quorum-tracking'],
};

// ── Data Fetchers ─────────────────────────────────────────

interface SnapshotSpace {
  id: string;
  name: string;
  members: number;
  proposalsCount: number;
  followersCount: number;
  votesCount: number;
  about: string;
}

interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  state: string;
  scores: number[];
  scores_total: number;
  quorum: number;
  votes: number;
  author: string;
  type: string;
}

async function fetchSnapshotSpace(spaceId: string): Promise<SnapshotSpace | null> {
  try {
    const query = `
      query {
        space(id: "${spaceId}") {
          id
          name
          members
          proposalsCount
          followersCount
          votesCount
          about
        }
      }
    `;
    const { data } = await axios.post(
      'https://hub.snapshot.org/graphql',
      { query },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    return data.data?.space || null;
  } catch {
    return null;
  }
}

async function fetchActiveProposals(spaceId: string): Promise<SnapshotProposal[]> {
  try {
    const query = `
      query {
        proposals(
          first: 10,
          skip: 0,
          where: { space_in: ["${spaceId}"] },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          state
          scores
          scores_total
          quorum
          votes
          author
          type
        }
      }
    `;
    const { data } = await axios.post(
      'https://hub.snapshot.org/graphql',
      { query },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    return (data.data?.proposals || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      body: (p.body || '').substring(0, 500), // Truncate long descriptions
      choices: p.choices || [],
      start: p.start,
      end: p.end,
      state: p.state,
      scores: p.scores || [],
      scores_total: p.scores_total || 0,
      quorum: p.quorum || 0,
      votes: p.votes || 0,
      author: p.author || 'unknown',
      type: p.type || 'single-choice',
    }));
  } catch {
    return [];
  }
}

async function fetchProposalById(proposalId: string): Promise<SnapshotProposal | null> {
  try {
    const query = `
      query {
        proposal(id: "${proposalId}") {
          id
          title
          body
          choices
          start
          end
          state
          scores
          scores_total
          quorum
          votes
          author
          type
          space { id name }
        }
      }
    `;
    const { data } = await axios.post(
      'https://hub.snapshot.org/graphql',
      { query },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    const p = data.data?.proposal;
    if (!p) return null;
    return {
      id: p.id,
      title: p.title,
      body: (p.body || '').substring(0, 1000),
      choices: p.choices || [],
      start: p.start,
      end: p.end,
      state: p.state,
      scores: p.scores || [],
      scores_total: p.scores_total || 0,
      quorum: p.quorum || 0,
      votes: p.votes || 0,
      author: p.author || 'unknown',
      type: p.type || 'single-choice',
    };
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────

export const handler: AgentHandler = async (job) => {
  const start = Date.now();

  const space = (job.payload?.space as string) ?? '';
  const proposalId = (job.payload?.proposalId as string) ?? '';

  let spaceData: SnapshotSpace | null = null;
  let proposals: SnapshotProposal[] = [];
  let singleProposal: SnapshotProposal | null = null;

  if (proposalId) {
    // Fetch specific proposal
    singleProposal = await fetchProposalById(proposalId);
  }

  if (space) {
    // Fetch space info and recent proposals in parallel
    [spaceData, proposals] = await Promise.all([
      fetchSnapshotSpace(space),
      fetchActiveProposals(space),
    ]);
  }

  if (!spaceData && !singleProposal && !space && !proposalId) {
    return {
      jobId: job.jobId, agentId: job.agentId, status: 'error',
      error: 'Please provide a Snapshot space (e.g. "aave.eth") or proposal ID in payload.space or payload.proposalId',
      executionTimeMs: Date.now() - start, timestamp: Date.now(),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `
DAO Governance Analysis Request:
Space: ${space || 'N/A'}
Proposal ID: ${proposalId || 'N/A'}
User request: ${job.prompt}

Space information:
${spaceData ? JSON.stringify(spaceData, null, 2) : 'No space data available'}

${singleProposal ? `Specific proposal:\n${JSON.stringify(singleProposal, null, 2)}` : ''}

Recent proposals (up to 10):
${proposals.length > 0 ? JSON.stringify(proposals, null, 2) : 'No proposals found'}

Analyze this DAO's governance. Return a JSON response:
{
  "spaceOverview": {
    "name": "...",
    "healthScore": 0-100,
    "totalMembers": 0,
    "totalProposals": 0,
    "voterParticipationRate": "...",
    "governanceMaturity": "established|growing|nascent"
  },
  "proposalAnalysis": [
    {
      "id": "...",
      "title": "...",
      "status": "active|closed|pending",
      "quorumStatus": "reached|not-reached|close",
      "currentLeadingChoice": "...",
      "marginOfVictory": "...",
      "analysis": "...",
      "recommendation": "for|against|abstain",
      "reasoningPoints": ["..."],
      "riskFactors": ["..."]
    }
  ],
  "governanceInsights": {
    "centralizationRisk": "high|medium|low",
    "voterApathy": "high|medium|low",
    "proposalQuality": "high|medium|low",
    "keyObservations": ["..."]
  },
  "recommendations": ["..."],
  "summary": "one-paragraph governance health summary"
}
Return ONLY valid JSON.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'You are an expert DAO governance analyst specializing in on-chain voting systems, proposal analysis, and decentralized decision-making. Evaluate governance health, voter participation, and proposal quality. Provide balanced, data-driven recommendations.',
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
