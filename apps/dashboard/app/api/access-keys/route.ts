/**
 * Access Keys API — /api/access-keys
 *
 * POST   — Register new access key for an agent
 * GET    — List active access keys
 * PATCH  — Update spending limit or status
 * DELETE — Revoke an access key
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isAddress } from 'viem';
import {
  getDefaultConfig,
  type AccessKeyTier,
  ACCESS_KEY_TIERS,
} from '../../lib/tempo/access-keys';

const prisma = new PrismaClient();

// ────────────────────────────────────────────
// POST — Register Access Key
// ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentWallet,
      agentId,
      tier = 'basic',
      spendingLimit,
      allowedContracts = '*',
      validUntil,
    } = body;

    // Validate
    if (!agentWallet || !isAddress(agentWallet)) {
      return NextResponse.json({ error: 'Invalid agent wallet address' }, { status: 400 });
    }

    if (tier && !ACCESS_KEY_TIERS[tier as AccessKeyTier]) {
      return NextResponse.json({ error: `Invalid tier. Valid: ${Object.keys(ACCESS_KEY_TIERS).join(', ')}` }, { status: 400 });
    }

    // Check for existing key
    const existing = await prisma.accessKey.findUnique({
      where: { agentWallet },
    });
    if (existing && existing.isActive) {
      return NextResponse.json({ error: 'Active access key already exists for this wallet. Revoke first.' }, { status: 409 });
    }

    // Get defaults from tier
    const defaults = getDefaultConfig((tier as AccessKeyTier) || 'basic');
    const limit = spendingLimit ?? defaults.spendingLimit;
    const expiry = validUntil ? new Date(validUntil) : defaults.validUntil;

    // Calculate period reset (24h from now)
    const periodResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Upsert (in case there's a revoked key for this wallet)
    const accessKey = await prisma.accessKey.upsert({
      where: { agentWallet },
      create: {
        agentWallet,
        agentId: agentId || null,
        daemonWallet: process.env.DAEMON_WALLET || '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
        spendingLimit: limit,
        spentThisPeriod: 0,
        periodResetAt,
        allowedContracts: Array.isArray(allowedContracts) ? allowedContracts.join(',') : allowedContracts,
        validUntil: expiry,
        isActive: true,
      },
      update: {
        agentId: agentId || undefined,
        spendingLimit: limit,
        spentThisPeriod: 0,
        periodResetAt,
        allowedContracts: Array.isArray(allowedContracts) ? allowedContracts.join(',') : allowedContracts,
        validUntil: expiry,
        isActive: true,
        revokedAt: null,
        revokeReason: null,
      },
    });

    console.log(`[ACCESS_KEY] Registered: ${agentWallet} | limit: ${limit} | tier: ${tier} | expires: ${expiry.toISOString()}`);

    return NextResponse.json({
      id: accessKey.id,
      agentWallet: accessKey.agentWallet,
      spendingLimit: accessKey.spendingLimit,
      validUntil: accessKey.validUntil,
      tier,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[ACCESS_KEY] Create error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create access key' }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// GET — List Access Keys
// ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const activeOnly = searchParams.get('active') !== 'false';

    const where: any = {};
    if (wallet) where.agentWallet = wallet;
    if (activeOnly) where.isActive = true;

    const keys = await prisma.accessKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Auto-reset spending period if needed
    const now = new Date();
    const updatedKeys = await Promise.all(
      keys.map(async (key) => {
        if (key.isActive && key.periodResetAt <= now) {
          // Reset spending counter
          const updated = await prisma.accessKey.update({
            where: { id: key.id },
            data: {
              spentThisPeriod: 0,
              periodResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
          return {
            ...updated,
            remainingBudget: updated.spendingLimit,
          };
        }
        return {
          ...key,
          remainingBudget: key.spendingLimit - key.spentThisPeriod,
        };
      })
    );

    return NextResponse.json({
      keys: updatedKeys,
      count: updatedKeys.length,
    });
  } catch (err: any) {
    console.error('[ACCESS_KEY] List error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list access keys' }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// PATCH — Update Access Key
// ────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentWallet, spendingLimit, allowedContracts, validUntil, isActive } = body;

    if (!agentWallet) {
      return NextResponse.json({ error: 'agentWallet required' }, { status: 400 });
    }

    const key = await prisma.accessKey.findUnique({ where: { agentWallet } });
    if (!key) {
      return NextResponse.json({ error: 'Access key not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (spendingLimit !== undefined) updateData.spendingLimit = spendingLimit;
    if (allowedContracts !== undefined) {
      updateData.allowedContracts = Array.isArray(allowedContracts)
        ? allowedContracts.join(',')
        : allowedContracts;
    }
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.accessKey.update({
      where: { agentWallet },
      data: updateData,
    });

    console.log(`[ACCESS_KEY] Updated: ${agentWallet}`, updateData);

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[ACCESS_KEY] Update error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update access key' }, { status: 500 });
  }
}

// ────────────────────────────────────────────
// DELETE — Revoke Access Key
// ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentWallet, reason } = body;

    if (!agentWallet) {
      return NextResponse.json({ error: 'agentWallet required' }, { status: 400 });
    }

    const key = await prisma.accessKey.findUnique({ where: { agentWallet } });
    if (!key) {
      return NextResponse.json({ error: 'Access key not found' }, { status: 404 });
    }

    await prisma.accessKey.update({
      where: { agentWallet },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: reason || 'Manually revoked',
      },
    });

    console.log(`[ACCESS_KEY] Revoked: ${agentWallet} — ${reason || 'Manual'}`);

    return NextResponse.json({ agentWallet, status: 'revoked' });
  } catch (err: any) {
    console.error('[ACCESS_KEY] Revoke error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to revoke access key' }, { status: 500 });
  }
}
