import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// In-memory passkey store (production: add `metadata Json?` to Workspace model)
const passkeyStore: Map<string, {
  credentialId: string;
  publicKey: string;
  displayName: string;
  registeredAt: string;
}> = new Map();

/** GET: Check if wallet has passkey registered */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet')?.trim()?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: 'Missing wallet param' }, { status: 400 });
  }

  const passkey = passkeyStore.get(wallet);

  return NextResponse.json({
    success: true,
    hasPasskey: !!passkey,
    credentialId: passkey?.credentialId || null,
  });
}

/** POST: Register new passkey for workspace */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { wallet, credentialId, publicKey, displayName } = body;

    if (!wallet || !credentialId || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    passkeyStore.set(wallet.toLowerCase(), {
      credentialId,
      publicKey,
      displayName: displayName || 'Agentic Finance Passkey',
      registeredAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, credentialId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
