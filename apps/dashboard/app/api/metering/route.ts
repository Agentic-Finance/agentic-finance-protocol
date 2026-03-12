/**
 * Streaming Micropayment Metering API
 *
 * POST /api/metering           → Open a metering session (pre-fund budget)
 * GET  /api/metering?wallet=   → List active sessions
 *
 * Enables pay-per-inference for AI agents:
 * 1. Client opens session with budget cap
 * 2. Each agent call deducts pricePerCall
 * 3. Session auto-closes when budget exhausted or expired
 * 4. Final settlement on-chain via StreamV1
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { requireWalletAuth } from '@/app/lib/api-auth';
import { writeLimiter, getClientId } from '@/app/lib/rate-limit';

/**
 * POST /api/metering — Open new metering session
 *
 * Body: {
 *   agentWallet: string,
 *   agentId?: string,       // MarketplaceAgent ID
 *   budgetCap: number,      // Max spend in token units
 *   pricePerCall?: number,  // Per-inference price (default 0.1)
 *   token?: string,         // Token address (default AlphaUSD)
 *   expiresInHours?: number // Auto-expire (default 24h)
 * }
 */
export async function POST(req: NextRequest) {
  const auth = requireWalletAuth(req);
  if (!auth.valid) return auth.response!;

  const limit = writeLimiter.check(getClientId(req, auth.wallet));
  if (!limit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const {
      agentWallet,
      agentId,
      budgetCap,
      pricePerCall = 0.1,
      token = '0x20c0000000000000000000000000000000000001',
      expiresInHours = 24,
    } = body;

    if (!agentWallet || !budgetCap || budgetCap <= 0) {
      return NextResponse.json(
        { error: 'agentWallet and budgetCap > 0 required' },
        { status: 400 },
      );
    }

    if (pricePerCall <= 0) {
      return NextResponse.json(
        { error: 'pricePerCall must be > 0' },
        { status: 400 },
      );
    }

    // Check for existing active session between same pair
    const existing = await prisma.meteringSession.findFirst({
      where: {
        clientWallet: auth.wallet!,
        agentWallet: agentWallet.toLowerCase(),
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: 'Active session already exists',
          existingSessionId: existing.id,
          spent: existing.spent,
          remaining: existing.budgetCap - existing.spent,
        },
        { status: 409 },
      );
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 3600_000);
    const maxCalls = Math.floor(budgetCap / pricePerCall);

    const session = await prisma.meteringSession.create({
      data: {
        clientWallet: auth.wallet!,
        agentWallet: agentWallet.toLowerCase(),
        agentId: agentId || null,
        token,
        budgetCap,
        pricePerCall,
        expiresAt,
        metadata: JSON.stringify({
          createdVia: 'api',
          maxEstimatedCalls: maxCalls,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        clientWallet: session.clientWallet,
        agentWallet: session.agentWallet,
        budgetCap: session.budgetCap,
        pricePerCall: session.pricePerCall,
        maxEstimatedCalls: maxCalls,
        spent: 0,
        remaining: session.budgetCap,
        status: session.status,
        expiresAt: session.expiresAt?.toISOString(),
      },
    });

  } catch (err: any) {
    console.error('[metering] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to create metering session' }, { status: 500 });
  }
}

/**
 * GET /api/metering?wallet=0x...&status=ACTIVE
 */
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase();
    const status = req.nextUrl.searchParams.get('status');

    if (!wallet) {
      return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
    }

    const where: any = {
      OR: [
        { clientWallet: wallet },
        { agentWallet: wallet },
      ],
    };
    if (status) where.status = status;

    const sessions = await prisma.meteringSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = sessions.map(s => ({
      id: s.id,
      clientWallet: s.clientWallet,
      agentWallet: s.agentWallet,
      budgetCap: s.budgetCap,
      spent: s.spent,
      remaining: Math.max(0, s.budgetCap - s.spent),
      pricePerCall: s.pricePerCall,
      totalCalls: s.totalCalls,
      status: s.status,
      token: s.token,
      expiresAt: s.expiresAt?.toISOString(),
      closedAt: s.closedAt?.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, sessions: formatted });

  } catch (err: any) {
    console.error('[metering] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}
