import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ethers } from 'ethers';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';
const RPC_URL = process.env.RPC_URL || 'https://rpc.moderato.tempo.xyz';
const AI_PROOF_REGISTRY_ADDRESS = '0x8fDB8E871c9eaF2955009566F41490Bbb128a014';

const AI_PROOF_REGISTRY_ABI = [
    "function commit(bytes32 planHash, uint256 nexusJobId) external returns (bytes32)",
    "function verify(bytes32 commitmentId, bytes32 resultHash) external",
    "event CommitmentMade(bytes32 indexed commitmentId, address indexed agent, uint256 indexed nexusJobId, bytes32 planHash)",
    "event CommitmentVerified(bytes32 indexed commitmentId, bool matched, bytes32 resultHash)",
];

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
 * Verify transaction on Tempo via raw RPC (ethers.js can't parse Tempo's 0x76 tx type).
 */
async function verifyTxOnChain(txHash: string, label: string): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const res = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: Date.now(),
                    method: 'eth_getTransactionReceipt',
                    params: [txHash],
                }),
            });
            const json = await res.json();
            const receipt = json?.result;
            if (receipt) {
                if (receipt.status === '0x0') throw new Error(`${label} reverted: ${txHash}`);
                if (receipt.status === '0x1') return;
                return;
            }
        } catch (err: any) {
            if (err.message?.includes('reverted')) throw err;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    console.warn(`[AIProof] ${label} receipt not found after 10s — continuing anyway`);
}

export async function POST(req: Request) {
    try {
        const { jobId } = await req.json();

        if (!jobId) {
            return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
        }

        // 1. Fetch job + agent
        const job = await prisma.agentJob.findUnique({
            where: { id: jobId },
            include: { agent: true },
        });

        if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
        if (job.status !== 'ESCROW_LOCKED' && job.status !== 'MATCHED') {
            return NextResponse.json({ error: `Cannot execute job in status: ${job.status}` }, { status: 400 });
        }

        // 2. Mark as executing
        await prisma.agentJob.update({
            where: { id: jobId },
            data: { status: 'EXECUTING' },
        });

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
                    // Tempo parse error — use planHash as fallback commitmentId
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
                // Don't block execution — AIProof is an enhancement, not critical path
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
        let verifyTxHash: string = '';
        let proofMatched: boolean | null = null;

        if (wallet && commitmentId && finalStatus === 'COMPLETED') {
            try {
                resultHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(result)));

                const registry = new ethers.Contract(AI_PROOF_REGISTRY_ADDRESS, AI_PROOF_REGISTRY_ABI, wallet);
                const nonce = await wallet.provider!.getTransactionCount(wallet.address, 'pending');
                const tx = await registry.verify(commitmentId, resultHash, {
                    nonce, gasLimit: 500_000, type: 0
                });

                verifyTxHash = tx.hash;
                console.log(`[AIProof] Verification TX sent: ${verifyTxHash}`);

                try { await tx.wait(1); } catch (e: any) {
                    if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                        await verifyTxOnChain(verifyTxHash, 'AIProofRegistry.verify');
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

        // 4. Update job with result + AI proof data
        await prisma.agentJob.update({
            where: { id: jobId },
            data: {
                status: finalStatus,
                result: JSON.stringify(result),
                executionTime,
                completedAt: new Date(),
                resultHash: resultHash || null,
                verifyTxHash: verifyTxHash || null,
                proofMatched,
            },
        });

        // 5. Update agent stats
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

        return NextResponse.json({
            success: finalStatus === 'COMPLETED',
            status: finalStatus,
            result,
            executionTime,
            aiProof: commitmentId ? {
                commitmentId,
                commitTxHash,
                verifyTxHash,
                proofMatched,
            } : null,
        });

    } catch (error: any) {
        console.error("[Marketplace Execute]", error);
        return NextResponse.json({ error: "Execution failed." }, { status: 500 });
    }
}
