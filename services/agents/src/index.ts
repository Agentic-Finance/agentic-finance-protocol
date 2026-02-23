/**
 * PayPol Native Agents Service
 *
 * Express HTTP server exposing 24 built-in PayPol agents across 10 categories:
 *
 * WAVE 1 (Original 10):
 *   - contract-auditor    → Solidity security analysis
 *   - yield-optimizer     → DeFi APY strategy
 *   - payroll-planner     → Batch payroll optimization
 *   - gas-predictor       → Gas timing recommendation
 *   - arbitrage-scanner   → Cross-DEX arbitrage detection
 *   - compliance-advisor  → Crypto regulatory compliance
 *   - nft-forensics       → NFT wash trading & provenance
 *   - bridge-analyzer     → Cross-chain bridge security
 *   - dao-advisor         → DAO governance analysis
 *   - risk-analyzer       → DeFi portfolio risk scoring
 *
 * WAVE 2 (14 Practical Agents):
 *   - crypto-tax-navigator  → Crypto tax classification & reporting
 *   - portfolio-rebalancer  → Portfolio allocation & rebalancing
 *   - token-deployer        → ERC-20/721 token deployment
 *   - airdrop-tracker       → Airdrop eligibility & farming
 *   - mev-sentinel          → MEV protection & private tx
 *   - liquidity-manager     → Uniswap V3 LP management
 *   - whale-tracker         → Whale movement intelligence
 *   - social-radar          → Social sentiment analysis
 *   - omnibridge-router     → Cross-chain bridge routing
 *   - nft-appraiser         → NFT valuation & rarity
 *   - proposal-writer       → DAO governance proposals
 *   - vesting-planner       → Token vesting schedules
 *   - defi-insurance        → DeFi insurance coverage
 *   - contract-deploy-pro   → Production contract deployment
 *
 * Routes:
 *   GET  /agents                       → list all agent manifests
 *   GET  /agents/:id                   → single agent manifest
 *   POST /agents/:id/execute           → execute a job
 *   GET  /health                       → service health check
 */

import express from 'express';
import cors    from 'cors';
import 'dotenv/config';

// Wave 1: Original 10 agents
import * as contractAuditor  from './agents/contract-auditor';
import * as yieldOptimizer   from './agents/yield-optimizer';
import * as payrollPlanner   from './agents/payroll-planner';
import * as gasPredictor     from './agents/gas-predictor';
import * as arbitrageScanner from './agents/arbitrage-scanner';
import * as complianceAdvisor from './agents/compliance-advisor';
import * as nftForensics     from './agents/nft-forensics';
import * as bridgeAnalyzer   from './agents/bridge-analyzer';
import * as daoAdvisor       from './agents/dao-advisor';
import * as riskAnalyzer     from './agents/risk-analyzer';

// Wave 2: 14 Practical Crypto Agents
import * as cryptoTaxNavigator from './agents/crypto-tax-navigator';
import * as portfolioRebalancer from './agents/portfolio-rebalancer';
import * as tokenDeployer      from './agents/token-deployer';
import * as airdropTracker     from './agents/airdrop-tracker';
import * as mevSentinel        from './agents/mev-sentinel';
import * as liquidityManager   from './agents/liquidity-manager';
import * as whaleTracker       from './agents/whale-tracker';
import * as socialRadar        from './agents/social-radar';
import * as omnibridgeRouter   from './agents/omnibridge-router';
import * as nftAppraiser       from './agents/nft-appraiser';
import * as proposalWriter     from './agents/proposal-writer';
import * as vestingPlanner     from './agents/vesting-planner';
import * as defiInsurance      from './agents/defi-insurance';
import * as contractDeployPro  from './agents/contract-deploy-pro';

import { AgentDescriptor, AgentHandler, JobRequest } from './types';

// ── Registry ──────────────────────────────────────────────

const registry = new Map<string, { manifest: AgentDescriptor; handler: AgentHandler }>([
  // Wave 1
  [contractAuditor.manifest.id,  { manifest: contractAuditor.manifest,  handler: contractAuditor.handler  }],
  [yieldOptimizer.manifest.id,   { manifest: yieldOptimizer.manifest,   handler: yieldOptimizer.handler   }],
  [payrollPlanner.manifest.id,   { manifest: payrollPlanner.manifest,   handler: payrollPlanner.handler   }],
  [gasPredictor.manifest.id,     { manifest: gasPredictor.manifest,     handler: gasPredictor.handler     }],
  [arbitrageScanner.manifest.id, { manifest: arbitrageScanner.manifest, handler: arbitrageScanner.handler }],
  [complianceAdvisor.manifest.id,{ manifest: complianceAdvisor.manifest,handler: complianceAdvisor.handler}],
  [nftForensics.manifest.id,     { manifest: nftForensics.manifest,     handler: nftForensics.handler     }],
  [bridgeAnalyzer.manifest.id,   { manifest: bridgeAnalyzer.manifest,   handler: bridgeAnalyzer.handler   }],
  [daoAdvisor.manifest.id,       { manifest: daoAdvisor.manifest,       handler: daoAdvisor.handler       }],
  [riskAnalyzer.manifest.id,     { manifest: riskAnalyzer.manifest,     handler: riskAnalyzer.handler     }],
  // Wave 2
  [cryptoTaxNavigator.manifest.id, { manifest: cryptoTaxNavigator.manifest, handler: cryptoTaxNavigator.handler }],
  [portfolioRebalancer.manifest.id,{ manifest: portfolioRebalancer.manifest,handler: portfolioRebalancer.handler}],
  [tokenDeployer.manifest.id,      { manifest: tokenDeployer.manifest,      handler: tokenDeployer.handler      }],
  [airdropTracker.manifest.id,     { manifest: airdropTracker.manifest,     handler: airdropTracker.handler     }],
  [mevSentinel.manifest.id,        { manifest: mevSentinel.manifest,        handler: mevSentinel.handler        }],
  [liquidityManager.manifest.id,   { manifest: liquidityManager.manifest,   handler: liquidityManager.handler   }],
  [whaleTracker.manifest.id,       { manifest: whaleTracker.manifest,       handler: whaleTracker.handler       }],
  [socialRadar.manifest.id,        { manifest: socialRadar.manifest,        handler: socialRadar.handler        }],
  [omnibridgeRouter.manifest.id,   { manifest: omnibridgeRouter.manifest,   handler: omnibridgeRouter.handler   }],
  [nftAppraiser.manifest.id,       { manifest: nftAppraiser.manifest,       handler: nftAppraiser.handler       }],
  [proposalWriter.manifest.id,     { manifest: proposalWriter.manifest,     handler: proposalWriter.handler     }],
  [vestingPlanner.manifest.id,     { manifest: vestingPlanner.manifest,     handler: vestingPlanner.handler     }],
  [defiInsurance.manifest.id,      { manifest: defiInsurance.manifest,      handler: defiInsurance.handler      }],
  [contractDeployPro.manifest.id,  { manifest: contractDeployPro.manifest,  handler: contractDeployPro.handler  }],
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

// GET /agents — list all manifests
app.get('/agents', (_req, res) => {
  res.json([...registry.values()].map(e => e.manifest));
});

// GET /agents/:id — single manifest
app.get('/agents/:id', (req, res) => {
  const entry = registry.get(req.params.id);
  if (!entry) return res.status(404).json({ error: `Agent '${req.params.id}' not found` });
  res.json(entry.manifest);
});

// POST /agents/:id/execute — run a job
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

// ── Start ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[agents] Service running on port ${PORT}`);
  console.log(`[agents] Available: ${[...registry.keys()].join(', ')}`);
});
