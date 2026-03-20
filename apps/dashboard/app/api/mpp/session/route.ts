import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// In-memory store (production: Prisma model)
const sessions: Map<string, any> = new Map();

export async function GET() {
  const all = Array.from(sessions.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  return NextResponse.json({ success: true, sessions: all });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceUrl, spendingLimit, token, durationMs } = body;

    if (!serviceUrl || !spendingLimit) {
      return NextResponse.json({ error: 'Missing serviceUrl or spendingLimit' }, { status: 400 });
    }

    const session = {
      sessionId: `mpp_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      serviceUrl,
      spendingLimit: String(spendingLimit),
      spent: '0',
      token: token || '0x20c0000000000000000000000000000000000001',
      expiresAt: Date.now() + (durationMs || 3600000),
      status: 'active',
      createdAt: Date.now(),
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
    } else if (addSpent) {
      const newSpent = BigInt(session.spent) + BigInt(addSpent);
      session.spent = String(newSpent);
      if (newSpent >= BigInt(session.spendingLimit)) {
        session.status = 'exhausted';
      }
    }

    sessions.set(sessionId, session);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
