import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import prisma from '@/app/lib/prisma';

// Lazy-init: avoid throwing at module load when OPENAI_API_KEY is unset (CI builds)
let _openai: OpenAI | null = null;
function getOpenAI() {
    if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
}

// ──────────────────────────────────────────────
// Local keyword fallback when OpenAI is unavailable
// ──────────────────────────────────────────────
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
                : `Recommended based on quality metrics (${agent.avgRating}★, ${agent.successRate}% success)`,
            agent: {
                id: agent.id,
                name: agent.name,
                description: agent.description,
                category: agent.category,
                skills: JSON.parse(agent.skills),
                basePrice: agent.basePrice,
                ownerWallet: agent.ownerWallet,
                avatarEmoji: agent.avatarEmoji,
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

export async function POST(req: Request) {
    try {
        const { prompt, budget, category } = await req.json();

        if (!prompt || prompt.trim().length < 3) {
            return NextResponse.json({ error: "Prompt too short." }, { status: 400 });
        }

        // 1. Fetch all active agents from DB
        const agents = await prisma.marketplaceAgent.findMany({
            where: {
                isActive: true,
                ...(category ? { category } : {}),
            },
            orderBy: { avgRating: 'desc' },
        });

        if (agents.length === 0) {
            return NextResponse.json({ matches: [], suggestedBudget: 0 });
        }

        // 2. Try AI-powered matching first
        let aiResult: any = null;
        try {
            const agentCatalog = agents.map(a => ({
                id: a.id,
                name: a.name,
                category: a.category,
                skills: JSON.parse(a.skills),
                basePrice: a.basePrice,
                avgRating: a.avgRating,
                successRate: a.successRate,
                totalJobs: a.totalJobs,
                responseTime: a.responseTime,
                isVerified: a.isVerified,
            }));

            const systemPrompt = `You are PayPol's Agent Router - an AI that matches user tasks to the best available agents.

Given a user's task description and a catalog of available agents, analyze the task requirements and rank the TOP 3 most suitable agents.

AGENT CATALOG:
${JSON.stringify(agentCatalog, null, 2)}

RESPOND IN JSON FORMAT:
{
  "matches": [
    {
      "agentId": "uuid of the agent",
      "relevanceScore": 95,
      "reasoning": "One sentence explaining why this agent is the best fit"
    }
  ],
  "suggestedBudget": 150,
  "taskCategory": "security"
}

Rules:
- relevanceScore is 0-100 based on skill match, category alignment, and agent track record
- suggestedBudget should be realistic based on the agents' base prices and task complexity
- taskCategory should be one of: security, defi, payroll, analytics, automation, compliance, governance, tax, nft, deployment
- Return maximum 3 matches, sorted by relevanceScore descending
- If no agent is suitable, return empty matches array`;

            const completion = await getOpenAI().chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Task: ${prompt}${budget ? `\nBudget: ${budget} AlphaUSD` : ''}` }
                ],
                temperature: 0.2,
            });

            const resultText = completion.choices[0].message.content;
            if (resultText) {
                aiResult = JSON.parse(resultText);
            }
        } catch (aiError: any) {
            console.warn("[Marketplace Discover] OpenAI unavailable, using local fallback:", aiError.message);
        }

        // 3. If AI succeeded with matches, use them
        if (aiResult && aiResult.matches && aiResult.matches.length > 0) {
            const enrichedMatches = aiResult.matches.map((match: any) => {
                const agent = agents.find(a => a.id === match.agentId);
                if (!agent) return null;
                return {
                    ...match,
                    agent: {
                        id: agent.id,
                        name: agent.name,
                        description: agent.description,
                        category: agent.category,
                        skills: JSON.parse(agent.skills),
                        basePrice: agent.basePrice,
                        ownerWallet: agent.ownerWallet,
                        avatarEmoji: agent.avatarEmoji,
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
            }).filter(Boolean);

            if (enrichedMatches.length > 0) {
                return NextResponse.json({
                    matches: enrichedMatches,
                    suggestedBudget: aiResult.suggestedBudget || 100,
                    taskCategory: aiResult.taskCategory || 'analytics',
                });
            }
        }

        // 4. LOCAL FALLBACK: keyword matching
        const fallbackMatches = localKeywordMatch(prompt, agents);
        return NextResponse.json({
            matches: fallbackMatches,
            suggestedBudget: fallbackMatches[0]?.agent?.basePrice || 100,
            taskCategory: fallbackMatches[0]?.agent?.category || 'analytics',
            fallback: true,
        });

    } catch (error: any) {
        console.error("[Marketplace Discover] Error:", error);
        return NextResponse.json({ error: "Agent discovery failed." }, { status: 500 });
    }
}
