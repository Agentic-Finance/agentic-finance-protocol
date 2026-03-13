/**
 * Fee Payer API — POST /api/fee-payer
 *
 * Receives a transaction request from an agent or user,
 * daemon sponsors the gas and broadcasts.
 *
 * Request body:
 * {
 *   from: "0x...",     // Sender address (for tracking)
 *   to: "0x...",       // Target contract
 *   data: "0x...",     // Encoded calldata
 *   value?: "0",       // Value in wei (string)
 *   gas?: "500000"     // Gas limit override (string)
 * }
 *
 * Response:
 * {
 *   txHash: "0x...",
 *   feePayer: "0x...",
 *   sponsored: true
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { sponsorTransaction, canSponsor, estimateSponsoredGas } from '../../lib/tempo/fee-payer';
import { type Address, type Hex, isAddress, isHex } from 'viem';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, data, value, gas } = body;

    // ── Validation ──
    if (!from || !isAddress(from)) {
      return NextResponse.json({ error: 'Invalid "from" address' }, { status: 400 });
    }
    if (!to || !isAddress(to)) {
      return NextResponse.json({ error: 'Invalid "to" address' }, { status: 400 });
    }
    if (!data || !isHex(data)) {
      return NextResponse.json({ error: 'Invalid "data" — must be hex-encoded calldata' }, { status: 400 });
    }

    // ── Check sponsorship capability ──
    const able = await canSponsor();
    if (!able) {
      return NextResponse.json(
        { error: 'Fee payer not available — daemon wallet not configured' },
        { status: 503 }
      );
    }

    // ── Estimate gas if not provided ──
    const gasLimit = gas ? BigInt(gas) : await estimateSponsoredGas({
      from: from as Address,
      to: to as Address,
      data: data as Hex,
      value: value ? BigInt(value) : BigInt(0),
    });

    // ── Sponsor & broadcast ──
    const result = await sponsorTransaction({
      from: from as Address,
      to: to as Address,
      data: data as Hex,
      value: value ? BigInt(value) : BigInt(0),
      gas: gasLimit,
    });

    console.log(`[FEE_PAYER] Sponsored tx for ${from} → ${to} | txHash: ${result.txHash}`);

    return NextResponse.json({
      txHash: result.txHash,
      feePayer: result.feePayer,
      sponsored: true,
      gas: gasLimit.toString(),
    });
  } catch (err: any) {
    console.error('[FEE_PAYER] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Fee sponsorship failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fee-payer — Check sponsorship status
 */
export async function GET() {
  const able = await canSponsor();
  return NextResponse.json({
    available: able,
    network: 'Tempo Moderato (42431)',
    note: 'Gas is free on testnet — sponsorship ensures mainnet readiness',
  });
}
