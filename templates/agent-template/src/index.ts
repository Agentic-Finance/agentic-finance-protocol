/**
 * PayPol Community Agent Template
 *
 * This is a starter template for building a community agent
 * on the PayPol marketplace. Replace the handler logic with
 * your own implementation.
 *
 * Quick start:
 *   1. cp .env.example .env (fill in your values)
 *   2. npm install
 *   3. npm run dev
 *   4. npm run register (registers on the marketplace)
 *
 * Your agent will:
 *   - Receive jobs via POST /execute from the PayPol marketplace
 *   - Process the job and return structured results
 *   - Get paid in AlphaUSD via NexusV2 escrow on Tempo L1
 */

import 'dotenv/config';
import { PayPolAgent, JobRequest, JobResult } from 'paypol-sdk';

// ── Agent Configuration ──────────────────────────────────

const agent = new PayPolAgent({
  id:           'my-community-agent',       // Change: unique lowercase ID
  name:         'My Community Agent',       // Change: display name
  description:  'Describe what your agent does in 1-2 sentences.',
  category:     'analytics',                // Options: security, defi, payroll, analytics, automation, compliance
  version:      '1.0.0',
  price:        5,                          // Base price in AlphaUSD per job
  capabilities: ['example-capability'],     // List of capabilities for AI discovery
  author:       process.env.GITHUB_HANDLE ?? 'community',
});

// ── Job Handler ──────────────────────────────────────────

agent.onJob(async (job: JobRequest): Promise<JobResult> => {
  const start = Date.now();

  console.log(`[${agent.toManifest().id}] Received job: ${job.jobId}`);
  console.log(`  Prompt: ${job.prompt}`);
  console.log(`  Caller: ${job.callerWallet}`);

  try {
    // ─────────────────────────────────────────────────────
    // YOUR LOGIC HERE
    //
    // Examples of what you can do:
    //   - Call external APIs
    //   - Run on-chain transactions on Tempo L1
    //   - Analyze data from job.payload
    //   - Use AI models for intelligent processing
    //
    // The prompt contains the user's natural-language request.
    // The payload contains structured data (if any).
    // ─────────────────────────────────────────────────────

    const result = {
      message: `Hello from ${agent.toManifest().name}!`,
      prompt: job.prompt,
      processed: true,
      timestamp: new Date().toISOString(),
      // Add your result data here
    };

    console.log(`  Done in ${Date.now() - start}ms`);

    return {
      jobId:          job.jobId,
      agentId:        job.agentId,
      status:         'success',
      result,
      executionTimeMs: Date.now() - start,
      timestamp:      Date.now(),
    };

  } catch (err: any) {
    console.error(`  Error: ${err.message}`);
    return {
      jobId:          job.jobId,
      agentId:        job.agentId,
      status:         'error',
      error:          err.message ?? String(err),
      executionTimeMs: Date.now() - start,
      timestamp:      Date.now(),
    };
  }
});

// ── Start Server ─────────────────────────────────────────

const PORT = Number(process.env.AGENT_PORT ?? 3002);
agent.listen(PORT, () => {
  console.log(`Agent ready at http://localhost:${PORT}`);
  console.log(`  GET  /manifest  - agent metadata`);
  console.log(`  POST /execute   - run a job`);
  console.log(`  GET  /health    - health check`);
});
