import { NextResponse } from 'next/server';
import { getBalance } from '@/app/lib/locus-client';
export const dynamic = 'force-dynamic';

/** GET /api/mpp/balance — Locus wallet USDC balance */
export async function GET() {
  try {
    if (!process.env.LOCUS_API_KEY) {
      return NextResponse.json({
        success: true,
        balance: '0.00',
        address: null,
        source: 'local',
      });
    }

    const result = await getBalance();
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        balance: result.data.balance,
        address: result.data.address,
        source: 'locus',
      });
    }

    return NextResponse.json({
      success: false,
      error: result.message || 'Failed to fetch balance',
    }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
