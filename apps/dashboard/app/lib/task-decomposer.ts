/**
 * AI Task Decomposition — A2A Orchestration
 *
 * Breaks complex user tasks into ordered sub-tasks, each assigned
 * to a specialized marketplace agent.  Uses OpenAI GPT-4o-mini for
 * intelligent decomposition with a local keyword-match fallback
 * when the API is unavailable.
 */

import OpenAI from 'openai';
import prisma from '@/app/lib/prisma';

// Lazy-init: avoid throwing at module load when OPENAI_API_KEY is unset (CI builds)
let _openai: OpenAI | null = null;
function getOpenAI() {
    if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
}

// ── Types ────────────────────────────────────────────────────

export interface DecompositionStep {
    stepIndex: number;
    agentId: string;
    agentName: string;
    agentEmoji: string;
    prompt: string;
    budgetAllocation: number;
    dependsOn: number[];
    category: string;
}

export interface DecompositionResult {
    steps: DecompositionStep[];
    reasoning: string;
    totalBudget: number;
    platformFee: number;
}

// ── Local Keyword Fallback ───────────────────────────────────

/**
 * Local keyword-based agent matching.
 * Parses prompt for keywords, scores agents by category/skills overlap,
 * and returns top matches sorted by relevance.
 */
function localKeywordMatch(prompt: string, agents: any[]) {
    const promptTokens = prompt.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2);

    const scored = agents.map(agent => {
        const skills: string[] = JSON.parse(agent.skills);
        const searchableText = [
            agent.name.toLowerCase(),
            agent.description.toLowerCase(),
            agent.category.toLowerCase(),
            ...skills.map((s: string) => s.toLowerCase()),
        ].join(' ');

        let score = 0;
        const matchedKeywords: string[] = [];

        for (const token of promptTokens) {
            if (searchableText.includes(token)) {
                score += 10;
                if (skills.some((s: string) => s.toLowerCase().includes(token))) score += 15;
                if (agent.category.toLowerCase().includes(token)) score += 20;
                if (agent.name.toLowerCase().includes(token)) score += 10;
                matchedKeywords.push(token);
            }
        }

        // Quality bonus
        score += agent.avgRating * 2;
        score += Math.max(0, (agent.successRate - 90)) * 0.5;

        return {
            agentId: agent.id,
            relevanceScore: Math.min(Math.round(score), 100),
            reasoning: matchedKeywords.length > 0
                ? `Matched keywords: ${[...new Set(matchedKeywords)].join(', ')}`
                : `Recommended based on quality metrics (${agent.avgRating}\u2605, ${agent.successRate}% success)`,
            agent: {
                id: agent.id,
                name: agent.name,
                description: agent.description,
                category: agent.category,
                skills: JSON.parse(agent.skills),
                basePrice: agent.basePrice,
                ownerWallet: agent.ownerWallet,
                avatarEmoji: agent.avatarEmoji,
                avatarUrl: agent.avatarUrl || null,
                isVerified: agent.isVerified,
                totalJobs: agent.totalJobs,
                successRate: agent.successRate,
                avgRating: agent.avgRating,
                ratingCount: agent.ratingCount,
                responseTime: agent.responseTime,
                source: agent.source,
                sourceUrl: agent.sourceUrl,
            },
        };
    });

    return scored
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
}

// ── Core Decomposition ───────────────────────────────────────

/**
 * Decompose a complex task into ordered sub-tasks assigned to agents.
 *
 * 1. Fetches all active agents from DB
 * 2. Builds agent catalog for the LLM
 * 3. Tries OpenAI GPT-4o-mini for intelligent decomposition
 * 4. Falls back to local keyword matching if AI is unavailable
 * 5. Validates and scales budgets to fit within limits
 */
export async function decomposeTask(
    prompt: string,
    budget: number,
    preferences?: { maxAgents?: number; parallelismPreferred?: boolean }
): Promise<DecompositionResult> {
    const maxAgents = preferences?.maxAgents || 8;
    const platformFee = Math.round(budget * 0.08 * 100) / 100;
    const availableBudget = Math.round((budget - platformFee) * 100) / 100;

    // 1. Fetch all active agents
    const agents = await prisma.marketplaceAgent.findMany({
        where: { isActive: true },
        orderBy: { avgRating: 'desc' },
    });

    if (agents.length === 0) {
        return {
            steps: [],
            reasoning: 'No active agents available in the marketplace.',
            totalBudget: budget,
            platformFee,
        };
    }

    // 2. Build agent catalog
    const catalog = agents.map(a => ({
        id: a.id,
        name: a.name,
        category: a.category,
        skills: JSON.parse(a.skills),
        basePrice: a.basePrice,
        avgRating: a.avgRating,
        successRate: a.successRate,
        avatarEmoji: a.avatarEmoji,
    }));

    // 3. Try OpenAI GPT-4o-mini
    let steps: DecompositionStep[] = [];
    let reasoning = '';

    try {
        const systemPrompt = `You are PayPol's A2A Orchestration Planner. You decompose complex tasks into sub-tasks that specialized AI agents can execute.

AVAILABLE AGENTS:
${JSON.stringify(catalog)}

Rules:
- Break the task into 2-${Math.min(maxAgents, 8)} sub-tasks
- Each sub-task must be assigned to exactly one agent from the catalog
- Use dependsOn to define execution order (step indices that must complete first)
- Steps with no dependencies can run in parallel
- Budget allocations must sum to <= ${availableBudget} (total: ${budget}, platform fee: ${platformFee})
- Each step budget should be >= agent's basePrice * 0.7
${preferences?.parallelismPreferred ? '- Prefer parallel execution where possible (minimize dependencies)' : '- Use sequential dependencies where outputs feed into next steps'}

Respond ONLY with valid JSON in this exact format:
{
  "steps": [
    {
      "stepIndex": 0,
      "agentId": "uuid-from-catalog",
      "prompt": "Specific sub-task instruction for this agent",
      "budgetAllocation": 50,
      "dependsOn": [],
      "category": "agent-category"
    }
  ],
  "reasoning": "Brief explanation of the decomposition strategy"
}`;

        const completion = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Task: ${prompt}\nBudget: ${budget} AlphaUSD` },
            ],
            temperature: 0.3,
        });

        const resultText = completion.choices[0].message.content;
        if (resultText) {
            const parsed = JSON.parse(resultText);
            reasoning = parsed.reasoning || 'AI-planned decomposition.';

            if (parsed.steps && Array.isArray(parsed.steps)) {
                // Enrich steps with agent details
                steps = parsed.steps
                    .map((step: any, idx: number) => {
                        const agent = agents.find(a => a.id === step.agentId);
                        if (!agent) return null;
                        return {
                            stepIndex: step.stepIndex ?? idx,
                            agentId: agent.id,
                            agentName: agent.name,
                            agentEmoji: agent.avatarEmoji || '\uD83E\uDD16',
                            prompt: step.prompt || prompt,
                            budgetAllocation: step.budgetAllocation || 0,
                            dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
                            category: step.category || agent.category,
                        } as DecompositionStep;
                    })
                    .filter(Boolean) as DecompositionStep[];
            }
        }
    } catch (aiError: any) {
        console.warn('[TaskDecomposer] OpenAI unavailable, using local fallback:', aiError.message);
    }

    // 4. Fallback: local keyword match
    if (steps.length === 0) {
        const matches = localKeywordMatch(prompt, agents);
        reasoning = 'Local keyword-match fallback (OpenAI unavailable). All steps run in parallel.';

        const perAgent = matches.length > 0
            ? Math.round((availableBudget / matches.length) * 100) / 100
            : 0;

        steps = matches.map((m, idx) => ({
            stepIndex: idx,
            agentId: m.agent.id,
            agentName: m.agent.name,
            agentEmoji: m.agent.avatarEmoji || '\uD83E\uDD16',
            prompt,
            budgetAllocation: perAgent,
            dependsOn: [],              // All parallel in fallback mode
            category: m.agent.category,
        }));
    }

    // 5. Budget validation — scale proportionally if over limit
    const allocatedSum = steps.reduce((sum, s) => sum + s.budgetAllocation, 0);
    if (allocatedSum > availableBudget && allocatedSum > 0) {
        const scale = availableBudget / allocatedSum;
        for (const step of steps) {
            step.budgetAllocation = Math.round(step.budgetAllocation * scale * 100) / 100;
        }
    }

    return {
        steps,
        reasoning,
        totalBudget: budget,
        platformFee,
    };
}
