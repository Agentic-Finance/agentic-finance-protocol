/**
 * Shared Job Execution Utility — A2A Orchestration
 *
 * Core execution logic extracted for reuse by both:
 *   1. /api/marketplace/execute (direct API route)
 *   2. A2A Orchestrator (multi-agent pipeline)
 *
 * Handles: agent dispatch, AIProof commit/verify, stats update,
 * notifications, and chat channel updates.
 */

import prisma from '@/app/lib/prisma';
import { ethers } from 'ethers';
import { RPC_URL, AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI } from '@/app/lib/constants';
import { verifyTxOnChain } from '@/app/lib/verify-tx';
import { notify } from '@/app/lib/notify';
import { postJobUpdate } from '@/app/lib/chat-utils';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';

// ── Types ────────────────────────────────────────────────────

export interface ExecuteJobResult {
    success: boolean;
    status: string;
    result: any;
    executionTime: number;
    aiProof?: {
        commitmentId: string;
        commitTxHash: string;
        verifyTxHash: string;
        proofMatched: boolean | null;
    } | null;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Get daemon wallet for on-chain AI proof transactions.
 * Returns null if DAEMON_PRIVATE_KEY not configured.
 */
function getDaemonWallet(): ethers.Wallet | null {
    const key = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
    if (!key) return null;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Wallet(key, provider);
}

/**
 * Format agent result into a human-readable summary for chat display.
 * Handles the nested result.result structure from agent service.
 */
export function formatAgentResultForChat(raw: any): string {
    if (!raw) return 'Task completed.';
    if (typeof raw === 'string') return raw;
    if (raw.output && typeof raw.output === 'string') return raw.output;

    // The agent service wraps: { jobId, agentId, status, result: { phase, ... } }
    const inner = raw.result || raw;
    const phase = inner.phase || '';
    const lines: string[] = [];

    switch (phase) {
        case 'sweep-complete': {
            const sweeps = inner.sweeps || [];
            const ok = sweeps.filter((s: any) => !s.skipped);
            const skip = sweeps.filter((s: any) => s.skipped);
            lines.push('\u2705 Wallet sweep complete');
            if (inner.from) lines.push(`From: ${inner.from.slice(0, 6)}\u2026${inner.from.slice(-4)}`);
            if (inner.to) lines.push(`To: ${inner.to.slice(0, 6)}\u2026${inner.to.slice(-4)}`);
            for (const s of ok) lines.push(`\u2022 ${s.amount || '?'} ${s.token || ''} \u2192 ${s.txHash ? s.txHash.slice(0, 10) + '\u2026' : 'sent'}`);
            if (skip.length) lines.push(`\u26A0\uFE0F ${skip.length} token(s) skipped`);
            break;
        }
        case 'stream-created':
        case 'recurring-setup-complete': {
            lines.push(`\u2705 ${phase === 'stream-created' ? 'Stream created' : 'Recurring payment set up'}`);
            if (inner.streamId) lines.push(`Stream ID: #${inner.streamId}`);
            if (inner.schedule) {
                const s = inner.schedule;
                if (s.recipient) lines.push(`Recipient: ${s.recipient.slice(0, 6)}\u2026${s.recipient.slice(-4)}`);
                if (s.totalBudget) lines.push(`Total: ${s.totalBudget}`);
                if (s.periods) lines.push(`Periods: ${s.periods} \u00D7 ${s.amountPerPeriod || '?'}`);
            }
            if (inner.totalStreamsCreated) lines.push(`Streams: ${inner.totalStreamsCreated}`);
            const txH = inner.transaction?.hash || inner.transactions?.creation?.hash;
            if (txH) lines.push(`TX: ${txH.slice(0, 10)}\u2026${txH.slice(-6)}`);
            break;
        }
        case 'transfer-complete': {
            lines.push('\u2705 Transfer complete');
            if (inner.amount) lines.push(`Amount: ${inner.amount} ${inner.token || 'AlphaUSD'}`);
            if (inner.to) lines.push(`To: ${inner.to.slice(0, 6)}\u2026${inner.to.slice(-4)}`);
            if (inner.transaction?.hash) lines.push(`TX: ${inner.transaction.hash.slice(0, 10)}\u2026`);
            break;
        }
        case 'escrow-created':
        case 'escrow-complete': {
            lines.push(`\u2705 Escrow ${phase === 'escrow-created' ? 'created' : 'completed'}`);
            if (inner.onChainJobId) lines.push(`Job ID: #${inner.onChainJobId}`);
            if (inner.budget) lines.push(`Budget: ${inner.budget}`);
            if (inner.transaction?.hash) lines.push(`TX: ${inner.transaction.hash.slice(0, 10)}\u2026`);
            break;
        }
        case 'bulk-escrow-complete': {
            lines.push(`\u2705 Bulk escrow: ${inner.totalJobs || '?'} jobs created`);
            if (inner.totalBudget) lines.push(`Total: ${inner.totalBudget}`);
            break;
        }
        case 'batch-complete':
        case 'multi-token-batch-complete': {
            lines.push('\u2705 Batch payment complete');
            if (inner.recipientCount) lines.push(`Recipients: ${inner.recipientCount}`);
            if (inner.totalAmount) lines.push(`Total: ${inner.totalAmount}`);
            break;
        }
        case 'benchmark-complete': {
            const bm = inner.benchmark?.summary;
            lines.push('\u2705 Benchmark complete');
            if (bm) {
                lines.push(`Operations: ${bm.operationsExecuted || 5}`);
                lines.push(`ETH cost: $${bm.totalEthUSD?.toFixed?.(2) || '?'} \u2192 Tempo: $0.00`);
            }
            break;
        }
        case 'fees-collected': {
            lines.push('\u2705 Fees collected');
            if (inner.summary) lines.push(`Total: ${inner.summary.totalCollected}`);
            break;
        }
        case 'treasury-report': {
            lines.push('\u2705 Treasury report');
            if (inner.wallet?.totalTokenUSD) lines.push(`Wallet: $${inner.wallet.totalTokenUSD}`);
            if (inner.contractHoldings?.totalAlphaUSD) lines.push(`Contracts: $${inner.contractHoldings.totalAlphaUSD}`);
            break;
        }
        case 'contracts-read':
        case 'chain-monitored':
        case 'proof-audit-complete': {
            lines.push(`\u2705 ${phase.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`);
            if (inner.contractActivity) lines.push(`On-chain ops: ${inner.contractActivity.totalOnChainOperations}`);
            break;
        }
        default: {
            const label = phase ? phase.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Task completed';
            lines.push(`\u2705 ${label}`);
            if (inner.summary && typeof inner.summary === 'string') {
                lines.push(inner.summary);
            } else if (inner.summary && typeof inner.summary === 'object') {
                for (const [k, v] of Object.entries(inner.summary)) {
                    if (typeof v === 'string' || typeof v === 'number') {
                        lines.push(`${k.replace(/([A-Z])/g, ' $1').trim()}: ${v}`);
                    }
                }
            }
            break;
        }
    }

    if (inner.onChain && inner.network) {
        lines.push(`\n\uD83D\uDD17 ${inner.network}`);
    }

    return lines.join('\n') || 'Task completed.';
}

// ── Core Execution ───────────────────────────────────────────

/**
 * Execute a marketplace job end-to-end.
 *
 * Steps:
 *   1. Fetch job + agent from DB
 *   2. Mark as EXECUTING
 *   3. AIProof commit (planHash)
 *   4. Dispatch to agent (native / webhook / simulated)
 *   5. AIProof verify (resultHash)
 *   6. Update job record
 *   7. Update agent stats
 *   8. Send notifications + chat updates
 */
export async function executeJob(jobId: string): Promise<ExecuteJobResult> {
    // ═══════════════════════════════════════════════════════════
    // 1. Fetch job + agent
    // ═══════════════════════════════════════════════════════════
    const job = await prisma.agentJob.findUnique({
        where: { id: jobId },
        include: { agent: true },
    });

    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== 'MATCHED' && job.status !== 'ESCROW_LOCKED' && job.status !== 'ORCHESTRATING') {
        throw new Error(`Cannot execute job in status: ${job.status}`);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Mark as EXECUTING
    // ═══════════════════════════════════════════════════════════
    await prisma.agentJob.update({
        where: { id: jobId },
        data: { status: 'EXECUTING' },
    });

    // Post "executing" status to agent chat channel
    postJobUpdate({
        jobId,
        agentId: job.agent.id,
        agentName: job.agent.name,
        content: `Starting execution of your task...`,
        messageType: 'system',
    }).catch(() => {});

    // ═══════════════════════════════════════════════════════════
    // 2.5: AIProofRegistry — Commit planHash BEFORE execution
    // Proves on-chain what the agent was ASKED to do.
    // ═══════════════════════════════════════════════════════════
    let commitmentId: string | null = null;
    let commitTxHash: string = '';
    const wallet = getDaemonWallet();

    if (wallet && job.onChainJobId) {
        try {
            const planInput = (job.prompt || '') + (job.taskDescription || '');
            const planHash = ethers.keccak256(ethers.toUtf8Bytes(planInput));

            const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, wallet);
            const nonce = await wallet.provider!.getTransactionCount(wallet.address, 'pending');
            const tx = await registry.commit(planHash, job.onChainJobId, {
                nonce, gasLimit: 500_000, type: 0
            });

            commitTxHash = tx.hash;
            console.log(`[AIProof] Commitment TX sent: ${commitTxHash}`);

            try { await tx.wait(1); } catch (e: any) {
                if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                    await verifyTxOnChain(commitTxHash, 'AIProofRegistry.commit');
                } else { throw e; }
            }

            // Extract commitmentId from event logs (try raw RPC if ethers fails)
            try {
                const receipt = await wallet.provider!.getTransactionReceipt(commitTxHash);
                if (receipt) {
                    for (const log of receipt.logs) {
                        try {
                            const parsed = registry.interface.parseLog({ topics: log.topics as string[], data: log.data });
                            if (parsed && parsed.name === 'CommitmentMade') {
                                commitmentId = parsed.args.commitmentId;
                                break;
                            }
                        } catch { /* skip */ }
                    }
                }
            } catch {
                // Tempo parse error -- use planHash as fallback commitmentId
                commitmentId = planHash;
            }

            // Store commitment data
            await prisma.agentJob.update({
                where: { id: jobId },
                data: { planHash, commitmentId, commitTxHash: commitTxHash || null },
            });

            console.log(`[AIProof] Commitment registered on-chain. ID: ${commitmentId?.slice(0, 16)}...`);
        } catch (proofError: any) {
            console.error(`[AIProof] Commitment failed (non-blocking):`, proofError.message);
            // Don't block execution -- AIProof is an enhancement, not critical path
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Execute agent task
    // ═══════════════════════════════════════════════════════════
    const startTime = Date.now();
    let result: any = null;
    let finalStatus = 'COMPLETED';

    try {
        if (job.agent.nativeAgentId) {
            // ════ Native PayPol Agent (Claude-powered) ════
            const response = await fetch(`${AGENT_SERVICE_URL}/agents/${job.agent.nativeAgentId}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: job.prompt,
                    taskDescription: job.taskDescription,
                    budget: job.budget,
                    callerWallet: job.clientWallet,
                }),
                signal: AbortSignal.timeout(120000),
            });

            if (!response.ok) throw new Error(`Agent service returned ${response.status}`);
            result = await response.json();

        } else if (job.agent.webhookUrl) {
            // ════ Third-party Agent (via webhook) ════
            const response = await fetch(job.agent.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    prompt: job.prompt,
                    taskDescription: job.taskDescription,
                    budget: job.budget,
                    callerWallet: job.clientWallet,
                    token: job.token,
                }),
                signal: AbortSignal.timeout(120000),
            });

            if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
            result = await response.json();

        } else {
            // ════ No execution endpoint — Simulate for demo agents ════
            result = {
                status: 'completed',
                output: `Task "${job.prompt}" has been queued for processing by ${job.agent.name}. The agent will deliver results to your workspace.`,
                metadata: {
                    agentName: job.agent.name,
                    category: job.agent.category,
                    estimatedTime: `${job.agent.responseTime}s`,
                },
            };
        }
    } catch (execError: any) {
        console.error(`[Execute] Agent execution failed:`, execError.message);
        finalStatus = 'FAILED';
        result = { error: execError.message };
    }

    const executionTime = Math.round((Date.now() - startTime) / 1000);

    // ═══════════════════════════════════════════════════════════
    // 3.5: AIProofRegistry — Verify resultHash AFTER execution
    // Records on-chain what the agent ACTUALLY did.
    // ═══════════════════════════════════════════════════════════
    let resultHash: string = '';
    let verifyTxHashStr: string = '';
    let proofMatched: boolean | null = null;

    if (wallet && commitmentId && finalStatus === 'COMPLETED') {
        try {
            resultHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(result)));

            const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, wallet);
            const nonce = await wallet.provider!.getTransactionCount(wallet.address, 'pending');
            const tx = await registry.verify(commitmentId, resultHash, {
                nonce, gasLimit: 500_000, type: 0
            });

            verifyTxHashStr = tx.hash;
            console.log(`[AIProof] Verification TX sent: ${verifyTxHashStr}`);

            try { await tx.wait(1); } catch (e: any) {
                if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                    await verifyTxOnChain(verifyTxHashStr, 'AIProofRegistry.verify');
                } else { throw e; }
            }

            // planHash !== resultHash by design (one hashes the question, other the answer)
            // The AIProofRegistry contract records both for accountability
            const planInput = (job.prompt || '') + (job.taskDescription || '');
            const planHash = ethers.keccak256(ethers.toUtf8Bytes(planInput));
            proofMatched = planHash === resultHash;

            console.log(`[AIProof] Verification recorded on-chain. planHash vs resultHash match: ${proofMatched}`);
        } catch (verifyError: any) {
            console.error(`[AIProof] Verification failed (non-blocking):`, verifyError.message);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Update job with result + AI proof data
    // ═══════════════════════════════════════════════════════════
    await prisma.agentJob.update({
        where: { id: jobId },
        data: {
            status: finalStatus,
            result: JSON.stringify(result),
            executionTime,
            completedAt: new Date(),
            resultHash: resultHash || null,
            verifyTxHash: verifyTxHashStr || null,
            proofMatched,
        },
    });

    // ═══════════════════════════════════════════════════════════
    // 5. Update agent stats
    // ═══════════════════════════════════════════════════════════
    const agent = job.agent;
    const newTotal = agent.totalJobs + 1;
    const prevSuccessCount = Math.round(agent.successRate * agent.totalJobs / 100);
    const newSuccessCount = finalStatus === 'COMPLETED' ? prevSuccessCount + 1 : prevSuccessCount;
    const newRate = newTotal > 0 ? (newSuccessCount / newTotal) * 100 : 100;

    await prisma.marketplaceAgent.update({
        where: { id: agent.id },
        data: {
            totalJobs: newTotal,
            successRate: Math.round(newRate * 10) / 10,
            responseTime: Math.round((agent.responseTime * agent.totalJobs + executionTime) / newTotal),
        },
    });

    // ═══════════════════════════════════════════════════════════
    // 6. Notifications
    // ═══════════════════════════════════════════════════════════
    notify({
        wallet: job.clientWallet,
        type: finalStatus === 'COMPLETED' ? 'job:completed' : 'job:failed',
        title: finalStatus === 'COMPLETED' ? 'Task Completed' : 'Task Failed',
        message: finalStatus === 'COMPLETED'
            ? `${job.agent.name} completed your task in ${executionTime}s`
            : `Execution failed: ${(result as any)?.error || 'Unknown error'}`,
        streamJobId: jobId,
    }).catch(() => {});

    // ═══════════════════════════════════════════════════════════
    // 7. Post result to agent chat channel
    // ═══════════════════════════════════════════════════════════
    if (finalStatus === 'COMPLETED') {
        const resultSummary = formatAgentResultForChat(result);
        postJobUpdate({
            jobId,
            agentId: job.agent.id,
            agentName: job.agent.name,
            content: `Task completed in ${executionTime}s.\n\n${resultSummary}`,
            messageType: 'agent_result',
            metadata: {
                status: 'completed',
                executionTime,
                commitTxHash: commitTxHash || null,
                verifyTxHash: verifyTxHashStr || null,
                proofMatched,
            },
        }).catch(() => {});
    } else {
        postJobUpdate({
            jobId,
            agentId: job.agent.id,
            agentName: job.agent.name,
            content: `Task failed: ${(result as any)?.error || 'Unknown error'}`,
            messageType: 'system',
            metadata: { status: 'failed' },
        }).catch(() => {});
    }

    return {
        success: finalStatus === 'COMPLETED',
        status: finalStatus,
        result,
        executionTime,
        aiProof: commitmentId ? {
            commitmentId,
            commitTxHash,
            verifyTxHash: verifyTxHashStr,
            proofMatched,
        } : null,
    };
}
