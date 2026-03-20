import { NextResponse } from 'next/server';
import { type Address } from 'viem';
import { isTransferAllowed, getTokenPolicy, isWhitelisted } from '@/app/lib/tempo/compliance';

export const dynamic = 'force-dynamic';

const DEFAULT_TOKEN = '0x20c0000000000000000000000000000000000001' as Address;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet')?.trim() as Address | undefined;
  const token = (searchParams.get('token')?.trim() || DEFAULT_TOKEN) as Address;
  const action = searchParams.get('action') || 'check';

  if (!wallet) {
    return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });
  }

  try {
    if (action === 'policy') {
      const policy = await getTokenPolicy(token);
      return NextResponse.json({ success: true, policy });
    }

    if (action === 'whitelist') {
      const whitelisted = await isWhitelisted(token, wallet);
      return NextResponse.json({ success: true, whitelisted });
    }

    // Default: check if transfer is allowed (from treasury to wallet)
    const TREASURY = '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793' as Address;
    const allowed = await isTransferAllowed(token, TREASURY, wallet, BigInt(1_000_000));

    return NextResponse.json({
      success: true,
      wallet,
      token,
      allowed,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
