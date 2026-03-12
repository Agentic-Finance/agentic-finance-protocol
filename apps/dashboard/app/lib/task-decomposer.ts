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

// ── Synonym Expansion ───────────────────────────────────────

/** Expand query tokens with domain-specific synonyms */
const SYNONYMS: Record<string, string[]> = {
    build:    ['deploy', 'create', 'launch', 'setup', 'compile'],
    deploy:   ['build', 'create', 'launch', 'setup'],
    create:   ['build', 'deploy', 'launch', 'mint'],
    audit:    ['security', 'scan', 'review', 'verify', 'check', 'vulnerability'],
    security: ['audit', 'scan', 'protect', 'guard', 'secure'],
    send:     ['transfer', 'pay', 'disburse'],
    pay:      ['send', 'transfer', 'salary', 'payroll'],
    monitor:  ['track', 'analyze', 'inspect', 'watch'],
    analyze:  ['monitor', 'report', 'inspect', 'profile'],
    verify:   ['proof', 'commit', 'audit', 'check'],
    escrow:   ['settle', 'lock', 'trustless'],
    stream:   ['milestone', 'recurring', 'progressive'],
    shield:   ['private', 'zk', 'confidential'],
    sweep:    ['emergency', 'recovery', 'evacuate', 'migrate'],
    landing:  ['page', 'website', 'frontend', 'interface'],
    page:     ['landing', 'website', 'frontend', 'interface'],
    token:    ['erc20', 'coin', 'mint'],
    contract: ['smart-contract', 'solidity', 'deploy'],
};

function expandTokens(tokens: string[]): string[] {
    const expanded = new Set(tokens);
    for (const token of tokens) {
        const syns = SYNONYMS[token];
        if (syns) syns.forEach(s => expanded.add(s));
    }
    return Array.from(expanded);
}

// ── Semantic Agent Scoring ──────────────────────────────────

interface ScoredAgent {
    agent: any;
    score: number;
    matchedTerms: string[];
    categoryMatch: boolean;
}

/**
 * Score an agent against a query using semantic matching with synonym expansion.
 *
 * Scoring weights:
 *  - Skill exact match:  30 pts (skills are the most precise signal)
 *  - Skill synonym match: 15 pts
 *  - Description match:  8 pts  (descriptions contain rich context)
 *  - Name match:         12 pts
 *  - Category match:     10 pts (broad category alignment)
 *  - Multi-aspect bonus: 40 pts (agent matches 2+ different query aspects)
 */
function scoreAgent(query: string, agent: any, queryTokens?: string[]): ScoredAgent {
    const rawTokens = queryTokens || tokenize(query);
    const expandedTokens = expandTokens(rawTokens);
    const skills: string[] = JSON.parse(agent.skills);
    const descText = agent.description.toLowerCase();
    const nameText = agent.name.toLowerCase();
    const catText = agent.category.toLowerCase();

    let score = 0;
    const matchedTerms: string[] = [];
    const matchedAspects = new Set<string>(); // Track distinct match aspects

    // Score raw tokens (direct matches are worth more)
    for (const token of rawTokens) {
        if (skills.some(s => s.toLowerCase().includes(token))) {
            score += 30;
            matchedTerms.push(token);
            matchedAspects.add(token);
        }
        if (nameText.includes(token)) {
            score += 12;
            matchedAspects.add(token);
        }
        if (descText.includes(token)) {
            score += 8;
            matchedAspects.add(token);
        }
        if (catText.includes(token)) {
            score += 10;
            matchedAspects.add(token);
        }
    }

    // Score expanded tokens (synonym matches, lower weight)
    for (const token of expandedTokens) {
        if (rawTokens.includes(token)) continue; // Already scored
        if (skills.some(s => s.toLowerCase().includes(token))) {
            score += 15;
            matchedAspects.add(token);
        }
        if (descText.includes(token)) {
            score += 4;
        }
    }

    // MULTI-ASPECT BONUS: agent matches multiple distinct concepts from the query
    // e.g., Contract Deploy Pro matches both "deploy" AND "audit" → huge bonus
    if (matchedAspects.size >= 2) score += 40;
    if (matchedAspects.size >= 3) score += 25;

    // Quality bonus (small, doesn't overwhelm relevance)
    score += agent.avgRating * 1.5;
    if (agent.isVerified) score += 3;

    return {
        agent,
        score,
        matchedTerms: Array.from(matchedAspects),
        categoryMatch: expandedTokens.some(t => catText.includes(t)),
    };
}

// ── Exported Agent Utilities (for retry & fallback) ─────────

/**
 * Find a fallback agent in the same category when the original agent fails.
 * Used by A2A orchestration retry logic.
 */
export async function findFallbackAgent(
    originalAgentId: string,
    category: string,
    prompt: string,
): Promise<{ agentId: string; agentName: string; agentEmoji: string } | null> {
    try {
        // Query active agents in the same category, excluding the failed one
        const candidates = await prisma.marketplaceAgent.findMany({
            where: {
                isActive: true,
                category: { equals: category, mode: 'insensitive' },
                id: { not: originalAgentId },
            },
            orderBy: { avgRating: 'desc' },
            take: 10,
        });

        if (candidates.length === 0) {
            // Widen search: try any agent with matching skills
            const allAgents = await prisma.marketplaceAgent.findMany({
                where: {
                    isActive: true,
                    id: { not: originalAgentId },
                },
                orderBy: { avgRating: 'desc' },
                take: 30,
            });

            const scored = allAgents
                .map(a => scoreAgent(prompt, a))
                .filter(s => s.score > 15)
                .sort((a, b) => b.score - a.score);

            if (scored.length === 0) return null;

            const best = scored[0].agent;
            return {
                agentId: best.id,
                agentName: best.name,
                agentEmoji: best.avatarEmoji || '\uD83E\uDD16',
            };
        }

        // Score candidates against the prompt and pick the best
        const scored = candidates
            .map(a => scoreAgent(prompt, a))
            .sort((a, b) => b.score - a.score);

        const best = scored[0].agent;
        return {
            agentId: best.id,
            agentName: best.name,
            agentEmoji: best.avatarEmoji || '\uD83E\uDD16',
        };
    } catch (error: any) {
        console.error('[findFallbackAgent] Error:', error.message);
        return null;
    }
}

// ── Contextual Prompt Generation ────────────────────────────

/**
 * Generate a rich, contextual sub-task prompt based on what the agent
 * is best at + the original user task.
 */
function generateContextualPrompt(originalTask: string, agent: any, role: string): string {
    const skills: string[] = JSON.parse(agent.skills);
    const category = agent.category.toLowerCase();

    // Role-based prompt generation
    if (role === 'primary') {
        switch (category) {
            case 'deployment':
                return `Build and deploy the smart contract infrastructure for: ${originalTask}`;
            case 'security':
                return `Perform comprehensive security audit and vulnerability scan for: ${originalTask}`;
            case 'analytics':
                return `Analyze on-chain data and generate detailed report for: ${originalTask}`;
            case 'verification':
                return `Create immutable proof trail and verify execution integrity for: ${originalTask}`;
            case 'escrow':
                return `Set up trustless escrow contracts and settlement for: ${originalTask}`;
            case 'payments':
                return `Execute payment transfers and validate balances for: ${originalTask}`;
            case 'streams':
                return `Design milestone-based payment stream with progressive releases for: ${originalTask}`;
            case 'privacy':
                return `Execute shielded transaction with ZK-proof privacy for: ${originalTask}`;
            case 'payroll':
                return `Process payroll batch with compliance logging for: ${originalTask}`;
            case 'orchestration':
                return `Coordinate multi-agent workflow and chain execution for: ${originalTask}`;
            default:
                return `Execute specialized task: ${originalTask}`;
        }
    }

    // Secondary/complementary roles
    switch (category) {
        case 'security':
            return `Security review: audit permissions, scan for vulnerabilities, and verify access controls related to: ${originalTask}`;
        case 'verification':
            return `Accountability: commit cryptographic proof hashes and create immutable audit trail for: ${originalTask}`;
        case 'analytics':
            return `Post-execution analysis: monitor results, generate performance metrics, and create status report for: ${originalTask}`;
        case 'deployment':
            return `Infrastructure support: prepare and deploy supporting contracts for: ${originalTask}`;
        default:
            return `${agent.name}: support execution of ${originalTask}`;
    }
}

// ── Agent-First Decomposition ───────────────────────────────

/**
 * AGENT-FIRST decomposition strategy:
 *
 * Instead of "split prompt → match agents" (which often picks wrong agents),
 * we do: "score ALL agents against FULL prompt → pick top N from different
 * categories → generate plan based on agents' capabilities."
 *
 * This ensures the most relevant agents are always selected first.
 */
function localIntelligentDecompose(
    prompt: string,
    agents: any[],
    maxAgents: number,
): { steps: DecompositionStep[]; reasoning: string } {
    const queryTokens = tokenize(prompt);

    // ── Phase 1: Score ALL agents against the full prompt ──
    const allScored = agents
        .map(a => scoreAgent(prompt, a, queryTokens))
        .sort((a, b) => b.score - a.score);

    if (allScored.length === 0 || allScored[0].score <= 5) {
        return { steps: [], reasoning: 'No matching agents found for this task.' };
    }

    // ── Phase 2: Select top agents — only from RELEVANT categories ──
    // Key insight: only pick agents whose score is meaningful (> 30% of top score)
    const selectedAgents: ScoredAgent[] = [];
    const usedCategories = new Set<string>();
    const usedIds = new Set<string>();
    const topScore = allScored[0].score;
    const relevanceThreshold = Math.max(topScore * 0.3, 15); // At least 30% of best, min 15

    // Detect which categories the prompt explicitly asks for
    const promptCategories = new Set<string>();
    for (const [keyword, categories] of Object.entries(ACTION_CATEGORY_MAP)) {
        if (new RegExp(`\\b${keyword}\\w*\\b`, 'i').test(prompt.toLowerCase())) {
            categories.forEach(c => promptCategories.add(c));
        }
    }

    // Pick best agent per category — but ONLY if score exceeds threshold
    // AND category is related to the prompt
    for (const scored of allScored) {
        if (selectedAgents.length >= 3) break; // Max 3 primary agents
        const cat = scored.agent.category.toLowerCase();
        if (usedCategories.has(cat)) continue;
        if (scored.score < relevanceThreshold) continue;

        // Only pick from prompt-relevant categories OR if score is very high
        if (!promptCategories.has(cat) && scored.score < topScore * 0.6) continue;

        selectedAgents.push(scored);
        usedCategories.add(cat);
        usedIds.add(scored.agent.id);
    }

    // If only 1 agent matched, add the second-best from a different category
    if (selectedAgents.length === 1) {
        const secondBest = allScored.find(s =>
            !usedIds.has(s.agent.id) &&
            s.score >= relevanceThreshold &&
            s.agent.category.toLowerCase() !== selectedAgents[0].agent.category.toLowerCase()
        );
        if (secondBest) {
            selectedAgents.push(secondBest);
            usedCategories.add(secondBest.agent.category.toLowerCase());
            usedIds.add(secondBest.agent.id);
        }
    }

    // ── Phase 3: Add complementary agents (max 2 extras) ──
    // Only add from explicitly useful complementary categories
    const complementRules: Record<string, string[]> = {
        deployment: ['security', 'verification'],
        security:   ['verification'],
        payments:   ['verification'],
        escrow:     ['analytics'],
        streams:    ['verification'],
    };

    let extrasAdded = 0;
    for (const selected of [...selectedAgents]) {
        if (extrasAdded >= 2) break; // Max 2 complementary agents
        const cat = selected.agent.category.toLowerCase();
        const complements = complementRules[cat] || [];
        for (const compCat of complements) {
            if (extrasAdded >= 2) break;
            if (selectedAgents.length >= 5) break;
            if (usedCategories.has(compCat)) continue;

            const compAgent = allScored.find(s =>
                !usedIds.has(s.agent.id) &&
                s.agent.category.toLowerCase() === compCat
            );
            if (compAgent) {
                selectedAgents.push(compAgent);
                usedCategories.add(compCat);
                usedIds.add(compAgent.agent.id);
                extrasAdded++;
            }
        }
    }

    // ── Phase 4: Sort by execution order ──
    // Primary task agent first, then supporting agents
    const CATEGORY_ORDER: Record<string, number> = {
        deployment: 1, orchestration: 1,
        security: 2, escrow: 2,
        payments: 3, payroll: 3, streams: 3, privacy: 3,
        verification: 4,
        analytics: 5, admin: 6,
    };

    selectedAgents.sort((a, b) => {
        const orderA = CATEGORY_ORDER[a.agent.category.toLowerCase()] || 3;
        const orderB = CATEGORY_ORDER[b.agent.category.toLowerCase()] || 3;
        if (orderA !== orderB) return orderA - orderB;
        return b.score - a.score; // Higher score first within same order
    });

    // ── Phase 5: Build steps with contextual prompts ──
    const steps: DecompositionStep[] = selectedAgents.map((scored, idx) => ({
        stepIndex: idx,
        agentId: scored.agent.id,
        agentName: scored.agent.name,
        agentEmoji: scored.agent.avatarEmoji || '🤖',
        prompt: generateContextualPrompt(prompt, scored.agent, idx === 0 ? 'primary' : 'secondary'),
        budgetAllocation: 0, // Set by caller
        dependsOn: idx === 0 ? [] : [idx - 1],
        category: scored.agent.category,
    }));

    // ── Build reasoning ──
    const categoryList = [...usedCategories].join(' → ');
    const reasoning = steps.length >= 3
        ? `Orchestration plan: ${steps.length} specialized agents (${categoryList}). Sequential execution with dependency chaining ensures each step builds on the previous.`
        : steps.length === 2
            ? `Two-phase execution: ${steps[0].agentName} (${steps[0].category}) → ${steps[1].agentName} (${steps[1].category}). The second agent validates and extends the first agent's work.`
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
    const platformFee = Math.round(budget * 0.05 * 100) / 100;
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
            // Build compact catalog (only essential fields to save tokens)
            const compactCatalog = catalog.map(a => ({
                id: a.id,
                name: a.name,
                cat: a.category,
                skills: a.skills.slice(0, 5), // Limit skills for context
                price: a.basePrice,
                rating: a.avgRating,
            }));

            const systemPrompt = `You are PayPol's A2A Task Planner. Decompose user tasks into MINIMAL sub-tasks using ONLY directly relevant agents.

CRITICAL RULES — Follow strictly:
1. ONLY select agents whose skills DIRECTLY match the user's request. Do NOT add agents "just in case."
2. Use 2-4 agents typically. Only exceed 4 if the task genuinely requires more distinct capabilities.
3. Every selected agent MUST have a clear, specific role justified by the task. If you can't explain why an agent is needed in one sentence, don't include it.
4. Match agent SKILLS and CATEGORY to actual task requirements — not tangential associations.
5. Budget allocations must sum to <= ${availableBudget} (total: ${budget}, fee: ${platformFee}).
6. Each step's prompt must be specific and actionable — describe exactly what that agent should do.
7. Use dependsOn for execution ordering: steps that need prior output should depend on earlier steps.
${preferences?.parallelismPreferred ? '8. Prefer parallel execution where possible.' : '8. Use sequential dependencies where outputs feed into next steps.'}

EXAMPLES of correct behavior:
- "Build landing page with security audit" → deployment agent (build) + security agent (audit) + verification agent (proof trail) = 3 agents
- "Send payment to 0xABC" → payment agent only = 1 agent
- "Deploy token and set up payroll" → deployment agent (deploy token) + payroll agent (setup payroll) = 2 agents
- "Create escrow with milestone payments" → escrow agent + streams agent = 2 agents

EXAMPLES of WRONG behavior (do NOT do this):
- Adding "Token Minter" when user said "landing page" — NOT relevant
- Adding "Recurring Payment" when user didn't mention recurring — NOT relevant
- Adding "Treasury Manager" when no treasury analysis needed — NOT relevant
- Selecting 6+ agents for a simple 2-concept task — TOO MANY

AVAILABLE AGENTS:
${JSON.stringify(compactCatalog)}

Respond ONLY with valid JSON:
{
  "steps": [
    {
      "stepIndex": 0,
      "agentId": "uuid-from-catalog",
      "prompt": "Specific actionable instruction for this agent",
      "budgetAllocation": 50,
      "dependsOn": [],
      "category": "agent-category"
    }
  ],
  "reasoning": "One sentence explaining the decomposition"
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
                    // Deduplicate by category — keep highest budget per category
                    const seenCategories = new Set<string>();
                    const validSteps: DecompositionStep[] = [];

                    for (const step of parsed.steps) {
                        const agent = agents.find(a => a.id === step.agentId);
                        if (!agent) continue;
                        const cat = (step.category || agent.category).toLowerCase();

                        // Skip duplicate categories (AI sometimes assigns 2 agents from same category)
                        if (seenCategories.has(cat)) continue;
                        seenCategories.add(cat);

                        validSteps.push({
                            stepIndex: validSteps.length,
                            agentId: agent.id,
                            agentName: agent.name,
                            agentEmoji: agent.avatarEmoji || '🤖',
                            prompt: step.prompt || prompt,
                            budgetAllocation: step.budgetAllocation || 0,
                            dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
                            category: step.category || agent.category,
                        });
                    }

                    // Re-index dependsOn after filtering
                    steps = validSteps.map((s, idx) => ({
                        ...s,
                        stepIndex: idx,
                        dependsOn: s.dependsOn
                            .filter(d => d < validSteps.length)
                            .map(d => Math.min(d, idx - 1))
                            .filter(d => d >= 0),
                    }));

                    // Limit to max 6 agents even from AI
                    if (steps.length > 6) {
                        steps = steps.slice(0, 6);
                    }
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

    // 5. Budget allocation — proportional to agent basePrice, guaranteed within budget
    if (steps.length > 0) {
        const totalBasePrice = steps.reduce((sum, s) => {
            const agent = agents.find(a => a.id === s.agentId);
            return sum + (agent?.basePrice || 5);
        }, 0);

        // Allocate all steps except the last
        let allocated = 0;
        for (let i = 0; i < steps.length; i++) {
            if (i === steps.length - 1) {
                // Last step gets whatever remains (prevents floating-point overflow)
                steps[i].budgetAllocation = Math.round((availableBudget - allocated) * 100) / 100;
            } else {
                const agent = agents.find(a => a.id === steps[i].agentId);
                const base = agent?.basePrice || 5;
                const share = Math.floor((base / totalBasePrice) * availableBudget * 100) / 100;
                steps[i].budgetAllocation = share;
                allocated += share;
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
