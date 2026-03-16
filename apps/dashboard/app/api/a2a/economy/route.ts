/**
 * /api/a2a/economy — A2A Economy Aggregate Stats
 *
 * GET: Volume, top agents, flow graph data
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, logAndReturn } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = Math.min(Math.max(parseInt(searchParams.get('hours') || '720') || 720, 1), 8760); // 1h to 1 year
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Aggregate stats
    const [totalStats, recentStats, allTransfers] = await Promise.all([
      prisma.a2ATransfer.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      prisma.a2ATransfer.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.a2ATransfer.findMany({
        where: { status: 'CONFIRMED' },
        select: {
          senderWallet: true,
          receiverWallet: true,
          senderAgentId: true,
          receiverAgentId: true,
          amount: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    // Build agent flow graph: { agentWallet -> { totalSent, totalReceived, connections: Set } }
    const agentMap: Record<string, { sent: number; received: number; connections: Set<string> }> = {};

    for (const t of allTransfers) {
      // Sender
      if (!agentMap[t.senderWallet]) {
        agentMap[t.senderWallet] = { sent: 0, received: 0, connections: new Set() };
      }
      agentMap[t.senderWallet].sent += t.amount;
      agentMap[t.senderWallet].connections.add(t.receiverWallet);

      // Receiver
      if (!agentMap[t.receiverWallet]) {
        agentMap[t.receiverWallet] = { sent: 0, received: 0, connections: new Set() };
      }
      agentMap[t.receiverWallet].received += t.amount;
      agentMap[t.receiverWallet].connections.add(t.senderWallet);
    }

    // Top agents by volume
    const topAgents = Object.entries(agentMap)
      .map(([wallet, data]) => ({
        wallet,
        totalVolume: data.sent + data.received,
        totalSent: data.sent,
        totalReceived: data.received,
        connections: data.connections.size,
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 20);

    // Build flow edges for visualization
    const edgeMap: Record<string, number> = {};
    for (const t of allTransfers) {
      const key = `${t.senderWallet}→${t.receiverWallet}`;
      edgeMap[key] = (edgeMap[key] || 0) + t.amount;
    }

    const flowEdges = Object.entries(edgeMap)
      .map(([key, volume]) => {
        const [from, to] = key.split('→');
        return { from, to, volume };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 50);

    return apiSuccess({
      totalVolume: totalStats._sum.amount || 0,
      totalTransfers: totalStats._count || 0,
      recentVolume: recentStats._sum.amount || 0,
      recentTransfers: recentStats._count || 0,
      avgTransfer: totalStats._count ? (totalStats._sum.amount || 0) / totalStats._count : 0,
      activeAgents: Object.keys(agentMap).length,
      topAgents,
      flowEdges,
    });
  } catch (error: any) {
    return logAndReturn('A2A_ECONOMY', error, 'Failed to get economy stats');
  }
}
