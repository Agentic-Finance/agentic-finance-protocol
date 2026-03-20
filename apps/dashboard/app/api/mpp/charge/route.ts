import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// In-memory store (production: Prisma model)
const chargeIntents: Map<string, any> = new Map();

export async function GET() {
  const intents = Array.from(chargeIntents.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  return NextResponse.json({ success: true, intents });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceUrl, amount, token, memo } = body;

    if (!serviceUrl || !amount) {
      return NextResponse.json({ error: 'Missing serviceUrl or amount' }, { status: 400 });
    }

    const intent = {
      intentId: `mpp_ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      serviceUrl,
      amount: String(amount),
      token: token || '0x20c0000000000000000000000000000000000001',
      memo: memo || '',
      status: 'pending',
      createdAt: Date.now(),
      txHash: null,
    };

    chargeIntents.set(intent.intentId, intent);
    return NextResponse.json({ success: true, intent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
