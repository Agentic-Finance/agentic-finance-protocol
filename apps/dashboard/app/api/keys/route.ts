/**
 * API Key Management
 *
 * GET  /api/keys?wallet=0x... — List all keys for a wallet
 * POST /api/keys              — Generate a new API key
 * DELETE /api/keys?id=xxx     — Revoke an API key
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import crypto from 'crypto';
import { getClientId } from '@/app/lib/api-auth';
import { keyLimiter, apiLimiter } from '@/app/lib/rate-limit';

function generateApiKey(prefix: string = 'pp_live'): string {
  const random = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${random}`;
}

// ── GET: List keys for a wallet ──
export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const clientId = getClientId(req);
    const limit = apiLimiter.check(clientId);
    if (!limit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: 'wallet parameter required' }, { status: 400 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { ownerWallet: wallet },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        name: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        rateLimit: true,
        requestCount: true,
        createdAt: true,
      },
    });

    // Mask the key — only show prefix + last 8 chars
    const masked = keys.map(k => ({
      ...k,
      key: k.key.substring(0, 8) + '...' + k.key.slice(-8),
      fullKey: undefined, // Never expose full key in list
    }));

    return NextResponse.json({ keys: masked });
  } catch (error: any) {
    console.error('[api/keys GET]', error.message);
    return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 });
  }
}

// ── POST: Generate new API key ──
export async function POST(req: NextRequest) {
  try {
    // Strict rate limit for key generation
    const clientId = getClientId(req);
    const limit = keyLimiter.check(clientId);
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 5 key generation requests per minute.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { wallet, name, permissions } = body;

    if (!wallet || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet, name' },
        { status: 400 },
      );
    }

    // Validate wallet format
    if (!wallet.startsWith('0x') || wallet.length !== 42) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 },
      );
    }

    // Limit keys per wallet (max 10)
    const existingCount = await prisma.apiKey.count({
      where: { ownerWallet: wallet, isActive: true },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 active API keys per wallet. Revoke an existing key first.' },
        { status: 400 },
      );
    }

    const key = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name,
        ownerWallet: wallet,
        permissions: permissions || 'read,execute',
        rateLimit: 100,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        key, // Return full key ONLY at creation time
        name: apiKey.name,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt,
      },
      message: 'API key created. Save this key — it will not be shown again.',
    });
  } catch (error: any) {
    console.error('[api/keys POST]', error.message);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

// ── DELETE: Revoke an API key ──
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const wallet = req.nextUrl.searchParams.get('wallet');

    if (!id || !wallet) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, wallet' },
        { status: 400 },
      );
    }

    // Ensure the key belongs to the requesting wallet
    const existing = await prisma.apiKey.findFirst({
      where: { id, ownerWallet: wallet },
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error: any) {
    console.error('[api/keys DELETE]', error.message);
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
  }
}
