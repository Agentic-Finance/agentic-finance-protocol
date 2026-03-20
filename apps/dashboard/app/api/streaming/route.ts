import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// In-memory store for streaming payroll (production: Prisma + on-chain StreamingPayroll contract)
const streamingPayrolls: Map<string, any> = new Map();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet')?.trim()?.toLowerCase();

  const all = Array.from(streamingPayrolls.values());
  const filtered = wallet
    ? all.filter(s =>
        s.employerWallet.toLowerCase() === wallet ||
        s.employeeWallet.toLowerCase() === wallet
      )
    : all;

  // Enrich with real-time accrued amounts
  const enriched = filtered.map(s => {
    const now = Date.now();
    const startMs = new Date(s.startTime).getTime();
    const endMs = s.stopTime ? new Date(s.stopTime).getTime() : now;
    const effectiveEnd = Math.min(endMs, now);
    const elapsedSeconds = Math.max(0, Math.floor((effectiveEnd - startMs) / 1000));
    const accrued = Math.min(
      elapsedSeconds * parseFloat(s.ratePerSecond),
      parseFloat(s.totalDeposited)
    );
    return {
      ...s,
      accrued: accrued.toFixed(6),
      claimable: Math.max(0, accrued - parseFloat(s.totalClaimed)).toFixed(6),
      elapsedSeconds,
    };
  });

  return NextResponse.json({ success: true, streams: enriched });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employerWallet, employeeWallet, employeeName, token, ratePerSecond, durationSeconds, depositAmount } = body;

    if (!employerWallet || !employeeWallet || !ratePerSecond) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const stream = {
      id,
      employerWallet,
      employeeWallet,
      employeeName: employeeName || 'Unknown',
      token: token || '0x20c0000000000000000000000000000000000001',
      ratePerSecond: ratePerSecond.toString(),
      startTime: now,
      stopTime: durationSeconds ? new Date(Date.now() + durationSeconds * 1000).toISOString() : null,
      totalDeposited: depositAmount?.toString() || '0',
      totalClaimed: '0',
      status: 'active',
      onChainStreamId: null,
      createdAt: now,
    };

    streamingPayrolls.set(id, stream);
    return NextResponse.json({ success: true, stream });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
