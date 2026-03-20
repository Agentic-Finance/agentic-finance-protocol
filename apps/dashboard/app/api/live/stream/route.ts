import { NextRequest } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ethers } from 'ethers';
import { RPC_URL, ERC20_ABI, AGTFI_NEXUS_V2_ADDRESS, AGTFI_SHIELD_V2_ADDRESS, AGTFI_MULTISEND_V2_ADDRESS } from '@/app/lib/constants';

// SSE endpoint for live protocol activity
// Sends real-time events from the database to the Live Dashboard

const HEARTBEAT_INTERVAL = 10_000; // 10s heartbeat
const POLL_INTERVAL = 5_000; // Poll DB every 5s

let connectionCount = 0;

const TOKEN_ADDRESS = '0x20c0000000000000000000000000000000000001';
const TOKEN_DECIMALS = 6;

// ── Event Type Mapping ─────────────────────────────────────────

function mapEventType(dbType: string): string {
  if (dbType.includes('ESCROW_LOCKED') || dbType.includes('ESCROW_CREATED')) return 'tx:escrow_created';
  if (dbType.includes('ESCROW_SETTLED') || dbType.includes('ESCROW_RELEASED')) return 'tx:escrow_settled';
  if (dbType.includes('ESCROW_REFUND')) return 'tx:escrow_refunded';
  if (dbType.includes('SHIELD') || dbType.includes('ZK')) return 'tx:shield_deposit';
  if (dbType.includes('MULTISEND') || dbType.includes('BATCH')) return 'tx:multisend_batch';
  if (dbType.includes('A2A')) return 'agent:a2a_chain_completed';
  if (dbType.includes('SWARM_COMPLETED') || dbType.includes('JOB_COMPLETED')) return 'agent:job_completed';
  if (dbType.includes('SWARM_CREATED') || dbType.includes('JOB_STARTED')) return 'agent:job_started';
  if (dbType.includes('MILESTONE')) return 'tx:stream_milestone';
  if (dbType.includes('SENTINEL')) return 'agent:sentinel_action';
  return 'tx:protocol_event';
}

// ── Map AuditEvent to ProtocolEvent format ─────────────────────

function mapAuditToProtocolEvent(event: any) {
  const metadata = (event.metadata && typeof event.metadata === 'object') ? event.metadata as Record<string, any> : {};
  return {
    id: event.id,
    type: mapEventType(event.eventType),
    timestamp: event.createdAt.getTime(),
    data: {
      agentId: event.agentId || event.agentName || undefined,
      txHash: event.txHash || undefined,
      amount: metadata.amount || undefined,
      explorerUrl: event.txHash ? `https://explore.moderato.tempo.xyz/tx/${event.txHash}` : undefined,
      title: event.title || undefined,
      severity: event.severity || undefined,
    },
  };
}

// ── Fetch TVL from on-chain (optional, returns 0 on failure) ───

async function fetchTVL(): Promise<{ escrow: number; shield: number; multisend: number; total: number }> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

    const [escrowRaw, shieldRaw, multisendRaw] = await Promise.all([
      token.balanceOf(AGTFI_NEXUS_V2_ADDRESS).catch(() => BigInt(0)),
      token.balanceOf(AGTFI_SHIELD_V2_ADDRESS).catch(() => BigInt(0)),
      token.balanceOf(AGTFI_MULTISEND_V2_ADDRESS).catch(() => BigInt(0)),
    ]);

    const escrow = Number(escrowRaw) / 10 ** TOKEN_DECIMALS;
    const shield = Number(shieldRaw) / 10 ** TOKEN_DECIMALS;
    const multisend = Number(multisendRaw) / 10 ** TOKEN_DECIMALS;

    return { escrow, shield, multisend, total: escrow + shield + multisend };
  } catch {
    return { escrow: 0, shield: 0, multisend: 0, total: 0 };
  }
}

// ── GET Handler ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  connectionCount++;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // ── 1. Send initial data ─────────────────────────────────
      try {
        const [recentEvents, totalTxs, totalAgentJobs, totalEscrowCreated, totalA2AChains, tvl] = await Promise.all([
          prisma.auditEvent.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.auditEvent.count(),
          prisma.agentJob.count({ where: { status: 'COMPLETED' } }),
          prisma.auditEvent.count({ where: { eventType: { contains: 'ESCROW' } } }),
          prisma.agentJob.count({ where: { a2aChainId: { not: null }, depth: 0 } }),
          fetchTVL(),
        ]);

        const mappedEvents = recentEvents.map(mapAuditToProtocolEvent);

        const initData = {
          type: 'init',
          stats: {
            totalTxs,
            totalAgentJobs,
            totalEscrowCreated,
            totalEscrowSettled: 0,
            totalShieldPayouts: 0,
            totalMultisendBatches: 0,
            totalA2AChains,
            totalZKProofs: 0,
            totalFeesCollected: 0,
            totalTokensDeployed: 0,
          },
          tvl,
          recentEvents: mappedEvents,
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initData)}\n\n`));
      } catch (err) {
        // If DB fails, send empty init so the client still connects
        const fallbackInit = {
          type: 'init',
          stats: {
            totalTxs: 0, totalAgentJobs: 0, totalEscrowCreated: 0,
            totalEscrowSettled: 0, totalShieldPayouts: 0, totalMultisendBatches: 0,
            totalA2AChains: 0, totalZKProofs: 0, totalFeesCollected: 0, totalTokensDeployed: 0,
          },
          tvl: { escrow: 0, shield: 0, multisend: 0, total: 0 },
          recentEvents: [],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackInit)}\n\n`));
      }

      // ── 2. Poll for new events every 5s ──────────────────────
      let lastCheckTime = new Date();

      const pollTimer = setInterval(async () => {
        try {
          const newEvents = await prisma.auditEvent.findMany({
            where: { createdAt: { gt: lastCheckTime } },
            orderBy: { createdAt: 'asc' },
            take: 20,
          });

          if (newEvents.length > 0) {
            lastCheckTime = newEvents[newEvents.length - 1].createdAt;
            for (const event of newEvents) {
              const mapped = mapAuditToProtocolEvent(event);
              controller.enqueue(encoder.encode(`event: protocol-event\ndata: ${JSON.stringify(mapped)}\n\n`));
            }
          }
        } catch {
          // Silently ignore poll errors — next poll will retry
        }
      }, POLL_INTERVAL);

      // ── 3. Heartbeat every 10s ───────────────────────────────
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ connections: connectionCount, timestamp: Date.now() })}\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_INTERVAL);

      // ── 4. Cleanup on disconnect ─────────────────────────────
      request.signal.addEventListener('abort', () => {
        connectionCount = Math.max(0, connectionCount - 1);
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
