import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

// GET /api/marketplace/agents - List all active agents
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const minRating = searchParams.get('minRating');
        const verified = searchParams.get('verified');

        const agents = await prisma.marketplaceAgent.findMany({
            where: {
                isActive: true,
                ...(category ? { category } : {}),
                ...(minRating ? { avgRating: { gte: parseFloat(minRating) } } : {}),
                ...(verified === 'true' ? { isVerified: true } : {}),
            },
            orderBy: [
                { isVerified: 'desc' },
                { avgRating: 'desc' },
                { totalJobs: 'desc' },
            ],
            include: {
                _count: { select: { jobs: true, reviews: true } },
            },
        });

        const formatted = agents.map(a => ({
            ...a,
            skills: JSON.parse(a.skills),
        }));

        return NextResponse.json({ agents: formatted });
    } catch (error: any) {
        console.error("[Marketplace Agents GET]", error);
        return NextResponse.json({ error: "Failed to list agents." }, { status: 500 });
    }
}

// POST /api/marketplace/agents - Register new agent
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, category, skills, basePrice, webhookUrl, ownerWallet, avatarEmoji, source, sourceUrl } = body;

        if (!name || !description || !category || !skills || !basePrice || !ownerWallet) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        // Non-native agents must provide a webhookUrl
        const agentSource = source || 'community';
        if (agentSource !== 'native' && !webhookUrl) {
            return NextResponse.json({ error: "Non-native agents must provide a webhookUrl." }, { status: 400 });
        }

        const agent = await prisma.marketplaceAgent.create({
            data: {
                name,
                description,
                category,
                skills: typeof skills === 'string' ? skills : JSON.stringify(skills),
                basePrice: parseFloat(basePrice),
                webhookUrl: webhookUrl || null,
                ownerWallet,
                avatarEmoji: avatarEmoji || "🤖",
                isVerified: false,
                isActive: true,
                source: agentSource,
                sourceUrl: sourceUrl || null,
            },
        });

        return NextResponse.json({ success: true, agent: { ...agent, skills: JSON.parse(agent.skills) } });
    } catch (error: any) {
        console.error("[Marketplace Agents POST]", error);
        return NextResponse.json({ error: "Failed to register agent." }, { status: 500 });
    }
}
