/**
 * Community Agent Self-Registration Endpoint
 *
 * POST /api/marketplace/register
 *
 * Called by the Agentic Finance SDK's registerAgent() function.
 * Validates the agent's webhook, creates a MarketplaceAgent record,
 * and returns the marketplace ID for tracking.
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { notify } from '@/app/lib/notify';
import { validateApiKey, getClientId } from '@/app/lib/api-auth';
import { writeLimiter } from '@/app/lib/rate-limit';

export async function POST(req: Request) {
  try {
    // Rate limit by client
    const clientId = getClientId(req);
    const limit = writeLimiter.check(clientId);
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((limit.resetAt - Date.now()) / 1000).toString() } },
      );
    }

    // Validate API key if provided (optional for register, but tracks usage)
    const auth = await validateApiKey(req);
    if (!auth.valid && auth.response) return auth.response;

    const body = await req.json();
    const {
      id,
      name,
      description,
      category,
      version,
      price,
      capabilities,
      webhookUrl,
      ownerWallet,
      avatarEmoji,
      githubHandle,
      author,
    } = body;

    // ── Validate required fields ──
    if (!id || !name || !description || !category || !webhookUrl || !ownerWallet) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, description, category, webhookUrl, ownerWallet' },
        { status: 400 },
      );
    }

    // Validate agent ID format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Agent ID must be lowercase alphanumeric with hyphens' },
        { status: 400 },
      );
    }

    // Validate wallet format
    if (!ownerWallet.startsWith('0x') || ownerWallet.length !== 42) {
      return NextResponse.json(
        { success: false, error: 'ownerWallet must be a valid 42-character hex address' },
        { status: 400 },
      );
    }

    // ── Validate webhook is reachable ──
    let webhookOk = false;
    try {
      // Extract base URL (protocol + host + port) for health check
      const parsedUrl = new URL(webhookUrl);
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const healthRes = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const healthData = await healthRes.json();
      webhookOk = healthData?.status === 'ok';
    } catch {
      // Webhook not reachable - warn but still allow registration
      console.warn(`[register] Webhook not reachable: ${webhookUrl}`);
    }

    // ── Check for duplicate agent name ──
    const existing = await prisma.marketplaceAgent.findFirst({
      where: {
        OR: [
          { name: name },
          { nativeAgentId: id },
        ],
      },
    });

    if (existing) {
      // Update existing agent instead of creating duplicate
      const updated = await prisma.marketplaceAgent.update({
        where: { id: existing.id },
        data: {
          description,
          category,
          skills: JSON.stringify(capabilities ?? []),
          basePrice: price ?? 5,
          webhookUrl,
          ownerWallet,
          avatarEmoji: avatarEmoji ?? '🤖',
          githubHandle: githubHandle ?? null,
          source: 'community',
          sourceUrl: githubHandle ? `https://github.com/${githubHandle}` : null,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        agentId: id,
        marketplaceId: updated.id,
        message: `Agent "${name}" updated on marketplace (webhook ${webhookOk ? 'reachable' : 'not reachable'})`,
      });
    }

    // ── Create new marketplace agent ──
    const agent = await prisma.marketplaceAgent.create({
      data: {
        name,
        description,
        category,
        skills: JSON.stringify(capabilities ?? []),
        basePrice: price ?? 5,
        webhookUrl,
        nativeAgentId: null, // Community agents use webhookUrl, not nativeAgentId
        ownerWallet,
        avatarEmoji: avatarEmoji ?? '🤖',
        isVerified: false,
        isActive: true,
        source: 'community',
        sourceUrl: githubHandle ? `https://github.com/${githubHandle}` : null,
        githubHandle: githubHandle ?? null,
      },
    });

    console.log(`[register] New community agent: ${name} (${id}) by ${githubHandle ?? 'unknown'} - webhook: ${webhookUrl}`);

    // Notify agent owner about registration
    notify({
      wallet: ownerWallet,
      type: 'agent:registered',
      title: 'Agent Registered',
      message: `${name} is now live on Agentic Finance Marketplace`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      agentId: id,
      marketplaceId: agent.id,
      message: `Agent "${name}" registered on marketplace (webhook ${webhookOk ? 'reachable' : 'not reachable'})`,
    });

  } catch (error: any) {
    console.error('[register] Error:', error);
    return NextResponse.json(
      { success: false, error: `Registration failed: ${error.message}` },
      { status: 500 },
    );
  }
}
