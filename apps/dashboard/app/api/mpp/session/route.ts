import { NextResponse } from 'next/server';
import { sendPayment, getBalance } from '@/app/lib/locus-client';
export const dynamic = 'force-dynamic';

// Sessions with spending limits — tracked locally, payments via Locus
interface MppSessionData {
  sessionId: string;
  serviceUrl: string;
  spendingLimit: string;
  spent: string;
  token: string;
  expiresAt: number;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled';
  createdAt: number;
  recipientAddress?: string;
  payments: { amount: string; locusTxId?: string; timestamp: number }[];
}

const sessions: Map<string, MppSessionData> = new Map();

export async function GET() {
  try {
    const hasKey = !!process.env.LOCUS_API_KEY;
    let walletBalance: string | null = null;

    if (hasKey) {
      try {
        const balRes = await getBalance();
        if (balRes.success && balRes.data) {
          walletBalance = balRes.data.balance;
        }
      } catch { /* ignore */ }
    }

    // Check & expire sessions
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.status === 'active' && now > session.expiresAt) {
        session.status = 'expired';
        sessions.set(id, session);
      }
    }

    const all = Array.from(sessions.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    return NextResponse.json({
      success: true,
      sessions: all,
      walletBalance,
      source: hasKey ? 'locus' : 'local',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceUrl, spendingLimit, token, durationMs, recipientAddress } = body;

    if (!serviceUrl || !spendingLimit) {
      return NextResponse.json({ error: 'Missing serviceUrl or spendingLimit' }, { status: 400 });
    }

    const session: MppSessionData = {
      sessionId: `mpp_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      serviceUrl,
      spendingLimit: String(spendingLimit),
      spent: '0',
      token: token || '0x20c0000000000000000000000000000000000001',
      expiresAt: Date.now() + (durationMs || 3600000),
      status: 'active',
      createdAt: Date.now(),
      recipientAddress,
      payments: [],
    };

    sessions.set(session.sessionId, session);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, addSpent, cancel } = body;

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (cancel) {
      session.status = 'cancelled';
      sessions.set(sessionId, session);
      return NextResponse.json({ success: true, session });
    }

    if (addSpent) {
      // Check session validity
      if (session.status !== 'active') {
        return NextResponse.json({ error: 'Session not active' }, { status: 400 });
      }
      if (Date.now() > session.expiresAt) {
        session.status = 'expired';
        sessions.set(sessionId, session);
        return NextResponse.json({ error: 'Session expired' }, { status: 400 });
      }

      const newSpent = BigInt(session.spent) + BigInt(addSpent);
      if (newSpent > BigInt(session.spendingLimit)) {
        return NextResponse.json({ error: 'Spending limit exceeded' }, { status: 400 });
      }

      // If Locus key available and recipient, send real payment
      const hasKey = !!process.env.LOCUS_API_KEY;
      let locusTxId: string | undefined;

      if (hasKey && session.recipientAddress) {
        const result = await sendPayment({
          to_address: session.recipientAddress,
          amount: String(addSpent),
          memo: `MPP Session ${sessionId}: ${session.serviceUrl}`,
        });

        if (!result.success) {
          return NextResponse.json({
            error: result.message || 'Payment failed',
            locusError: result.error,
          }, { status: 400 });
        }
        locusTxId = result.data?.id;
      }

      session.spent = String(newSpent);
      session.payments.push({
        amount: String(addSpent),
        locusTxId,
        timestamp: Date.now(),
      });

      if (newSpent >= BigInt(session.spendingLimit)) {
        session.status = 'exhausted';
      }

      sessions.set(sessionId, session);
      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
