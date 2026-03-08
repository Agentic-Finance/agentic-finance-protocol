/**
 * Auto-Judge Engine — 3-Layer Automated Dispute Resolution
 *
 * Layer 1: Deterministic Rules (~60% auto-resolution)
 *   - Timeout + no submission → REFUND (100% confidence)
 *   - COMPLETED + proofMatched → SETTLE (95%)
 *   - FAILED status → REFUND (100%)
 *   - No meaningful result → REFUND (90%)
 *
 * Layer 2: Heuristic AI Scoring (~25%)
 *   - Result quality, proof integrity, execution time, agent reputation, relevance
 *   - Weighted composite score → auto-resolve if > 0.75 or < 0.35
 *
 * Layer 3: Human Escalation (~15%)
 *   - Low-confidence cases → escalate to manual arbitrator
 */

import prisma from '@/app/lib/prisma';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface JudgeResult {
  verdict: 'SETTLE' | 'REFUND' | 'ESCALATE';
  confidence: number; // 0.0 - 1.0
  reasoning: string[];
  layer: number; // 1, 2, or 3
  rulesFired: string[];
  scores?: {
    resultQuality: number;
    proofIntegrity: number;
    executionQuality: number;
    agentReputation: number;
    relevance: number;
    composite: number;
  };
}

interface JobWithAgent {
  id: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
    ownerWallet: string;
    totalJobs: number;
    successRate: number;
    avgRating: number;
    ratingCount: number;
    isVerified: boolean;
    responseTime: number;
  };
  clientWallet: string;
  prompt: string;
  taskDescription: string | null;
  budget: number;
  token: string;
  status: string;
  result: string | null;
  disputeReason: string | null;
  deadline: Date | null;
  executionTime: number | null;
  createdAt: Date;
  completedAt: Date | null;
  onChainJobId: number | null;
  escrowTxHash: string | null;
  settleTxHash: string | null;
  planHash: string | null;
  resultHash: string | null;
  commitmentId: string | null;
  commitTxHash: string | null;
  verifyTxHash: string | null;
  proofMatched: boolean | null;
}

// ═══════════════════════════════════════════════════════════
// LAYER 1: DETERMINISTIC RULES
// ═══════════════════════════════════════════════════════════

const RULES = {
  // 100% confidence auto-refund rules
  TIMEOUT_NO_WORK: 'TIMEOUT_NO_WORK',
  FAILED_STATUS: 'FAILED_STATUS',
  NO_RESULT: 'NO_RESULT',
  RESULT_IS_ERROR: 'RESULT_IS_ERROR',

  // High confidence auto-settle rules
  PROOF_MATCHED: 'PROOF_MATCHED',
  HIGH_REP_COMPLETED: 'HIGH_REP_COMPLETED',
  VERIFIED_AGENT_COMPLETED: 'VERIFIED_AGENT_COMPLETED',

  // Medium confidence rules
  RESULT_DELIVERED: 'RESULT_DELIVERED',
  QUICK_EXECUTION: 'QUICK_EXECUTION',
  LONG_OVERDUE: 'LONG_OVERDUE',
} as const;

function evaluateLayer1(job: JobWithAgent): JudgeResult | null {
  const reasoning: string[] = [];
  const rulesFired: string[] = [];

  // ── Rule 1.1: Timeout with no submission → REFUND (100%) ──
  if (job.deadline && new Date(job.deadline).getTime() < Date.now()) {
    if (!job.result || job.status === 'ESCROW_LOCKED' || job.status === 'EXECUTING') {
      rulesFired.push(RULES.TIMEOUT_NO_WORK);
      reasoning.push('Deadline passed with no work submitted');
      return { verdict: 'REFUND', confidence: 1.0, reasoning, layer: 1, rulesFired };
    }
  }

  // ── Rule 1.2: FAILED status → REFUND (100%) ──
  if (job.status === 'FAILED') {
    rulesFired.push(RULES.FAILED_STATUS);
    reasoning.push('Agent execution failed');

    // Check if result contains error details
    try {
      const parsed = job.result ? JSON.parse(job.result) : null;
      if (parsed?.error) reasoning.push(`Error: ${String(parsed.error).slice(0, 100)}`);
    } catch { /* not JSON */ }

    return { verdict: 'REFUND', confidence: 1.0, reasoning, layer: 1, rulesFired };
  }

  // ── Rule 1.3: No result at all → REFUND (95%) ──
  if (job.status === 'COMPLETED' && (!job.result || job.result.trim() === '' || job.result === 'null')) {
    rulesFired.push(RULES.NO_RESULT);
    reasoning.push('Job marked completed but no result delivered');
    return { verdict: 'REFUND', confidence: 0.95, reasoning, layer: 1, rulesFired };
  }

  // ── Rule 1.4: Result is just an error object → REFUND (90%) ──
  if (job.status === 'COMPLETED' && job.result) {
    try {
      const parsed = JSON.parse(job.result);
      if (parsed?.error && !parsed?.output && !parsed?.result) {
        rulesFired.push(RULES.RESULT_IS_ERROR);
        reasoning.push(`Result contains only an error: ${String(parsed.error).slice(0, 80)}`);
        return { verdict: 'REFUND', confidence: 0.90, reasoning, layer: 1, rulesFired };
      }
    } catch { /* not JSON, check as string */
      const lower = job.result.toLowerCase();
      if (lower.startsWith('error') || lower.startsWith('failed') || lower.startsWith('exception')) {
        rulesFired.push(RULES.RESULT_IS_ERROR);
        reasoning.push('Result appears to be an error message');
        return { verdict: 'REFUND', confidence: 0.85, reasoning, layer: 1, rulesFired };
      }
    }
  }

  // ── Rule 1.5: COMPLETED + proofMatched === true → SETTLE (95%) ──
  if (job.status === 'COMPLETED' && job.proofMatched === true && job.commitTxHash && job.verifyTxHash) {
    rulesFired.push(RULES.PROOF_MATCHED);
    reasoning.push('AI Proof verified on-chain: plan matches result');
    reasoning.push(`Commit TX: ${job.commitTxHash.slice(0, 16)}...`);
    reasoning.push(`Verify TX: ${job.verifyTxHash.slice(0, 16)}...`);
    return { verdict: 'SETTLE', confidence: 0.95, reasoning, layer: 1, rulesFired };
  }

  // ── Rule 1.6: Verified agent + COMPLETED + high success rate → SETTLE (90%) ──
  if (
    job.status === 'COMPLETED' &&
    job.agent.isVerified &&
    job.agent.successRate >= 95 &&
    job.agent.totalJobs >= 10 &&
    job.result &&
    job.result.length > 20
  ) {
    rulesFired.push(RULES.VERIFIED_AGENT_COMPLETED);
    reasoning.push(`Verified agent "${job.agent.name}" with ${job.agent.successRate}% success rate`);
    reasoning.push(`${job.agent.totalJobs} total jobs completed`);
    return { verdict: 'SETTLE', confidence: 0.90, reasoning, layer: 1, rulesFired };
  }

  // ── Rule 1.7: High reputation + COMPLETED → SETTLE (88%) ──
  if (
    job.status === 'COMPLETED' &&
    job.agent.successRate >= 90 &&
    job.agent.totalJobs >= 5 &&
    job.agent.avgRating >= 4.0 &&
    job.result &&
    job.result.length > 10
  ) {
    rulesFired.push(RULES.HIGH_REP_COMPLETED);
    reasoning.push(`High-reputation agent: ${job.agent.successRate}% success, ${job.agent.avgRating}/5 rating`);
    return { verdict: 'SETTLE', confidence: 0.88, reasoning, layer: 1, rulesFired };
  }

  // No deterministic rule matched → pass to Layer 2
  return null;
}

// ═══════════════════════════════════════════════════════════
// LAYER 2: HEURISTIC AI SCORING
// ═══════════════════════════════════════════════════════════

function scoreResultQuality(job: JobWithAgent): number {
  if (!job.result) return 0;

  let score = 0;
  const result = job.result;

  // Non-empty result
  if (result.length > 0) score += 15;

  // Substantial result (> 50 chars)
  if (result.length > 50) score += 15;

  // Contains structured data
  try {
    const parsed = JSON.parse(result);
    if (typeof parsed === 'object' && parsed !== null) score += 15;
    if (parsed?.output || parsed?.result || parsed?.data) score += 10;
    if (parsed?.txHash || parsed?.metadata) score += 5;
    // Penalize if only error
    if (parsed?.error && !parsed?.output) score -= 20;
  } catch {
    // Plain text result
    if (result.length > 100) score += 10;
  }

  // No error keywords
  const lower = result.toLowerCase();
  const errorWords = ['error', 'failed', 'exception', 'timeout', 'undefined'];
  const hasErrors = errorWords.some(w => lower.includes(w));
  if (!hasErrors) score += 15;

  // Result references prompt keywords
  const promptWords = (job.prompt || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const matchedWords = promptWords.filter(w => lower.includes(w));
  if (promptWords.length > 0) {
    const matchRatio = matchedWords.length / promptWords.length;
    score += Math.round(matchRatio * 25);
  }

  return Math.max(0, Math.min(100, score));
}

function scoreProofIntegrity(job: JobWithAgent): number {
  let score = 0;

  if (job.planHash) score += 25;
  if (job.resultHash) score += 25;
  if (job.commitmentId || job.commitTxHash) score += 25;
  if (job.proofMatched !== null) score += 15;
  if (job.proofMatched === true) score += 10;

  return Math.min(100, score);
}

function scoreExecutionQuality(job: JobWithAgent): number {
  let score = 0;

  // Execution time recorded
  if (job.executionTime != null && job.executionTime > 0) score += 20;

  // Reasonable execution time (< 120s)
  if (job.executionTime != null && job.executionTime < 120) score += 20;

  // Not suspiciously fast (> 1s means agent actually processed)
  if (job.executionTime != null && job.executionTime >= 1) score += 15;

  // completedAt recorded
  if (job.completedAt) score += 20;

  // Was within deadline
  if (job.deadline && job.completedAt) {
    if (new Date(job.completedAt).getTime() <= new Date(job.deadline).getTime()) {
      score += 25;
    }
  } else if (!job.deadline) {
    score += 15; // No deadline = can't penalize
  }

  return Math.min(100, score);
}

function scoreAgentReputation(job: JobWithAgent): number {
  const agent = job.agent;
  let score = 0;

  // Success rate
  if (agent.successRate >= 95) score += 30;
  else if (agent.successRate >= 80) score += 20;
  else if (agent.successRate >= 60) score += 10;

  // Total jobs (experience)
  if (agent.totalJobs >= 20) score += 20;
  else if (agent.totalJobs >= 10) score += 15;
  else if (agent.totalJobs >= 5) score += 10;
  else score += 5; // newcomer

  // Rating
  if (agent.avgRating >= 4.5 && agent.ratingCount >= 3) score += 25;
  else if (agent.avgRating >= 3.5) score += 15;
  else if (agent.avgRating > 0) score += 5;

  // Verified status
  if (agent.isVerified) score += 25;

  return Math.min(100, score);
}

function scoreRelevance(job: JobWithAgent): number {
  if (!job.result || !job.prompt) return 30; // can't evaluate

  let score = 0;
  const resultLower = job.result.toLowerCase();
  const promptLower = job.prompt.toLowerCase();

  // Extract meaningful words from prompt (> 3 chars)
  const promptWords = promptLower.split(/\s+/).filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'will', 'your', 'what', 'when', 'where'].includes(w));

  if (promptWords.length === 0) return 50; // can't evaluate

  // Check keyword overlap
  const matched = promptWords.filter(w => resultLower.includes(w));
  const matchRatio = matched.length / promptWords.length;
  score += Math.round(matchRatio * 40);

  // Result length proportional to task (not just "ok" or a single word)
  if (job.result.length > 20) score += 15;
  if (job.result.length > 100) score += 10;

  // Doesn't contain only errors
  const lower = job.result.toLowerCase();
  if (!lower.startsWith('error') && !lower.startsWith('failed')) score += 15;

  // Has actionable output (contains data structures, URLs, hashes, etc.)
  if (/0x[a-f0-9]{10,}/i.test(job.result) || /https?:\/\//.test(job.result)) score += 10;
  try {
    const parsed = JSON.parse(job.result);
    if (parsed?.output || parsed?.summary || parsed?.result) score += 10;
  } catch { /* plain text */ }

  return Math.max(0, Math.min(100, score));
}

function evaluateLayer2(job: JobWithAgent): JudgeResult {
  const resultQuality = scoreResultQuality(job);
  const proofIntegrity = scoreProofIntegrity(job);
  const executionQuality = scoreExecutionQuality(job);
  const agentReputation = scoreAgentReputation(job);
  const relevance = scoreRelevance(job);

  // Weighted composite score
  const composite = Math.round(
    resultQuality * 0.30 +
    proofIntegrity * 0.20 +
    executionQuality * 0.15 +
    agentReputation * 0.20 +
    relevance * 0.15
  );

  const scores = { resultQuality, proofIntegrity, executionQuality, agentReputation, relevance, composite };

  const reasoning: string[] = [];
  const rulesFired: string[] = [];

  reasoning.push(`Composite score: ${composite}/100`);
  reasoning.push(`Result quality: ${resultQuality}/100, Proof: ${proofIntegrity}/100`);
  reasoning.push(`Execution: ${executionQuality}/100, Reputation: ${agentReputation}/100, Relevance: ${relevance}/100`);

  // High composite → SETTLE
  if (composite >= 75) {
    const confidence = Math.min(0.95, composite / 100);
    rulesFired.push('COMPOSITE_HIGH');
    reasoning.push(`High composite score indicates quality work delivery`);

    // Disputed jobs need higher threshold
    if (job.status === 'DISPUTED') {
      if (composite >= 85) {
        reasoning.push('Score exceeds dispute threshold (85) — overriding dispute');
        return { verdict: 'SETTLE', confidence: Math.max(0.78, confidence - 0.05), reasoning, layer: 2, rulesFired, scores };
      } else {
        reasoning.push('Disputed job with borderline score — escalating for human review');
        return { verdict: 'ESCALATE', confidence: confidence - 0.15, reasoning, layer: 2, rulesFired, scores };
      }
    }

    return { verdict: 'SETTLE', confidence, reasoning, layer: 2, rulesFired, scores };
  }

  // Low composite → REFUND
  if (composite <= 35) {
    const confidence = Math.min(0.90, (100 - composite) / 100);
    rulesFired.push('COMPOSITE_LOW');
    reasoning.push(`Low composite score indicates poor work quality`);
    return { verdict: 'REFUND', confidence, reasoning, layer: 2, rulesFired, scores };
  }

  // Medium composite → ESCALATE (uncertain zone)
  rulesFired.push('COMPOSITE_MEDIUM');
  reasoning.push(`Score in uncertain zone (35-75) — requires human review`);

  // If DISPUTED, lean slightly toward refund
  if (job.status === 'DISPUTED' && composite < 55) {
    reasoning.push(`Disputed job with below-average score — leaning toward refund`);
    return { verdict: 'REFUND', confidence: 0.60, reasoning, layer: 2, rulesFired, scores };
  }

  return { verdict: 'ESCALATE', confidence: composite / 100, reasoning, layer: 2, rulesFired, scores };
}

// ═══════════════════════════════════════════════════════════
// LAYER 3: HUMAN ESCALATION
// ═══════════════════════════════════════════════════════════

function evaluateLayer3(job: JobWithAgent): JudgeResult {
  return {
    verdict: 'ESCALATE',
    confidence: 0,
    reasoning: ['Insufficient data for automated judgment — requires human arbitrator'],
    layer: 3,
    rulesFired: ['HUMAN_REQUIRED'],
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN EVALUATION FUNCTION
// ═══════════════════════════════════════════════════════════

export async function evaluateJob(jobId: string): Promise<JudgeResult> {
  const job = await prisma.agentJob.findUnique({
    where: { id: jobId },
    include: { agent: true },
  });

  if (!job) {
    return {
      verdict: 'ESCALATE',
      confidence: 0,
      reasoning: ['Job not found'],
      layer: 3,
      rulesFired: ['JOB_NOT_FOUND'],
    };
  }

  // Cast to our expected type
  const jobWithAgent = job as unknown as JobWithAgent;

  // Layer 1: Deterministic rules
  const layer1 = evaluateLayer1(jobWithAgent);
  if (layer1) return layer1;

  // Layer 2: Heuristic AI scoring
  const layer2 = evaluateLayer2(jobWithAgent);
  if (layer2.verdict !== 'ESCALATE') return layer2;

  // If Layer 2 returned ESCALATE with low confidence, return it
  // Layer 3 is essentially what the ESCALATE verdict represents
  return layer2;
}

// ═══════════════════════════════════════════════════════════
// BATCH EVALUATION — Find and judge eligible jobs
// ═══════════════════════════════════════════════════════════

export interface BatchResult {
  evaluated: number;
  settled: number;
  refunded: number;
  escalated: number;
  errors: number;
  verdicts: Array<{
    jobId: string;
    agentName: string;
    verdict: string;
    confidence: number;
    layer: number;
  }>;
}

export async function evaluateEligibleJobs(): Promise<BatchResult> {
  const result: BatchResult = {
    evaluated: 0,
    settled: 0,
    refunded: 0,
    escalated: 0,
    errors: 0,
    verdicts: [],
  };

  try {
    // Find jobs that need judging:
    // 1. COMPLETED but not yet SETTLED (and no settleTxHash)
    // 2. DISPUTED (needs resolution)
    // 3. FAILED (needs refund)
    // 4. ESCROW_LOCKED/EXECUTING past deadline
    const eligibleJobs = await prisma.agentJob.findMany({
      where: {
        OR: [
          // Completed jobs pending settlement
          {
            status: 'COMPLETED',
            settleTxHash: null,
          },
          // Disputed jobs
          {
            status: 'DISPUTED',
          },
          // Failed jobs not yet refunded
          {
            status: 'FAILED',
            settleTxHash: null,
          },
          // Jobs past deadline that haven't been processed
          {
            status: { in: ['ESCROW_LOCKED', 'EXECUTING'] },
            deadline: { lt: new Date() },
          },
        ],
        // Exclude jobs that already have a verdict
        verdicts: { none: {} },
      },
      include: { agent: true },
      take: 20, // Process in batches of 20
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    for (const job of eligibleJobs) {
      try {
        const verdict = await evaluateJob(job.id);
        result.evaluated++;

        // Store verdict in DB
        await prisma.judgeVerdict.create({
          data: {
            jobId: job.id,
            verdict: verdict.verdict,
            confidence: verdict.confidence,
            reasoning: JSON.stringify(verdict.reasoning),
            layer: verdict.layer,
            rulesFired: JSON.stringify(verdict.rulesFired),
            scores: verdict.scores ? JSON.stringify(verdict.scores) : null,
          },
        });

        // Track stats
        if (verdict.verdict === 'SETTLE') result.settled++;
        else if (verdict.verdict === 'REFUND') result.refunded++;
        else result.escalated++;

        result.verdicts.push({
          jobId: job.id,
          agentName: job.agent?.name || 'Unknown',
          verdict: verdict.verdict,
          confidence: verdict.confidence,
          layer: verdict.layer,
        });

        // Log audit event
        await prisma.auditEvent.create({
          data: {
            agentId: job.agentId,
            agentName: job.agent?.name,
            eventType: 'JUDGE_VERDICT',
            title: `Auto-Judge: ${verdict.verdict}`,
            description: `Layer ${verdict.layer} verdict with ${Math.round(verdict.confidence * 100)}% confidence`,
            metadata: {
              jobId: job.id,
              verdict: verdict.verdict,
              confidence: verdict.confidence,
              layer: verdict.layer,
              rulesFired: verdict.rulesFired,
            } as any,
            severity: verdict.verdict === 'ESCALATE' ? 'WARNING' : 'INFO',
          },
        });

      } catch (err: any) {
        console.error(`[AutoJudge] Error evaluating job ${job.id}:`, err.message);
        result.errors++;
      }
    }
  } catch (err: any) {
    console.error('[AutoJudge] Batch evaluation error:', err.message);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// STATISTICS HELPER
// ═══════════════════════════════════════════════════════════

export async function getJudgeStats() {
  const [
    totalVerdicts,
    settleCount,
    refundCount,
    escalateCount,
    executedCount,
    avgConfidence,
    layerBreakdown,
    recentVerdicts,
  ] = await Promise.all([
    prisma.judgeVerdict.count(),
    prisma.judgeVerdict.count({ where: { verdict: 'SETTLE' } }),
    prisma.judgeVerdict.count({ where: { verdict: 'REFUND' } }),
    prisma.judgeVerdict.count({ where: { verdict: 'ESCALATE' } }),
    prisma.judgeVerdict.count({ where: { executedOnChain: true } }),
    prisma.judgeVerdict.aggregate({ _avg: { confidence: true } }),
    Promise.all([
      prisma.judgeVerdict.count({ where: { layer: 1 } }),
      prisma.judgeVerdict.count({ where: { layer: 2 } }),
      prisma.judgeVerdict.count({ where: { layer: 3 } }),
    ]),
    prisma.judgeVerdict.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            prompt: true,
            budget: true,
            status: true,
            clientWallet: true,
            agent: { select: { name: true, avatarEmoji: true } },
          },
        },
      },
    }),
  ]);

  const autoResolvedRate = totalVerdicts > 0
    ? (((settleCount + refundCount) / totalVerdicts) * 100).toFixed(1)
    : '0.0';

  return {
    totalVerdicts,
    settleCount,
    refundCount,
    escalateCount,
    executedCount,
    avgConfidence: avgConfidence._avg.confidence ?? 0,
    autoResolvedRate: `${autoResolvedRate}%`,
    layerBreakdown: {
      layer1: layerBreakdown[0],
      layer2: layerBreakdown[1],
      layer3: layerBreakdown[2],
    },
    recentVerdicts: recentVerdicts.map(v => ({
      id: v.id,
      jobId: v.jobId,
      verdict: v.verdict,
      confidence: v.confidence,
      layer: v.layer,
      reasoning: JSON.parse(v.reasoning),
      rulesFired: v.rulesFired ? JSON.parse(v.rulesFired) : [],
      scores: v.scores ? JSON.parse(v.scores) : null,
      executedOnChain: v.executedOnChain,
      txHash: v.txHash,
      createdAt: v.createdAt,
      job: v.job,
    })),
  };
}
