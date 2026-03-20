import { NextResponse } from 'next/server';
import { sendPayment, getTransactions, type LocusTransaction } from '@/app/lib/locus-client';
export const dynamic = 'force-dynamic';

// Local cache for charge intents (enriches Locus tx data with MPP metadata)
const chargeIntentMeta: Map<string, {
  serviceUrl: string;
  memo: string;
  locusTxId?: string;
  createdAt: number;
}> = new Map();

function mapLocusStatus(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'settled';
    case 'PENDING': case 'QUEUED': case 'PROCESSING': return 'pending';
    case 'PENDING_APPROVAL': return 'authorized';
    case 'FAILED': case 'POLICY_REJECTED': case 'CANCELLED': case 'EXPIRED': return 'expired';
    default: return 'pending';
  }
}

export async function GET() {
  try {
    // Fetch real transactions from Locus
    const hasKey = !!process.env.LOCUS_API_KEY;

    if (hasKey) {
      const result = await getTransactions({ limit: 50, category: 'send' });
      if (result.success && result.data?.transactions) {
        const intents = result.data.transactions.map((tx: LocusTransaction) => {
          const meta = Array.from(chargeIntentMeta.entries())
            .find(([, v]) => v.locusTxId === tx.id);
          return {
            intentId: meta ? meta[0] : `mpp_ci_${tx.id}`,
            serviceUrl: meta ? meta[1].serviceUrl : (tx.to_address || 'unknown'),
            amount: tx.amount,
            token: '0x20c0000000000000000000000000000000000001',
            memo: meta ? meta[1].memo : (tx.memo || ''),
            status: mapLocusStatus(tx.status),
            createdAt: tx.created_at ? new Date(tx.created_at).getTime() : Date.now(),
            txHash: tx.tx_hash || null,
            locusTxId: tx.id,
            locusStatus: tx.status,
            approvalUrl: tx.approval_url || null,
          };
        });
        return NextResponse.json({ success: true, intents, source: 'locus' });
      }
    }

    // Fallback: return local cache
    const intents = Array.from(chargeIntentMeta.entries())
      .map(([id, meta]) => ({
        intentId: id,
        serviceUrl: meta.serviceUrl,
        amount: '0',
        token: '0x20c0000000000000000000000000000000000001',
        memo: meta.memo,
        status: 'pending',
        createdAt: meta.createdAt,
        txHash: null,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    return NextResponse.json({ success: true, intents, source: 'local' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serviceUrl, amount, token, memo, recipientAddress } = body;

    if (!serviceUrl || !amount) {
      return NextResponse.json({ error: 'Missing serviceUrl or amount' }, { status: 400 });
    }

    const intentId = `mpp_ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hasKey = !!process.env.LOCUS_API_KEY;

    if (hasKey && recipientAddress) {
      // Send real USDC payment via Locus
      const result = await sendPayment({
        to_address: recipientAddress,
        amount: String(amount),
        memo: memo || `MPP Charge: ${serviceUrl}`,
      });

      if (result.success && result.data) {
        chargeIntentMeta.set(intentId, {
          serviceUrl,
          memo: memo || '',
          locusTxId: result.data.id,
          createdAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          intent: {
            intentId,
            serviceUrl,
            amount: String(amount),
            token: token || '0x20c0000000000000000000000000000000000001',
            memo: memo || '',
            status: mapLocusStatus(result.data.status),
            createdAt: Date.now(),
            txHash: result.data.tx_hash || null,
            locusTxId: result.data.id,
            approvalUrl: result.data.approval_url || null,
          },
          source: 'locus',
        });
      } else {
        return NextResponse.json({
          error: result.message || 'Locus payment failed',
          locusError: result.error,
        }, { status: 400 });
      }
    }

    // Fallback: local intent (no Locus key or no recipient)
    chargeIntentMeta.set(intentId, {
      serviceUrl,
      memo: memo || '',
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      intent: {
        intentId,
        serviceUrl,
        amount: String(amount),
        token: token || '0x20c0000000000000000000000000000000000001',
        memo: memo || '',
        status: 'pending',
        createdAt: Date.now(),
        txHash: null,
      },
      source: 'local',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
