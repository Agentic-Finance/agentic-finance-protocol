import { NextResponse } from 'next/server';
import { lasoAuth, lasoGetCard, lasoSendPayment } from '@/app/lib/locus-client';
export const dynamic = 'force-dynamic';

/**
 * Laso Finance API — Prepaid Visa Cards + Venmo/PayPal payments
 *
 * POST body actions:
 *   { action: 'auth' }                          — Authenticate ($0.001)
 *   { action: 'card', amount: 25 }              — Order prepaid Visa ($5-$1000, US only)
 *   { action: 'pay', method: 'venmo'|'paypal', recipient: '...', amount: 25, note?: '...' }
 */
export async function POST(req: Request) {
  try {
    if (!process.env.LOCUS_API_KEY) {
      return NextResponse.json({
        error: 'LOCUS_API_KEY not configured',
        message: 'Set LOCUS_API_KEY in environment to enable Laso Finance payments',
      }, { status: 503 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'auth': {
        const result = await lasoAuth();
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'card': {
        const { amount, merchant } = body;
        if (!amount || amount < 5 || amount > 1000) {
          return NextResponse.json({ error: 'Amount must be $5-$1000' }, { status: 400 });
        }
        const result = await lasoGetCard({ amount, merchant });
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case 'pay': {
        const { method, recipient, amount, note } = body;
        if (!method || !['venmo', 'paypal'].includes(method)) {
          return NextResponse.json({ error: 'Method must be venmo or paypal' }, { status: 400 });
        }
        if (!recipient) {
          return NextResponse.json({ error: 'Recipient required (phone for Venmo, email for PayPal)' }, { status: 400 });
        }
        if (!amount || amount < 5 || amount > 1000) {
          return NextResponse.json({ error: 'Amount must be $5-$1000' }, { status: 400 });
        }
        const result = await lasoSendPayment({ method, recipient, amount, note });
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: auth, card, pay' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
