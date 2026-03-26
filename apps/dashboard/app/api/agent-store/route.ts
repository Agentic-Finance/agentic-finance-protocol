import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PLATFORM_FEE_BPS = 500;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const category = searchParams.get('category');
    const ownerWallet = searchParams.get('owner');
    const search = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'popular';

    try {
        if (action === 'list') {
            const where: any = { isActive: true };
            if (category && category !== 'all') where.category = category;
            if (ownerWallet) where.ownerWallet = { equals: ownerWallet, mode: 'insensitive' };
            if (search) where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
            ];

            const orderBy: any = sort === 'newest' ? { createdAt: 'desc' }
                : sort === 'rating' ? { avgRating: 'desc' }
                : sort === 'price-low' ? { basePrice: 'asc' }
                : sort === 'price-high' ? { basePrice: 'desc' }
                : { totalJobs: 'desc' };

            const [agents, total] = await Promise.all([
                prisma.marketplaceAgent.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
                prisma.marketplaceAgent.count({ where }),
            ]);

            const categories = await prisma.marketplaceAgent.groupBy({
                by: ['category'], where: { isActive: true }, _count: true,
                orderBy: { _count: { category: 'desc' } },
            });

            return NextResponse.json({
                agents, total, page, totalPages: Math.ceil(total / limit),
                categories: categories.map(c => ({ name: c.category, count: c._count })),
            });
        }

        if (action === 'stats') {
            if (!ownerWallet) return NextResponse.json({ error: 'owner required' }, { status: 400 });

            const agents = await prisma.marketplaceAgent.findMany({
                where: { ownerWallet: { equals: ownerWallet, mode: 'insensitive' } },
            });

            const totalJobs = agents.reduce((s, a) => s + a.totalJobs, 0);
            const totalEarnings = agents.reduce((s, a) => s + a.totalJobs * a.basePrice, 0);
            const platformFee = totalEarnings * PLATFORM_FEE_BPS / 10000;

            return NextResponse.json({
                totalAgents: agents.length, totalJobs,
                totalEarnings: totalEarnings.toFixed(2),
                devEarnings: (totalEarnings - platformFee).toFixed(2),
                platformFeeBps: PLATFORM_FEE_BPS,
                agents: agents.map(a => ({
                    id: a.id, name: a.name, category: a.category,
                    jobs: a.totalJobs, earnings: (a.totalJobs * a.basePrice).toFixed(2),
                    rating: a.avgRating, isActive: a.isActive,
                })),
            });
        }

        return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'publish') {
            const { name, description, category, skills, basePrice, ownerWallet, avatarEmoji, webhookUrl, source, sourceUrl } = body;
            if (!name || !description || !category || !ownerWallet) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            const agent = await prisma.marketplaceAgent.create({
                data: {
                    name, description, category,
                    skills: typeof skills === 'string' ? skills : JSON.stringify(skills || []),
                    basePrice: parseFloat(basePrice) || 5,
                    ownerWallet,
                    avatarEmoji: avatarEmoji || '🤖',
                    avatarUrl: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f172a`,
                    isVerified: false, totalJobs: 0, successRate: 100,
                    avgRating: 5.0, ratingCount: 0, responseTime: 10,
                    source: source || 'community', sourceUrl: sourceUrl || '',
                    webhookUrl: webhookUrl || '', isActive: true,
                },
            });

            return NextResponse.json({ success: true, agent: { id: agent.id, name: agent.name } });
        }

        if (action === 'update') {
            const { agentId, ownerWallet, ...updates } = body;
            const existing = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
            if (!existing || existing.ownerWallet.toLowerCase() !== ownerWallet?.toLowerCase()) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }

            const allowed = ['description', 'basePrice', 'webhookUrl', 'skills', 'avatarEmoji'];
            const data: any = {};
            for (const key of allowed) { if (updates[key] !== undefined) data[key] = updates[key]; }

            await prisma.marketplaceAgent.update({ where: { id: agentId }, data });
            return NextResponse.json({ success: true });
        }

        if (action === 'unpublish') {
            const { agentId, ownerWallet } = body;
            const existing = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
            if (!existing || existing.ownerWallet.toLowerCase() !== ownerWallet?.toLowerCase()) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
            await prisma.marketplaceAgent.update({ where: { id: agentId }, data: { isActive: false } });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
