/**
 * AI Task Decomposition — A2A Orchestration
 *
 * Breaks complex user tasks into ordered sub-tasks, each assigned
 * to a specialized marketplace agent.  Uses OpenAI GPT-4o-mini for
 * intelligent decomposition with a sophisticated local semantic
 * engine when the API is unavailable.
 *
 * The local engine:
 *  1. Splits prompts by compound connectors (and / with / then)
 *  2. Scores ALL agents using TF-IDF-style semantic matching
 *  3. Generates contextual sub-task prompts from agent descriptions
 *  4. Infers dependency chains from task semantics
 *  5. Adds complementary agents (audit → verify, deploy → audit)
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

// ══════════════════════════════════════════════════════════════
// SEMANTIC ENGINE — Local intelligent decomposition
// ══════════════════════════════════════════════════════════════

/**
 * Action keywords → real database categories.
 * Categories MUST match the actual MarketplaceAgent.category values.
 */
const ACTION_CATEGORY_MAP: Record<string, string[]> = {
    // deployment
    deploy:     ['deployment'], build:   ['deployment'], launch:    ['deployment'],
    create:     ['deployment'], setup:   ['deployment'], configure: ['deployment'],
    compile:    ['deployment'], contract: ['deployment'],
    // security
    audit:      ['security', 'verification'], scan:  ['security'], vulnerability: ['security'],
    secure:     ['security'],  protect: ['security'],   guard:     ['security'],
    allowance:  ['security'],  revoke:  ['security'],   permission: ['security'],
    // analytics
    analyze:    ['analytics'], monitor: ['analytics'],  track:     ['analytics'],
    report:     ['analytics'], inspect: ['analytics'],  profile:   ['analytics'],
    benchmark:  ['analytics'], balance: ['analytics'],  treasury:  ['analytics'],
    // payments
    pay:        ['payments'],  send:    ['payments'],   transfer:  ['payments'],
    batch:      ['payments'],  airdrop: ['payments'],   disburse:  ['payments'],
    // payroll
    salary:     ['payroll'],   payroll: ['payroll'],    wage:      ['payroll'],
    // escrow
    escrow:     ['escrow'],    settle:  ['escrow'],     dispute:   ['escrow'],
    // streams
    stream:     ['streams'],   milestone: ['streams'],  recurring: ['streams'],
    subscription: ['streams'], progressive: ['streams'],
    // privacy
    shield:     ['privacy'],   zk:      ['privacy'],    private:   ['privacy'],
    vault:      ['privacy'],   confidential: ['privacy'],
    // verification
    verify:     ['verification'], proof: ['verification'], commit: ['verification'],
    // orchestration
    orchestrate: ['orchestration'], coordinate: ['orchestration'],
    // admin
    fee:        ['admin'],     collect: ['admin'],      withdraw:  ['admin'],
    // token-specific
    token:      ['deployment'], mint:   ['deployment'],  erc20:    ['deployment'],
    // common compound actions → multiple categories
    test:       ['security', 'analytics'],
    review:     ['security', 'verification'],
    optimize:   ['analytics'],
    migrate:    ['deployment', 'security'],
};

/** Stop words to ignore in semantic scoring */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'but', 'or', 'nor',
    'not', 'so', 'yet', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'than', 'too', 'very', 'just', 'about', 'all', 'also',
    'and', 'then', 'that', 'this', 'these', 'those', 'it', 'its', 'my',
    'your', 'our', 'their', 'i', 'you', 'he', 'she', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'what', 'which', 'who', 'whom',
    'where', 'when', 'why', 'how', 'no', 'yes', 'get', 'make', 'need',
    'want', 'please', 'help', 'use', 'using',
]);

/** Tokenize text, removing stop words and short tokens */
function tokenize(text: string): string[] {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

// ── Task Splitting ──────────────────────────────────────────

/**
 * Split a complex prompt into sub-tasks.
 * Strategy:
 *  1. Try compound connector splitting ("and", "with", "then", "+")
 *  2. If single part, detect multiple action verbs → split by category
 *  3. Final fallback: single task + auto-add complementary tasks
 */
function splitPromptIntoTasks(prompt: string): string[] {
    // 1. Split by compound connectors
    const connectors = /\b(?:and then|and also|then|plus|also)\b/gi;
    const parts = prompt.split(connectors).map(p => p.trim()).filter(p => p.length > 3);
    if (parts.length >= 2) return parts;

    // "with" is special — only split if both sides have action verbs
    const withParts = prompt.split(/\bwith\b/gi).map(p => p.trim()).filter(p => p.length > 3);
    if (withParts.length >= 2) {
        const actionWords = Object.keys(ACTION_CATEGORY_MAP);
        const allHaveActions = withParts.every(part => {
            const lower = part.toLowerCase();
            return actionWords.some(a => new RegExp(`\\b${a}\\w*\\b`, 'i').test(lower));
        });
        if (allHaveActions) return withParts;
    }

    // 2. Try "and" split — only if both parts are substantial
    const andParts = prompt.split(/\band\b/gi).map(p => p.trim()).filter(p => p.length > 5);
    if (andParts.length >= 2) {
        const actionWords = Object.keys(ACTION_CATEGORY_MAP);
        const allHaveActions = andParts.every(part => {
            const lower = part.toLowerCase();
            return actionWords.some(a => new RegExp(`\\b${a}\\w*\\b`, 'i').test(lower));
        });
        if (allHaveActions) return andParts;
    }

    // Single prompt — return as-is
    return [prompt];
}

/** Detect which DB categories a text maps to */
function detectCategories(text: string): string[] {
    const cats = new Set<string>();
    const lower = text.toLowerCase();
    for (const [keyword, categories] of Object.entries(ACTION_CATEGORY_MAP)) {
        if (new RegExp(`\\b${keyword}\\w*\\b`, 'i').test(lower)) {
            categories.forEach(c => cats.add(c));
        }
    }
    return Array.from(cats);
}

// ── Semantic Agent Scoring ──────────────────────────────────

interface ScoredAgent {
    agent: any;
    score: number;
    matchedTerms: string[];
}

/**
 * Score an agent against a query using TF-IDF-like semantic matching.
 * Weights: skill match > category match > description match > name match
 */
function scoreAgent(query: string, agent: any, queryTokens?: string[]): ScoredAgent {
    const tokens = queryTokens || tokenize(query);
    const skills: string[] = JSON.parse(agent.skills);
    const skillsText = skills.join(' ').toLowerCase();
    const descText = agent.description.toLowerCase();
    const nameText = agent.name.toLowerCase();
    const catText = agent.category.toLowerCase();

    let score = 0;
    const matchedTerms: string[] = [];

    for (const token of tokens) {
        // Skill match (highest weight — skills are most specific)
        if (skills.some(s => s.toLowerCase().includes(token))) {
            score += 25;
            matchedTerms.push(token);
        }
        // Category match
        if (catText.includes(token)) {
            score += 20;
            if (!matchedTerms.includes(token)) matchedTerms.push(token);
        }
        // Name match
        if (nameText.includes(token)) {
            score += 15;
            if (!matchedTerms.includes(token)) matchedTerms.push(token);
        }
        // Description match (lower weight — descriptions are verbose)
        if (descText.includes(token)) {
            score += 5;
            if (!matchedTerms.includes(token)) matchedTerms.push(token);
        }
    }

    // Bonus: exact phrase match in description (very relevant)
    if (tokens.length >= 2) {
        const phrase = tokens.slice(0, 3).join(' ');
        if (descText.includes(phrase)) score += 30;
    }

    // Quality bonus (smaller to not overwhelm relevance)
    score += agent.avgRating * 1.5;
    score += Math.max(0, (agent.successRate - 90)) * 0.3;
    if (agent.isVerified) score += 5;

    return { agent, score, matchedTerms };
}

/**
 * Find the best agent for a sub-task query.
 * 1. Score all agents
 * 2. Prefer agents in the detected category
 * 3. Return the highest-scoring non-used agent
 */
function findBestAgent(
    query: string,
    agents: any[],
    usedIds: Set<string>,
    preferCategories?: string[],
): ScoredAgent | null {
    const queryTokens = tokenize(query);
    let scored = agents
        .filter(a => !usedIds.has(a.id))
        .map(a => scoreAgent(query, a, queryTokens));

    // Category preference boost
    if (preferCategories && preferCategories.length > 0) {
        scored = scored.map(sa => {
            const catMatch = preferCategories.includes(sa.agent.category.toLowerCase());
            return catMatch ? { ...sa, score: sa.score + 40 } : sa;
        });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.length > 0 && scored[0].score > 5 ? scored[0] : null;
}

// ── Contextual Prompt Generation ────────────────────────────

/**
 * Generate a rich, contextual sub-task prompt based on the
 * original task + the agent's capabilities.
 */
function generateSubTaskPrompt(originalTask: string, subTask: string, agent: any): string {
    const skills: string[] = JSON.parse(agent.skills);
    const category = agent.category.toLowerCase();
    const topSkills = skills.slice(0, 3).join(', ');

    // If sub-task is same as original (no splitting happened), generate from agent capabilities
    if (subTask === originalTask) {
        switch (category) {
            case 'deployment':
                return `Deploy and build the infrastructure for: ${originalTask}. Use ${topSkills} capabilities.`;
            case 'security':
                return `Perform security review and audit for: ${originalTask}. Check ${topSkills}.`;
            case 'analytics':
                return `Analyze and generate report for: ${originalTask}. Provide insights on ${topSkills}.`;
            case 'verification':
                return `Verify and create audit trail for: ${originalTask}. Commit proofs for accountability.`;
            case 'escrow':
                return `Set up escrow and settlement for: ${originalTask}. Manage ${topSkills}.`;
            case 'payments':
                return `Execute payments for: ${originalTask}. Handle ${topSkills}.`;
            case 'streams':
                return `Create milestone-based stream for: ${originalTask}. Structure ${topSkills}.`;
            case 'privacy':
                return `Set up shielded/private execution for: ${originalTask}. Use ${topSkills}.`;
            default:
                return `${agent.name}: Execute ${originalTask}`;
        }
    }

    // Sub-task was split — use it directly but enrich with agent context
    return `${subTask} — using ${agent.name}'s ${topSkills} capabilities`;
}

// ── Complementary Task Inference ────────────────────────────

/**
 * Based on the primary tasks, suggest additional complementary agents
 * to create a thorough execution plan.
 */
function getComplementaryTasks(
    primaryCategories: Set<string>,
    originalPrompt: string,
): { query: string; categories: string[] }[] {
    const extras: { query: string; categories: string[] }[] = [];

    // Deployment → always add security audit
    if (primaryCategories.has('deployment') && !primaryCategories.has('security')) {
        extras.push({
            query: `security audit and permission review for ${originalPrompt}`,
            categories: ['security'],
        });
    }

    // Deployment → add verification/proof trail
    if (primaryCategories.has('deployment') && !primaryCategories.has('verification')) {
        extras.push({
            query: `verify and commit proof trail for ${originalPrompt}`,
            categories: ['verification'],
        });
    }

    // Security → add analytics monitoring
    if (primaryCategories.has('security') && !primaryCategories.has('analytics')) {
        extras.push({
            query: `monitor and analyze results for ${originalPrompt}`,
            categories: ['analytics'],
        });
    }

    // Payments → add verification
    if (primaryCategories.has('payments') && !primaryCategories.has('verification')) {
        extras.push({
            query: `verify payment proofs for ${originalPrompt}`,
            categories: ['verification'],
        });
    }

    // Escrow → add analytics
    if (primaryCategories.has('escrow') && !primaryCategories.has('analytics')) {
        extras.push({
            query: `inspect and report on escrow state for ${originalPrompt}`,
            categories: ['analytics'],
        });
    }

    return extras;
}

// ── Main Local Decomposition ────────────────────────────────

/**
 * Intelligent local task decomposition.
 * No AI API required — uses semantic matching + rule-based inference.
 */
function localIntelligentDecompose(
    prompt: string,
    agents: any[],
    maxAgents: number,
): { steps: DecompositionStep[]; reasoning: string } {
    const subTasks = splitPromptIntoTasks(prompt);
    const usedIds = new Set<string>();
    const steps: DecompositionStep[] = [];
    const primaryCategories = new Set<string>();

    // ── Phase 1: Match agents to explicit sub-tasks ──
    for (const subTask of subTasks) {
        if (steps.length >= maxAgents) break;

        const categories = detectCategories(subTask);
        const best = findBestAgent(subTask, agents, usedIds, categories);

        if (best) {
            usedIds.add(best.agent.id);
            categories.forEach(c => primaryCategories.add(c));
            primaryCategories.add(best.agent.category.toLowerCase());

            steps.push({
                stepIndex: steps.length,
                agentId: best.agent.id,
                agentName: best.agent.name,
                agentEmoji: best.agent.avatarEmoji || '🤖',
                prompt: generateSubTaskPrompt(prompt, subTask, best.agent),
                budgetAllocation: 0, // Set later
                dependsOn: steps.length > 0 ? [steps.length - 1] : [],
                category: best.agent.category,
            });
        }
    }

    // ── Phase 2: Add complementary agents for thorough execution ──
    const complementary = getComplementaryTasks(primaryCategories, prompt);

    for (const comp of complementary) {
        if (steps.length >= maxAgents) break;

        const best = findBestAgent(comp.query, agents, usedIds, comp.categories);
        if (best && best.score > 10) {
            usedIds.add(best.agent.id);

            steps.push({
                stepIndex: steps.length,
                agentId: best.agent.id,
                agentName: best.agent.name,
                agentEmoji: best.agent.avatarEmoji || '🤖',
                prompt: generateSubTaskPrompt(prompt, comp.query, best.agent),
                budgetAllocation: 0,
                dependsOn: steps.length > 0 ? [steps.length - 1] : [],
                category: best.agent.category,
            });
        }
    }

    // ── Phase 3: If only 1 step, try to add the most relevant different-category agent ──
    if (steps.length === 1 && agents.length > 1) {
        const primaryCat = steps[0].category.toLowerCase();
        const secondBest = agents
            .filter(a => !usedIds.has(a.id) && a.category.toLowerCase() !== primaryCat)
            .map(a => scoreAgent(prompt, a))
            .sort((a, b) => b.score - a.score)[0];

        if (secondBest && secondBest.score > 5) {
            usedIds.add(secondBest.agent.id);
            steps.push({
                stepIndex: 1,
                agentId: secondBest.agent.id,
                agentName: secondBest.agent.name,
                agentEmoji: secondBest.agent.avatarEmoji || '🤖',
                prompt: generateSubTaskPrompt(prompt, prompt, secondBest.agent),
                budgetAllocation: 0,
                dependsOn: [0],
                category: secondBest.agent.category,
            });
        }
    }

    // ── Build reasoning ──
    if (steps.length === 0) {
        return { steps: [], reasoning: 'No matching agents found for this task.' };
    }

    const categoryList = [...new Set(steps.map(s => s.category))].join(', ');
    const reasoning = steps.length >= 3
        ? `Orchestration plan with ${steps.length} specialized agents across ${categoryList}. Tasks execute sequentially with dependency chaining for reliable results.`
        : steps.length === 2
            ? `Two-phase execution: ${steps[0].agentName} (${steps[0].category}) → ${steps[1].agentName} (${steps[1].category}). Sequential execution ensures quality.`
            : `Single-agent execution by ${steps[0].agentName} (${steps[0].category}).`;

    return { steps, reasoning };
}

// ══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ══════════════════════════════════════════════════════════════

/**
 * Decompose a complex task into ordered sub-tasks assigned to agents.
 *
 * 1. Fetches all active agents from DB
 * 2. Builds agent catalog for the LLM
 * 3. Tries OpenAI GPT-4o-mini for intelligent decomposition
 * 4. Falls back to local semantic engine if AI is unavailable
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

    // 2. Build agent catalog for OpenAI
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

    // 3. Try OpenAI GPT-4o-mini (only if real key configured)
    let steps: DecompositionStep[] = [];
    let reasoning = '';
    const apiKey = process.env.OPENAI_API_KEY || '';
    const hasRealKey = apiKey.length > 20 && !apiKey.includes('YOUR_KEY');

    if (hasRealKey) {
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
                    steps = parsed.steps
                        .map((step: any, idx: number) => {
                            const agent = agents.find(a => a.id === step.agentId);
                            if (!agent) return null;
                            return {
                                stepIndex: step.stepIndex ?? idx,
                                agentId: agent.id,
                                agentName: agent.name,
                                agentEmoji: agent.avatarEmoji || '🤖',
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
            console.warn('[TaskDecomposer] OpenAI unavailable, using semantic engine:', aiError.message);
        }
    }

    // 4. Local semantic engine fallback
    if (steps.length === 0) {
        const result = localIntelligentDecompose(prompt, agents, maxAgents);
        steps = result.steps;
        reasoning = result.reasoning;
    }

    // 5. Budget allocation — proportional to agent basePrice (realistic pricing)
    if (steps.length > 0) {
        const totalBasePrice = steps.reduce((sum, s) => {
            const agent = agents.find(a => a.id === s.agentId);
            return sum + (agent?.basePrice || 5);
        }, 0);

        for (const step of steps) {
            const agent = agents.find(a => a.id === step.agentId);
            const base = agent?.basePrice || 5;
            // Allocate proportionally based on agent's base price
            step.budgetAllocation = Math.round((base / totalBasePrice) * availableBudget * 100) / 100;
        }

        // Validate total doesn't exceed available
        const allocatedSum = steps.reduce((sum, s) => sum + s.budgetAllocation, 0);
        if (allocatedSum > availableBudget && allocatedSum > 0) {
            const scale = availableBudget / allocatedSum;
            for (const step of steps) {
                step.budgetAllocation = Math.round(step.budgetAllocation * scale * 100) / 100;
            }
        }
    }

    return {
        steps,
        reasoning,
        totalBudget: budget,
        platformFee,
    };
}
