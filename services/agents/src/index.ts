/**
 * PayPol Native Agents Service
 *
 * Express HTTP server exposing 32 built-in PayPol agents - ALL with real
 * on-chain execution on Tempo L1 (Chain 42431). No fake/AI-only agents.
 *
 * CORE AGENTS (Original 7):
 *   - escrow-manager        → NexusV2 escrow lifecycle (create/settle/refund)
 *   - shield-executor       → ZK-SNARK shielded payments via ShieldVault
 *   - payroll-planner       → Batch payroll via MultisendVault
 *   - token-deployer        → ERC-20 token deployment on Tempo
 *   - contract-deploy-pro   → Production smart contract deployment
 *   - coordinator-agent     → A2A (Agent-to-Agent) orchestration
 *   - tempo-benchmark       → Gas cost benchmarking (Tempo vs Ethereum)
 *
 * ON-CHAIN AGENTS WAVE 1 (10):
 *   - token-transfer        → Direct ERC20 token transfers
 *   - stream-creator        → Create milestone payment streams (StreamV1)
 *   - stream-manager        → Manage stream lifecycle (submit/approve/reject)
 *   - vault-depositor       → ShieldVaultV2 deposits & public payouts
 *   - multisend-batch       → Batch payments via MultisendVaultV2
 *   - proof-verifier        → AI proof commitment & verification (AIProofRegistry)
 *   - allowance-manager     → ERC20 approval management for all contracts
 *   - balance-scanner       → On-chain portfolio analysis across all tokens
 *   - fee-collector         → Platform fee withdrawal from contracts
 *   - escrow-lifecycle      → NexusV2 job progression (start/complete/rate)
 *
 * ON-CHAIN AGENTS WAVE 2 (15):
 *   - multi-token-sender    → Send multiple token types to one recipient
 *   - escrow-dispute        → NexusV2 dispute resolution & timeout claims
 *   - stream-inspector      → Deep on-chain stream & milestone analysis
 *   - treasury-manager      → All-in-one treasury overview & analytics
 *   - bulk-escrow           → Batch-create multiple NexusV2 escrow jobs
 *   - multi-token-batch     → MultisendV2 with any token (not just default)
 *   - proof-auditor         → AIProofRegistry deep audit & accountability
 *   - vault-inspector       → ShieldVaultV2 state & commitment inspection
 *   - gas-profiler          → Per-operation gas cost profiling on Tempo L1
 *   - recurring-payment     → Multiple streams for recurring scheduled payments
 *   - contract-reader       → Read all PayPol contract states comprehensively
 *   - wallet-sweeper        → Emergency token sweep to safe wallet
 *   - escrow-batch-settler  → Batch settle/refund multiple NexusV2 escrows
 *   - token-minter          → Deploy custom ERC20 with fine-grained control
 *   - chain-monitor         → Tempo L1 chain health & activity monitoring
 *
 * Routes:
 *   GET  /agents                       → list all agent manifests
 *   GET  /agents/:id                   → single agent manifest
 *   POST /agents/:id/execute           → execute a job
 *   POST /agents/:id/a2a-execute       → A2A sub-task execution
 *   GET  /health                       → service health check
 */

import express from 'express';
import cors    from 'cors';
import 'dotenv/config';

// Core Agents (original 7 - all real on-chain)
import * as escrowManager      from './agents/escrow-manager';
import * as shieldExecutor     from './agents/shield-executor';
import * as payrollPlanner     from './agents/payroll-planner';
import * as tokenDeployer      from './agents/token-deployer';
import * as contractDeployPro  from './agents/contract-deploy-pro';
import * as coordinatorAgent   from './agents/coordinator-agent';
import * as tempoBenchmark     from './agents/tempo-benchmark';

// On-Chain Agents Wave 1 (10 - all real on-chain)
import * as tokenTransfer      from './agents/token-transfer';
import * as streamCreator      from './agents/stream-creator';
import * as streamManager      from './agents/stream-manager';
import * as vaultDepositor     from './agents/vault-depositor';
import * as multisendBatch     from './agents/multisend-batch';
import * as proofVerifier      from './agents/proof-verifier';
import * as allowanceManager   from './agents/allowance-manager';
import * as balanceScanner     from './agents/balance-scanner';
import * as feeCollector       from './agents/fee-collector';
import * as escrowLifecycle    from './agents/escrow-lifecycle';

// On-Chain Agents Wave 2 (15 - all real on-chain)
import * as multiTokenSender   from './agents/multi-token-sender';
import * as escrowDispute      from './agents/escrow-dispute';
import * as streamInspector    from './agents/stream-inspector';
import * as treasuryManager    from './agents/treasury-manager';
import * as bulkEscrow         from './agents/bulk-escrow';
import * as multiTokenBatch    from './agents/multi-token-batch';
import * as proofAuditor       from './agents/proof-auditor';
import * as vaultInspector     from './agents/vault-inspector';
import * as gasProfiler        from './agents/gas-profiler';
import * as recurringPayment   from './agents/recurring-payment';
import * as contractReader     from './agents/contract-reader';
import * as walletSweeper      from './agents/wallet-sweeper';
import * as escrowBatchSettler from './agents/escrow-batch-settler';
import * as tokenMinter        from './agents/token-minter';
import * as chainMonitor       from './agents/chain-monitor';

import { AgentDescriptor, AgentHandler, JobRequest, A2AJobRequest } from './types';

// ── Registry ──────────────────────────────────────────────

const registry = new Map<string, { manifest: AgentDescriptor; handler: AgentHandler }>([
  // Core Agents
  [escrowManager.manifest.id,     { manifest: escrowManager.manifest,     handler: escrowManager.handler     }],
  [shieldExecutor.manifest.id,    { manifest: shieldExecutor.manifest,    handler: shieldExecutor.handler    }],
  [payrollPlanner.manifest.id,    { manifest: payrollPlanner.manifest,    handler: payrollPlanner.handler    }],
  [tokenDeployer.manifest.id,     { manifest: tokenDeployer.manifest,     handler: tokenDeployer.handler     }],
  [contractDeployPro.manifest.id, { manifest: contractDeployPro.manifest, handler: contractDeployPro.handler }],
  [coordinatorAgent.manifest.id,  { manifest: coordinatorAgent.manifest,  handler: coordinatorAgent.handler  }],
  [tempoBenchmark.manifest.id,    { manifest: tempoBenchmark.manifest,    handler: tempoBenchmark.handler    }],
  // On-Chain Agents Wave 1
  [tokenTransfer.manifest.id,     { manifest: tokenTransfer.manifest,     handler: tokenTransfer.handler     }],
  [streamCreator.manifest.id,     { manifest: streamCreator.manifest,     handler: streamCreator.handler     }],
  [streamManager.manifest.id,     { manifest: streamManager.manifest,     handler: streamManager.handler     }],
  [vaultDepositor.manifest.id,    { manifest: vaultDepositor.manifest,    handler: vaultDepositor.handler    }],
  [multisendBatch.manifest.id,    { manifest: multisendBatch.manifest,    handler: multisendBatch.handler    }],
  [proofVerifier.manifest.id,     { manifest: proofVerifier.manifest,     handler: proofVerifier.handler     }],
  [allowanceManager.manifest.id,  { manifest: allowanceManager.manifest,  handler: allowanceManager.handler  }],
  [balanceScanner.manifest.id,    { manifest: balanceScanner.manifest,    handler: balanceScanner.handler    }],
  [feeCollector.manifest.id,      { manifest: feeCollector.manifest,      handler: feeCollector.handler      }],
  [escrowLifecycle.manifest.id,   { manifest: escrowLifecycle.manifest,   handler: escrowLifecycle.handler   }],
  // On-Chain Agents Wave 2
  [multiTokenSender.manifest.id,  { manifest: multiTokenSender.manifest,  handler: multiTokenSender.handler  }],
  [escrowDispute.manifest.id,     { manifest: escrowDispute.manifest,     handler: escrowDispute.handler     }],
  [streamInspector.manifest.id,   { manifest: streamInspector.manifest,   handler: streamInspector.handler   }],
  [treasuryManager.manifest.id,   { manifest: treasuryManager.manifest,   handler: treasuryManager.handler   }],
  [bulkEscrow.manifest.id,        { manifest: bulkEscrow.manifest,        handler: bulkEscrow.handler        }],
  [multiTokenBatch.manifest.id,   { manifest: multiTokenBatch.manifest,   handler: multiTokenBatch.handler   }],
  [proofAuditor.manifest.id,      { manifest: proofAuditor.manifest,      handler: proofAuditor.handler      }],
  [vaultInspector.manifest.id,    { manifest: vaultInspector.manifest,    handler: vaultInspector.handler    }],
  [gasProfiler.manifest.id,       { manifest: gasProfiler.manifest,       handler: gasProfiler.handler       }],
  [recurringPayment.manifest.id,  { manifest: recurringPayment.manifest,  handler: recurringPayment.handler  }],
  [contractReader.manifest.id,    { manifest: contractReader.manifest,    handler: contractReader.handler    }],
  [walletSweeper.manifest.id,     { manifest: walletSweeper.manifest,     handler: walletSweeper.handler     }],
  [escrowBatchSettler.manifest.id,{ manifest: escrowBatchSettler.manifest, handler: escrowBatchSettler.handler}],
  [tokenMinter.manifest.id,       { manifest: tokenMinter.manifest,       handler: tokenMinter.handler       }],
  [chainMonitor.manifest.id,      { manifest: chainMonitor.manifest,      handler: chainMonitor.handler      }],
]);

// ── Server ────────────────────────────────────────────────

const app  = express();
const PORT = Number(process.env.AGENT_SERVICE_PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// GET /health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', agents: registry.size, timestamp: Date.now() });
});

// GET /agents - list all manifests
app.get('/agents', (_req, res) => {
  res.json([...registry.values()].map(e => e.manifest));
});

// GET /agents/:id - single manifest
app.get('/agents/:id', (req, res) => {
  const entry = registry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
  res.json(entry.manifest);
});

// POST /agents/:id/execute - run a job
app.post('/agents/:id/execute', async (req, res) => {
  const entry = registry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });

  const job: JobRequest = {
    jobId:        req.body.jobId        ?? crypto.randomUUID(),
    agentId:      req.params.id,
    prompt:       req.body.prompt       ?? '',
    payload:      req.body.payload,
    callerWallet: req.body.callerWallet ?? '',
    timestamp:    Date.now(),
  };

  try {
    const result = await entry.handler(job);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      jobId:           job.jobId,
      agentId:         req.params.id,
      status:          'error',
      error:           err.message ?? String(err),
      executionTimeMs: 0,
      timestamp:       Date.now(),
    });
  }
});

// POST /agents/:id/a2a-execute - A2A sub-task execution with parent tracking
app.post('/agents/:id/a2a-execute', async (req, res) => {
  const entry = registry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });

  const a2aJob: A2AJobRequest = {
    jobId:            req.body.jobId        ?? crypto.randomUUID(),
    agentId:          req.params.id,
    prompt:           req.body.prompt       ?? '',
    payload:          req.body.payload,
    callerWallet:     req.body.callerWallet ?? '',
    timestamp:        Date.now(),
    parentJobId:      req.body.parentJobId,
    parentAgentId:    req.body.parentAgentId,
    a2aChainId:       req.body.a2aChainId   ?? `chain-${Date.now()}`,
    depth:            req.body.depth         ?? 0,
    budgetAllocation: req.body.budgetAllocation ?? 0,
  };

  console.log(`[agents] A2A execute: ${req.params.id} (parent: ${a2aJob.parentAgentId}, chain: ${a2aJob.a2aChainId}, depth: ${a2aJob.depth})`);

  try {
    const result = await entry.handler(a2aJob);
    res.json({
      ...result,
      _a2a: {
        parentJobId: a2aJob.parentJobId,
        parentAgentId: a2aJob.parentAgentId,
        a2aChainId: a2aJob.a2aChainId,
        depth: a2aJob.depth,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      jobId:           a2aJob.jobId,
      agentId:         req.params.id,
      status:          'error',
      error:           err.message ?? String(err),
      executionTimeMs: 0,
      timestamp:       Date.now(),
      _a2a: {
        parentJobId: a2aJob.parentJobId,
        parentAgentId: a2aJob.parentAgentId,
        a2aChainId: a2aJob.a2aChainId,
        depth: a2aJob.depth,
      },
    });
  }
});

// ── Start ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[agents] Service running on port ${PORT}`);
  console.log(`[agents] ${registry.size} on-chain agents: ${[...registry.keys()].join(', ')}`);
});
