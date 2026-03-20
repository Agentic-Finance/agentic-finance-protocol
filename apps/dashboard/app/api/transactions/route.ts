import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export const dynamic = 'force-dynamic';

interface UnifiedTx {
  id: string;
  type: 'escrow' | 'stream' | 'shield' | 'payout';
  amount: number;
  token: string;
  status: string;
  counterparty: string;
  txHash: string | null;
  date: string;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const wallet = sp.get('wallet')?.toLowerCase();
    const type = sp.get('type') || 'all';
    const limit = Math.min(parseInt(sp.get('limit') || '50'), 100);
    const offset = parseInt(sp.get('offset') || '0');

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    const results: UnifiedTx[] = [];

    // Escrows (AgentJob)
    if (type === 'all' || type === 'escrow') {
      const jobs = await prisma.agentJob.findMany({
        where: { clientWallet: { equals: wallet, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { agent: { select: { name: true, ownerWallet: true } } },
      });
      for (const j of jobs) {
        results.push({
          id: j.id,
          type: 'escrow',
          amount: j.negotiatedPrice ?? j.budget,
          token: j.token,
          status: j.status,
          counterparty: j.agent.name,
          txHash: j.escrowTxHash || j.settleTxHash || null,
          date: j.createdAt.toISOString(),
        });
      }
    }

    // Streams (StreamJob)
    if (type === 'all' || type === 'stream') {
      const streams = await prisma.streamJob.findMany({
        where: {
          OR: [
            { clientWallet: { equals: wallet, mode: 'insensitive' } },
            { agentWallet: { equals: wallet, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      for (const s of streams) {
        results.push({
          id: s.id,
          type: 'stream',
          amount: s.totalBudget,
          token: 'AlphaUSD',
          status: s.status,
          counterparty: s.agentName || s.agentWallet,
          txHash: s.streamTxHash || null,
          date: s.createdAt.toISOString(),
        });
      }
    }

    // Shield (TimeVaultPayload)
    if (type === 'all' || type === 'shield') {
      const payloads = await prisma.timeVaultPayload.findMany({
        where: {
          workspace: { adminWallet: { equals: wallet, mode: 'insensitive' } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      for (const p of payloads) {
        results.push({
          id: p.id,
          type: 'shield',
          amount: p.amount ?? 0,
          token: p.token,
          status: p.status,
          counterparty: p.recipientWallet,
          txHash: null,
          date: p.createdAt.toISOString(),
        });
      }
    }

    // Payouts
    if (type === 'all' || type === 'payout') {
      const payouts = await prisma.payoutRecord.findMany({
        where: { recipient: { equals: wallet, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      for (const p of payouts) {
        results.push({
          id: p.id,
          type: 'payout',
          amount: p.amount,
          token: p.token,
          status: 'COMPLETED',
          counterparty: 'Platform',
          txHash: p.txHash,
          date: p.createdAt.toISOString(),
        });
      }
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    const paginated = results.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      transactions: paginated,
      total: results.length,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/transactions] GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
