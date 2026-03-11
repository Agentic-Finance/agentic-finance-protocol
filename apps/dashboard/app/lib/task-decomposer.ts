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

// ── Task Phrase Extraction ───────────────────────────────────

/**
 * Mapping from action keywords → agent categories.
 * Used by the fallback decomposer to break a prompt into sub-tasks.
 */
const ACTION_CATEGORY_MAP: Record<string, string[]> = {
    // Security
    audit:    ['security'], scan: ['security'], vulnerability: ['security'], pentest: ['security'],
    secure:   ['security'], protect: ['security'], guard: ['security'],
    // DeFi
    swap:     ['defi'], stake: ['defi'], yield: ['defi'], liquidity: ['defi'], farm: ['defi'], bridge: ['defi'],
    // Deployment
    deploy:   ['deploy'], build: ['deploy'], launch: ['deploy'], create: ['deploy'], setup: ['deploy'], configure: ['deploy'],
    // Analytics
    analyze:  ['analytics'], monitor: ['analytics'], track: ['analytics'], report: ['analytics'], dashboard: ['analytics'],
    // Payroll
    pay:      ['payroll'], salary: ['payroll'], payroll: ['payroll'], distribute: ['payroll'], batch: ['payroll'],
    // Compliance
    compliance: ['compliance'], regulatory: ['compliance'], kyc: ['compliance'], aml: ['compliance'],
    // Governance
    governance: ['governance'], vote: ['governance'], proposal: ['governance'], dao: ['governance'],
    // Tax
    tax:      ['tax'], filing: ['tax'], accounting: ['tax'],
    // NFT
    nft:      ['nft'], mint: ['nft'], collection: ['nft'],
    // Streams
    stream:   ['streams'], recurring: ['streams'], subscription: ['streams'],
    // Escrow
    escrow:   ['escrow'], settle: ['escrow'], multisig: ['escrow'],
    // Misc actions that can map to multiple
    test:     ['security', 'analytics'], verify: ['security', 'compliance'], review: ['security', 'analytics'],
    optimize: ['analytics', 'defi'], migrate: ['deploy', 'defi'],
};

/**
 * Split a complex prompt into distinct sub-tasks using compound connectors
 * and action keyword detection.
 */
function extractSubTasks(prompt: string): { subPrompt: string; categories: string[] }[] {
    const lower = prompt.toLowerCase().trim();

    // 1. Try splitting by compound connectors: "and", "with", "then", "also", "+"
    const splitters = /\b(?:and then|and also|and|with|then|plus|also|&|\+)\b/gi;
    const parts = prompt.split(splitters).map(p => p.trim()).filter(p => p.length > 3);

    if (parts.length >= 2) {
        // Each part is a distinct sub-task
        return parts.map(part => {
            const cats = detectCategories(part.toLowerCase());
            return { subPrompt: part, categories: cats.length > 0 ? cats : ['deploy'] };
        });
    }

    // 2. If no compound split, detect multiple action verbs
    const actions = Object.keys(ACTION_CATEGORY_MAP);
    const foundActions: { action: string; categories: string[]; index: number }[] = [];

    for (const action of actions) {
        const regex = new RegExp(`\\b${action}\\w*\\b`, 'i');
        const match = lower.match(regex);
        if (match && match.index !== undefined) {
            foundActions.push({
                action,
                categories: ACTION_CATEGORY_MAP[action],
                index: match.index,
            });
        }
    }

    // Deduplicate by category — pick the most relevant action for each category
    const uniqueCategories = new Map<string, typeof foundActions[0]>();
    for (const fa of foundActions.sort((a, b) => a.index - b.index)) {
        for (const cat of fa.categories) {
            if (!uniqueCategories.has(cat)) uniqueCategories.set(cat, fa);
        }
    }

    if (uniqueCategories.size >= 2) {
        // Build sub-tasks per unique category detected
        return Array.from(uniqueCategories.entries()).map(([cat, fa]) => ({
            subPrompt: `${fa.action.charAt(0).toUpperCase() + fa.action.slice(1)} — ${prompt}`,
            categories: [cat],
        }));
    }

    // 3. Fallback: single task but try to add supporting tasks
    const primaryCats = detectCategories(lower);
    const subTasks: { subPrompt: string; categories: string[] }[] = [
        { subPrompt: prompt, categories: primaryCats.length > 0 ? primaryCats : ['deploy'] },
    ];

    // Auto-add complementary tasks for common combos
    if (primaryCats.includes('deploy') && !primaryCats.includes('security')) {
        subTasks.push({ subPrompt: `Security review and audit for: ${prompt}`, categories: ['security'] });
    }
    if (primaryCats.includes('security') && !primaryCats.includes('analytics')) {
        subTasks.push({ subPrompt: `Generate analytics report for: ${prompt}`, categories: ['analytics'] });
    }
    if (primaryCats.includes('defi') && !primaryCats.includes('analytics')) {
        subTasks.push({ subPrompt: `Monitor and track performance for: ${prompt}`, categories: ['analytics'] });
    }

    return subTasks;
}

/** Detect which categories a text maps to based on action keywords */
function detectCategories(text: string): string[] {
    const cats = new Set<string>();
    for (const [keyword, categories] of Object.entries(ACTION_CATEGORY_MAP)) {
        if (new RegExp(`\\b${keyword}\\w*\\b`, 'i').test(text)) {
            categories.forEach(c => cats.add(c));
        }
    }
    return Array.from(cats);
}

// ── Local Keyword Fallback ───────────────────────────────────

/**
 * Smart local decomposition fallback.
 * 1. Splits prompt into sub-tasks using connectors + action keywords
 * 2. Matches best agent for each sub-task by category + skill overlap
 * 3. Generates unique sub-task prompts
 * 4. Infers dependencies (sequential by default, parallel if independent)
 */
function localSmartDecompose(prompt: string, agents: any[], maxAgents: number) {
    const subTasks = extractSubTasks(prompt);

    // Build agent-by-category index
    const agentsByCategory = new Map<string, any[]>();
    for (const agent of agents) {
        const cat = agent.category.toLowerCase();
        if (!agentsByCategory.has(cat)) agentsByCategory.set(cat, []);
        agentsByCategory.get(cat)!.push(agent);
    }

    // Match best agent for each sub-task
    const usedAgentIds = new Set<string>();
    const steps: { agent: any; subPrompt: string; categories: string[] }[] = [];

    for (const task of subTasks) {
        if (steps.length >= maxAgents) break;

        let bestAgent: any = null;
        let bestScore = -1;

        // Try each category the sub-task maps to
        for (const cat of task.categories) {
            const candidates = agentsByCategory.get(cat) || [];
            for (const agent of candidates) {
                if (usedAgentIds.has(agent.id)) continue;
                const score = agent.avgRating * 10 + agent.successRate + (agent.isVerified ? 20 : 0);
                if (score > bestScore) {
                    bestScore = score;
                    bestAgent = agent;
                }
            }
        }

        // If no category match, try all agents by skill keyword overlap
        if (!bestAgent) {
            const promptTokens = task.subPrompt.toLowerCase().split(/\s+/).filter(t => t.length > 2);
            for (const agent of agents) {
                if (usedAgentIds.has(agent.id)) continue;
                const skills: string[] = JSON.parse(agent.skills);
                const text = [agent.name, agent.description, ...skills].join(' ').toLowerCase();
                let score = 0;
                for (const token of promptTokens) {
                    if (text.includes(token)) score += 5;
                }
                score += agent.avgRating * 2;
                if (score > bestScore) {
                    bestScore = score;
                    bestAgent = agent;
                }
            }
        }

        if (bestAgent) {
            usedAgentIds.add(bestAgent.id);
            steps.push({ agent: bestAgent, subPrompt: task.subPrompt, categories: task.categories });
        }
    }

    return steps;
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

    // 4. Fallback: smart local decomposition
    if (steps.length === 0) {
        const decomposed = localSmartDecompose(prompt, agents, maxAgents);

        if (decomposed.length === 0) {
            reasoning = 'No matching agents found for this task.';
        } else {
            const taskCount = decomposed.length;
            const hasMultipleTasks = taskCount >= 2;
            reasoning = hasMultipleTasks
                ? `Decomposed into ${taskCount} specialized sub-tasks. ${taskCount <= 3 ? 'Steps execute sequentially.' : 'Independent steps run in parallel where possible.'}`
                : 'Single-agent task with supporting analysis.';

            const perAgent = Math.round((availableBudget / taskCount) * 100) / 100;

            steps = decomposed.map((d, idx) => ({
                stepIndex: idx,
                agentId: d.agent.id,
                agentName: d.agent.name,
                agentEmoji: d.agent.avatarEmoji || '\uD83E\uDD16',
                prompt: d.subPrompt,
                budgetAllocation: perAgent,
                // First task has no deps; subsequent tasks depend on the previous one
                dependsOn: idx === 0 ? [] : [idx - 1],
                category: d.agent.category,
            }));
        }
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
