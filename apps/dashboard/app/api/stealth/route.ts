/**
 * Stealth Address API (ERC-5564)
 *
 * POST /api/stealth — Register meta-address, generate stealth address, or send stealth payment
 * GET  /api/stealth — List announcements (for scanning) or get meta-address
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import {
  generateStealthKeys,
  generateMetaAddress,
  generateStealthAddress,
  checkStealthAddress,
  parseMetaAddress,
} from '@/app/lib/stealth/crypto';

// ────────────────────────────────────────────
// GET /api/stealth
// ────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const wallet = searchParams.get('wallet');

  // Get meta-address for a wallet
  if (action === 'meta-address' && wallet) {
    const meta = await prisma.stealthMetaAddress.findUnique({
      where: { wallet },
    });

    if (!meta) {
      return NextResponse.json({ error: 'Meta-address not found for this wallet' }, { status: 404 });
    }

    return NextResponse.json({
      wallet: meta.wallet,
      metaAddress: meta.metaAddress,
      spendingPubKey: meta.spendingPubKey,
      viewingPubKey: meta.viewingPubKey,
      createdAt: meta.createdAt,
    });
  }

  // List stealth announcements (for recipient scanning)
  if (action === 'announcements') {
    const since = searchParams.get('since');
    const viewTag = searchParams.get('viewTag');
    const limit = parseInt(searchParams.get('limit') || '50');

    const announcements = await prisma.stealthPayment.findMany({
      where: {
        ...(since ? { createdAt: { gte: new Date(since) } } : {}),
        ...(viewTag ? { viewTag } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      select: {
        id: true,
        stealthAddress: true,
        ephemeralPubKey: true,
        viewTag: true,
        amount: true,
        token: true,
        txHash: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      announcements,
      count: announcements.length,
      tip: 'Use viewTag to filter before full scan (67% filter rate per ERC-5564)',
    });
  }

  // Protocol info
  const stats = await Promise.all([
    prisma.stealthMetaAddress.count(),
    prisma.stealthPayment.count(),
    prisma.stealthPayment.aggregate({ _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    protocol: 'ERC-5564 Stealth Addresses',
    chain: 'Tempo Moderato (42431)',
    description: 'Unlinkable agent-to-agent payments. Observer cannot link sender to recipient.',
    stats: {
      registeredMetaAddresses: stats[0],
      totalStealthPayments: stats[1],
      totalVolume: stats[2]._sum?.amount || 0,
    },
    endpoints: {
      register: 'POST /api/stealth { action: "register", wallet, seed }',
      generate: 'POST /api/stealth { action: "generate", recipientWallet }',
      send: 'POST /api/stealth { action: "send", recipientWallet, amount }',
      scan: 'POST /api/stealth { action: "scan", viewingKey, spendingPubKey }',
      meta: 'GET /api/stealth?action=meta-address&wallet=0x...',
      announcements: 'GET /api/stealth?action=announcements&viewTag=0x...',
    },
  });
}

// ────────────────────────────────────────────
// POST /api/stealth
// ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'register':
        return await handleRegister(body);
      case 'generate':
        return await handleGenerate(body);
      case 'send':
        return await handleSend(body);
      case 'scan':
        return await handleScan(body);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: register, generate, send, scan' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Stealth API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// Action Handlers
// ────────────────────────────────────────────

/**
 * Register a stealth meta-address for a wallet
 */
async function handleRegister(body: any) {
  const { wallet, seed } = body;
  if (!wallet || !seed) {
    return NextResponse.json({ error: 'Missing wallet or seed' }, { status: 400 });
  }

  // Check if already registered
  const existing = await prisma.stealthMetaAddress.findUnique({ where: { wallet } });
  if (existing) {
    return NextResponse.json({
      success: true,
      message: 'Meta-address already registered',
      metaAddress: existing.metaAddress,
    });
  }

  // Generate keys from seed
  const keys = generateStealthKeys(seed);
  const meta = generateMetaAddress(keys);

  // Save to database
  const record = await prisma.stealthMetaAddress.create({
    data: {
      wallet,
      spendingPubKey: meta.spendingPubKey,
      viewingPubKey: meta.viewingPubKey,
      metaAddress: meta.metaAddress,
    },
  });

  return NextResponse.json({
    success: true,
    wallet: record.wallet,
    metaAddress: record.metaAddress,
    spendingPubKey: meta.spendingPubKey,
    viewingPubKey: meta.viewingPubKey,
    message: 'Stealth meta-address registered. Share your metaAddress with senders.',
  });
}

/**
 * Generate a stealth address for a recipient
 */
async function handleGenerate(body: any) {
  const { recipientWallet, metaAddress: metaAddrStr } = body;

  let spendingPubKey: string;
  let viewingPubKey: string;

  if (metaAddrStr) {
    // Parse provided meta-address
    const parsed = parseMetaAddress(metaAddrStr);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid meta-address format' }, { status: 400 });
    }
    spendingPubKey = parsed.spendingPubKey;
    viewingPubKey = parsed.viewingPubKey;
  } else if (recipientWallet) {
    // Lookup from registry
    const meta = await prisma.stealthMetaAddress.findUnique({
      where: { wallet: recipientWallet },
    });
    if (!meta) {
      return NextResponse.json(
        { error: 'Recipient has no registered stealth meta-address' },
        { status: 404 }
      );
    }
    spendingPubKey = meta.spendingPubKey;
    viewingPubKey = meta.viewingPubKey;
  } else {
    return NextResponse.json(
      { error: 'Provide recipientWallet or metaAddress' },
      { status: 400 }
    );
  }

  const stealth = generateStealthAddress(spendingPubKey, viewingPubKey);

  return NextResponse.json({
    success: true,
    stealthAddress: stealth.address,
    ephemeralPubKey: stealth.ephemeralPubKey,
    viewTag: stealth.viewTag,
    instructions: 'Send funds to stealthAddress. Publish ephemeralPubKey + viewTag as announcement.',
  });
}

/**
 * Send a stealth payment (generate address + record announcement)
 */
async function handleSend(body: any) {
  const { recipientWallet, amount, senderWallet, memo } = body;
  if (!recipientWallet || !amount) {
    return NextResponse.json({ error: 'Missing recipientWallet or amount' }, { status: 400 });
  }

  // Lookup recipient meta-address
  const meta = await prisma.stealthMetaAddress.findUnique({
    where: { wallet: recipientWallet },
  });
  if (!meta) {
    return NextResponse.json(
      { error: 'Recipient has no registered stealth meta-address' },
      { status: 404 }
    );
  }

  // Generate stealth address
  const stealth = generateStealthAddress(meta.spendingPubKey, meta.viewingPubKey);

  // Record the payment announcement
  const payment = await prisma.stealthPayment.create({
    data: {
      senderWallet: senderWallet || 'anonymous',
      recipientMetaId: meta.id,
      stealthAddress: stealth.address,
      ephemeralPubKey: stealth.ephemeralPubKey,
      viewTag: stealth.viewTag,
      amount: parseFloat(String(amount)),
      token: 'AlphaUSD',
      memo: memo || null,
      status: 'PENDING',
    },
  });

  return NextResponse.json({
    success: true,
    paymentId: payment.id,
    stealthAddress: stealth.address,
    ephemeralPubKey: stealth.ephemeralPubKey,
    viewTag: stealth.viewTag,
    amount,
    status: 'PENDING',
    message: 'Send AlphaUSD to the stealthAddress. Only the recipient can spend from it.',
  });
}

/**
 * Scan announcements to find payments addressed to you
 */
async function handleScan(body: any) {
  const { viewingKey, spendingPubKey, since, viewTag: filterViewTag } = body;
  if (!viewingKey || !spendingPubKey) {
    return NextResponse.json(
      { error: 'Missing viewingKey or spendingPubKey' },
      { status: 400 }
    );
  }

  // Fetch announcements
  const announcements = await prisma.stealthPayment.findMany({
    where: {
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
      ...(filterViewTag ? { viewTag: filterViewTag } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Check each announcement
  const myPayments = announcements.filter((a) =>
    checkStealthAddress(
      viewingKey,
      a.ephemeralPubKey,
      spendingPubKey,
      a.stealthAddress
    )
  );

  return NextResponse.json({
    scanned: announcements.length,
    found: myPayments.length,
    payments: myPayments.map((p) => ({
      paymentId: p.id,
      stealthAddress: p.stealthAddress,
      ephemeralPubKey: p.ephemeralPubKey,
      amount: p.amount,
      token: p.token,
      status: p.status,
      createdAt: p.createdAt,
    })),
  });
}
