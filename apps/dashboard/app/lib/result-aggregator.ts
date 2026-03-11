/**
 * Result Aggregator — A2A Orchestration
 *
 * Combines sub-task results from multiple agents into a single
 * coherent response.  Uses OpenAI to synthesize a human-readable
 * summary with a local concatenation fallback.
 */

import OpenAI from 'openai';

// Lazy-init: avoid throwing at module load when OPENAI_API_KEY is unset (CI builds)
let _openai: OpenAI | null = null;
function getOpenAI() {
    if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
}

// ── Types ────────────────────────────────────────────────────

export interface SubTaskResult {
    stepIndex: number;
    agentId: string;
    agentName: string;
    agentEmoji: string;
    status: 'COMPLETED' | 'FAILED';
    result: any;
    executionTime: number;
    budgetSpent: number;
}

export interface AggregatedResult {
    summary: string;
    subResults: SubTaskResult[];
    totalExecutionTime: number;
    totalBudgetSpent: number;
    successCount: number;
    failureCount: number;
}

// ── Local Fallback ───────────────────────────────────────────

/**
 * Concatenate sub-task outputs with section headers.
 * Used when OpenAI is unavailable.
 */
function localAggregate(rootPrompt: string, subResults: SubTaskResult[]): string {
    const lines: string[] = [];
    lines.push(`Task: ${rootPrompt}`);
    lines.push('');

    for (const sub of subResults) {
        const statusIcon = sub.status === 'COMPLETED' ? '\u2705' : '\u274C';
        lines.push(`${statusIcon} ${sub.agentEmoji} ${sub.agentName} (Step ${sub.stepIndex})`);

        if (sub.status === 'COMPLETED') {
            const output = extractOutput(sub.result);
            lines.push(`  ${output}`);
            lines.push(`  Time: ${sub.executionTime}s | Budget: ${sub.budgetSpent} AlphaUSD`);
        } else {
            const error = sub.result?.error || 'Unknown error';
            lines.push(`  Failed: ${error}`);
        }
        lines.push('');
    }

    return lines.join('\n').trim();
}

/**
 * Extract a readable output string from an agent result payload.
 */
function extractOutput(result: any): string {
    if (!result) return 'No output.';
    if (typeof result === 'string') return result;
    if (result.output && typeof result.output === 'string') return result.output;

    const inner = result.result || result;
    if (inner.summary && typeof inner.summary === 'string') return inner.summary;
    if (inner.phase) {
        return inner.phase.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    // Last resort: stringify a compact version
    try {
        const compact = JSON.stringify(result).slice(0, 300);
        return compact.length >= 300 ? compact + '\u2026' : compact;
    } catch {
        return 'Result available (complex object).';
    }
}

// ── Core Aggregation ─────────────────────────────────────────

/**
 * Aggregate sub-task results into a unified response.
 *
 * 1. Calculate metrics (time, budget, success/failure counts)
 * 2. Try OpenAI for a synthesized summary
 * 3. Fall back to concatenated section headers
 */
export async function aggregateResults(
    rootPrompt: string,
    subResults: SubTaskResult[],
): Promise<AggregatedResult> {
    // ── Metrics ──────────────────────────────────────────────
    const totalExecutionTime = subResults.reduce((max, s) => Math.max(max, s.executionTime), 0);
    const totalBudgetSpent = subResults.reduce((sum, s) => sum + s.budgetSpent, 0);
    const successCount = subResults.filter(s => s.status === 'COMPLETED').length;
    const failureCount = subResults.filter(s => s.status === 'FAILED').length;

    // ── Summary ──────────────────────────────────────────────
    let summary = '';

    // Try OpenAI synthesis
    try {
        const subResultSummaries = subResults.map(s => ({
            step: s.stepIndex,
            agent: `${s.agentEmoji} ${s.agentName}`,
            status: s.status,
            output: extractOutput(s.result),
            time: `${s.executionTime}s`,
        }));

        const completion = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a concise report writer. Synthesize multiple agent outputs into a single coherent summary. Reference what each agent accomplished. Keep it readable in 30 seconds. Do NOT use markdown headers. Use plain text with line breaks.`,
                },
                {
                    role: 'user',
                    content: `Original task: ${rootPrompt}\n\nAgent results:\n${JSON.stringify(subResultSummaries, null, 2)}\n\nTotal time: ${totalExecutionTime}s | Budget spent: ${totalBudgetSpent} AlphaUSD | Success: ${successCount}/${subResults.length}`,
                },
            ],
            temperature: 0.4,
            max_tokens: 500,
        });

        summary = completion.choices[0].message.content || '';
    } catch (aiError: any) {
        console.warn('[ResultAggregator] OpenAI unavailable, using local fallback:', aiError.message);
    }

    // Fallback: local concatenation
    if (!summary) {
        summary = localAggregate(rootPrompt, subResults);
    }

    return {
        summary,
        subResults,
        totalExecutionTime,
        totalBudgetSpent,
        successCount,
        failureCount,
    };
}
