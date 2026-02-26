import { NextRequest } from 'next/server';

// SSE endpoint for live protocol activity
// Sends real-time events to the Live Dashboard (Nerve Center)

const HEARTBEAT_INTERVAL = 10_000; // 10s heartbeat
const EVENT_INTERVAL = 3_000; // Simulate events every 3s

// Track active connections for heartbeat
let connectionCount = 0;

// Demo agent data for realistic live feed
const DEMO_AGENTS = [
  'stream-inspector', 'code-auditor', 'yield-optimizer', 'defi-analyst',
  'nft-valuator', 'security-scanner', 'gas-optimizer', 'bridge-monitor',
  'whale-tracker', 'mev-detector', 'token-deployer', 'dao-governor'
];

const EVENT_TYPES = [
  'tx:escrow_created', 'tx:escrow_settled', 'tx:escrow_refunded',
  'tx:shield_deposit', 'tx:shield_payout', 'tx:multisend_batch',
  'tx:token_deployed', 'tx:contract_deployed',
  'agent:job_started', 'agent:job_completed', 'agent:job_failed',
  'agent:a2a_chain_started', 'agent:a2a_chain_completed',
];

function randomHex(len: number) {
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * 16)];
  return result;
}

function generateEvent(): any {
  const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
  const agent = DEMO_AGENTS[Math.floor(Math.random() * DEMO_AGENTS.length)];
  const amount = (Math.random() * 500 + 1).toFixed(2);
  const txHash = randomHex(64);

  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: Date.now(),
    data: {
      agentId: type.startsWith('agent:') ? agent : undefined,
      txHash,
      amount: type.includes('escrow') || type.includes('shield') || type.includes('multisend') ? amount : undefined,
      explorerUrl: `https://explore.tempo.xyz/tx/${txHash}`,
      workflowId: type.includes('a2a') ? `wf_${Math.random().toString(36).slice(2, 10)}` : undefined,
    },
  };
}

// Cumulative stats for the session
const sessionStats = {
  totalTxs: Math.floor(Math.random() * 200) + 50,
  totalEscrowCreated: Math.floor(Math.random() * 40) + 10,
  totalEscrowSettled: Math.floor(Math.random() * 30) + 5,
  totalShieldPayouts: Math.floor(Math.random() * 20) + 5,
  totalMultisendBatches: Math.floor(Math.random() * 15) + 3,
  totalAgentJobs: Math.floor(Math.random() * 100) + 20,
  totalA2AChains: Math.floor(Math.random() * 10) + 2,
  totalZKProofs: Math.floor(Math.random() * 50) + 10,
  totalFeesCollected: parseFloat((Math.random() * 200 + 50).toFixed(2)),
  totalTokensDeployed: Math.floor(Math.random() * 5) + 1,
};

export async function GET(request: NextRequest) {
  connectionCount++;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      const initData = {
        type: 'init',
        stats: { ...sessionStats },
        recentEvents: Array.from({ length: 10 }, () => generateEvent()),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initData)}\n\n`));

      // Send protocol events periodically
      const eventTimer = setInterval(() => {
        try {
          const event = generateEvent();

          // Update session stats
          if (event.type.startsWith('tx:')) sessionStats.totalTxs++;
          if (event.type === 'tx:escrow_created') sessionStats.totalEscrowCreated++;
          if (event.type === 'tx:escrow_settled') {
            sessionStats.totalEscrowSettled++;
            sessionStats.totalFeesCollected += parseFloat(event.data.amount || '0') * 0.08;
          }
          if (event.type === 'agent:job_completed') sessionStats.totalAgentJobs++;
          if (event.type === 'agent:a2a_chain_completed') sessionStats.totalA2AChains++;

          controller.enqueue(encoder.encode(`event: protocol-event\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          clearInterval(eventTimer);
        }
      }, EVENT_INTERVAL);

      // Send heartbeat
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ connections: connectionCount, timestamp: Date.now() })}\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_INTERVAL);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        connectionCount = Math.max(0, connectionCount - 1);
        clearInterval(eventTimer);
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
