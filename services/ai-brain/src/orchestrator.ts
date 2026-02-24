/**
 * PayPol AI Brain Orchestrator
 *
 * Production orchestrator that:
 * 1. Parses natural language intents using Claude
 * 2. Routes to appropriate agents
 * 3. Manages multi-step workflows
 * 4. Locks/settles NexusV2 escrow per task
 * 5. Tracks state and provides monitoring
 *
 * API:
 *   POST /api/orchestrate    — Main entry: parse + route + execute
 *   POST /api/workflow        — Create multi-step workflow (dry run)
 *   GET  /api/workflow/:id    — Get workflow status
 *   POST /api/settle/:id      — Manual settlement trigger
 *   GET  /api/agents          — Proxy to agents service
 *   GET  /api/stats           — System statistics
 *   GET  /api/requests        — Recent requests
 *   GET  /health              — Health check
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { IntentParser }   from './intent-parser';
import { AgentRouter }    from './agent-router';
import { WorkflowEngine } from './workflow-engine';
import { EscrowManager }  from './escrow-manager';
import { StateTracker }   from './state-tracker';
import { eventBus }       from './event-bus';
import { sseRouter }      from './sse-server';

// ── Initialize Components ────────────────────────────────────

const intentParser   = new IntentParser();
const agentRouter    = new AgentRouter();
const escrowManager  = new EscrowManager();
const workflowEngine = new WorkflowEngine(agentRouter, escrowManager);
const stateTracker   = new StateTracker();

// ── Express Server ───────────────────────────────────────────

const app = express();
const PORT = Number(process.env.ORCHESTRATOR_PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── SSE Live Dashboard Routes ───────────────────────────────
app.use(sseRouter);

// ── GET /health ──────────────────────────────────────────────

app.get('/health', (_req, res) => {
  const stats = stateTracker.getStats();
  res.json({
    status: 'ok',
    service: 'ai-brain-orchestrator',
    version: '2.0.0',
    components: {
      intentParser: 'ready',
      agentRouter: 'ready',
      workflowEngine: 'ready',
      escrowManager: 'ready',
    },
    stats,
    timestamp: Date.now(),
  });
});

// ── POST /api/orchestrate — Main Entry Point ─────────────────

app.post('/api/orchestrate', async (req, res) => {
  const { prompt, callerWallet } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const request = stateTracker.createRequest(prompt, callerWallet || '');

  try {
    // Step 1: Parse intent
    stateTracker.updateStatus(request.id, 'parsing');
    console.log(`\n[orchestrator] 🧠 Parsing: "${prompt.slice(0, 100)}..."`);

    const intent = await intentParser.parse(prompt);
    stateTracker.updateStatus(request.id, 'routing', { intent });

    console.log(`[orchestrator] 📋 Intent: ${intent.action} → [${intent.requiredAgents.join(', ')}]`);
    console.log(`[orchestrator] 📋 Multi-step: ${intent.isMultiStep}, Privacy: ${intent.privacyRequired}`);

    // Step 2: Create workflow
    const workflow = await workflowEngine.createWorkflow(intent, callerWallet || '');
    stateTracker.updateStatus(request.id, 'executing', { workflowId: workflow.id });

    console.log(`[orchestrator] ⚙️ Workflow ${workflow.id}: ${workflow.steps.length} steps`);

    // Step 3: Execute workflow
    const completedWorkflow = await workflowEngine.executeWorkflow(workflow.id);

    // Step 4: Build response
    const isSuccess = completedWorkflow.status === 'settled' || completedWorkflow.status === 'completed';
    stateTracker.updateStatus(
      request.id,
      isSuccess ? 'completed' : 'failed',
      { result: completedWorkflow },
    );

    console.log(`[orchestrator] ${isSuccess ? '✅' : '❌'} Workflow ${workflow.id}: ${completedWorkflow.status}`);

    // ── Emit events for Live Dashboard ──
    for (const step of completedWorkflow.steps) {
      if (step.status === 'completed') {
        const escrowAmount = step.escrow?.amount ? parseFloat(step.escrow.amount) : 0;
        eventBus.emitEvent({
          type: 'agent:job_completed',
          data: {
            agentId: step.agentId,
            jobId: step.result?.jobId,
            workflowId: completedWorkflow.id,
            amount: escrowAmount,
          },
        });
        if (step.escrow?.txHash) {
          eventBus.emitEvent({
            type: 'tx:escrow_created',
            data: {
              txHash: step.escrow.txHash,
              agentId: step.agentId,
              onChainJobId: step.escrow.onChainJobId ? Number(step.escrow.onChainJobId) : undefined,
              amount: escrowAmount,
              explorerUrl: `https://explore.tempo.xyz/tx/${step.escrow.txHash}`,
            },
          });
        }
        if (step.escrow?.status === 'settled') {
          eventBus.emitEvent({
            type: 'tx:escrow_settled',
            data: {
              agentId: step.agentId,
              onChainJobId: step.escrow.onChainJobId ? Number(step.escrow.onChainJobId) : undefined,
              amount: escrowAmount,
              feeAmount: escrowAmount * 0.08,
            },
          });
        }
      }
    }

    // Emit A2A chain event if this is a multi-step workflow
    if (completedWorkflow.steps.length > 1) {
      eventBus.emitEvent({
        type: isSuccess ? 'agent:a2a_chain_completed' : 'agent:job_failed',
        data: {
          workflowId: completedWorkflow.id,
          agentId: completedWorkflow.steps.map(s => s.agentId).join(' → '),
          amount: completedWorkflow.totalCost,
        },
      });
    }

    res.json({
      requestId: request.id,
      status: isSuccess ? 'success' : 'error',
      intent: {
        action: intent.action,
        summary: intent.summary,
        requiredAgents: intent.requiredAgents,
        isMultiStep: intent.isMultiStep,
        privacyRequired: intent.privacyRequired,
        confidence: intent.confidence,
      },
      workflow: {
        id: completedWorkflow.id,
        status: completedWorkflow.status,
        steps: completedWorkflow.steps.map(s => ({
          stepId: s.stepId,
          agentId: s.agentId,
          status: s.status,
          result: s.result?.result,
          error: s.result?.error,
          escrow: s.escrow ? {
            jobId: s.escrow.onChainJobId,
            amount: s.escrow.amount,
            status: s.escrow.status,
          } : null,
        })),
        totalCost: completedWorkflow.totalCost,
        executionTimeMs: Date.now() - completedWorkflow.createdAt,
      },
      // Return the final agent result directly for convenience
      result: completedWorkflow.results[completedWorkflow.results.length - 1]?.result || null,
    });

  } catch (err: any) {
    console.error(`[orchestrator] ❌ Error:`, err.message);
    stateTracker.updateStatus(request.id, 'failed', { error: err.message });

    res.status(500).json({
      requestId: request.id,
      status: 'error',
      error: err.message,
    });
  }
});

// ── POST /api/workflow — Create workflow (dry run) ───────────

app.post('/api/workflow', async (req, res) => {
  const { prompt, callerWallet } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const intent = await intentParser.parse(prompt);
    const workflow = await workflowEngine.createWorkflow(intent, callerWallet || '');

    res.json({
      workflowId: workflow.id,
      intent: {
        action: intent.action,
        summary: intent.summary,
        requiredAgents: intent.requiredAgents,
        isMultiStep: intent.isMultiStep,
        estimatedBudget: intent.estimatedBudget,
      },
      steps: workflow.steps.map(s => ({
        stepId: s.stepId,
        agentId: s.agentId,
        condition: s.condition,
        status: s.status,
      })),
      totalCost: workflow.totalCost,
      status: workflow.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/workflow/:id — Get workflow status ──────────────

app.get('/api/workflow/:id', (req, res) => {
  const workflow = workflowEngine.getWorkflow(req.params.id);
  if (!workflow) {
    return res.status(404).json({ error: `Workflow '${req.params.id}' not found` });
  }

  res.json({
    id: workflow.id,
    status: workflow.status,
    intent: workflow.intent,
    steps: workflow.steps.map(s => ({
      stepId: s.stepId,
      agentId: s.agentId,
      status: s.status,
      result: s.result?.status,
      escrow: s.escrow,
    })),
    createdAt: workflow.createdAt,
    completedAt: workflow.completedAt,
  });
});

// ── POST /api/settle/:id — Manual settlement trigger ─────────

app.post('/api/settle/:id', async (req, res) => {
  const workflow = workflowEngine.getWorkflow(req.params.id);
  if (!workflow) {
    return res.status(404).json({ error: `Workflow '${req.params.id}' not found` });
  }

  const results: any[] = [];
  for (const step of workflow.steps) {
    if (step.escrow && step.escrow.status === 'locked') {
      await escrowManager.settleEscrow(step.escrow);
      results.push({ stepId: step.stepId, escrow: step.escrow });
    }
  }

  res.json({ settled: results.length, results });
});

// ── GET /api/agents — Proxy to agents service ────────────────

app.get('/api/agents', async (_req, res) => {
  try {
    const agents = await agentRouter.listAgents();
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/stats — System statistics ───────────────────────

app.get('/api/stats', (_req, res) => {
  res.json({
    ...stateTracker.getStats(),
    live: eventBus.getStats(),
  });
});

// ── POST /api/events — Ingest events from external services ──

app.post('/api/events', (req, res) => {
  const { type, data } = req.body;
  if (!type) return res.status(400).json({ error: 'Event type required' });
  const event = eventBus.emitEvent({ type, data: data || {} });
  res.json({ success: true, eventId: event.id });
});

// ── GET /api/live/tvl — Real on-chain TVL from Tempo ─────────

app.get('/api/live/tvl', async (_req, res) => {
  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider('https://rpc.moderato.tempo.xyz', {
      name: 'tempo-moderato', chainId: 42431,
    });
    const alphaUSD = '0x20c0000000000000000000000000000000000001';
    const erc20ABI = ['function balanceOf(address) view returns (uint256)'];
    const token = new ethers.Contract(alphaUSD, erc20ABI, provider);

    const [escrowBal, shieldBal, multisendBal] = await Promise.all([
      token.balanceOf('0x6A467Cd4156093bB528e448C04366586a1052Fab'),  // NexusV2
      token.balanceOf('0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055'),  // ShieldVaultV2
      token.balanceOf('0x25f4d3f12C579002681a52821F3a6251c46D4575'),  // MultisendVaultV2
    ]);

    const format = (val: bigint) => Number(ethers.formatUnits(val, 6));

    const tvl = {
      escrow: format(escrowBal),
      shield: format(shieldBal),
      multisend: format(multisendBal),
      total: format(escrowBal + shieldBal + multisendBal),
      token: 'AlphaUSD',
      timestamp: Date.now(),
    };

    // Emit TVL update event
    eventBus.emitEvent({
      type: 'tvl:updated',
      data: { amount: tvl.total, token: 'AlphaUSD' },
    });

    res.json(tvl);
  } catch (err: any) {
    res.status(500).json({ error: `TVL fetch failed: ${err.message}` });
  }
});

// ── GET /api/requests — Recent requests ──────────────────────

app.get('/api/requests', (req, res) => {
  const limit = Number(req.query.limit) || 20;
  res.json(stateTracker.getRecentRequests(limit));
});

// ── Legacy Routes (backward compatibility) ───────────────────
// Keep old /api/hire and /api/work routes so existing integrations don't break

app.post('/api/hire', async (req, res) => {
  // Map to new orchestrate endpoint
  const result = await new Promise<any>((resolve) => {
    const mockReq = { body: { prompt: 'Hire agents for a development task', callerWallet: '' } };
    const mockRes = { json: resolve, status: () => ({ json: resolve }) };
    // @ts-ignore
    app.handle({ ...req, url: '/api/orchestrate', method: 'POST', body: mockReq.body }, mockRes as any);
  }).catch(() => ({
    success: true,
    devAddress: '0x' + '0'.repeat(40),
    auditAddress: '0x' + '0'.repeat(40),
  }));

  res.json(result);
});

app.post('/api/work', async (_req, res) => {
  res.json({
    success: true,
    status: 'APPROVED',
    signature: '0x' + 'a'.repeat(130),
    message: 'Orchestrator v2 — use /api/orchestrate for full workflow execution.',
  });
});

// ── Start Server ─────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  PayPol AI Brain Orchestrator v2.0.0          ║`);
  console.log(`║  Port: ${PORT}                                  ║`);
  console.log(`║  Agents Service: ${process.env.AGENTS_SERVICE_URL || 'http://localhost:3001'}  ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
  console.log(`[orchestrator] Components: IntentParser, AgentRouter, WorkflowEngine, EscrowManager, StateTracker, EventBus, SSE`);
  console.log(`[orchestrator] Routes: /api/orchestrate, /api/workflow, /api/agents, /api/stats, /api/live/stream, /api/live/tvl, /health`);
});
