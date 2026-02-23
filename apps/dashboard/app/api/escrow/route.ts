import { NextResponse } from 'next/server';
import prisma from "@/app/lib/prisma";

export async function GET() {
    try {
        // 🌟 ISOLATE A2A TRANSACTIONS ONLY 🌟
        // This query explicitly filters out Mass Disbursal/Payroll transactions
        // It only fetches items where isDiscovery is true OR note contains 'A2A'
        const a2aEscrows = await prisma.timeVaultPayload.findMany({
            where: {
                status: { in: ['EscrowLocked', 'DISPUTED', 'SETTLED', 'REFUNDED'] },
                OR: [
                    { isDiscovery: true },
                    { note: { contains: 'A2A' } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // Also fetch matching AgentJob records for on-chain data
        const agentJobs = await prisma.agentJob.findMany({
            where: {
                status: { in: ['ESCROW_LOCKED', 'EXECUTING', 'COMPLETED', 'DISPUTED', 'SETTLED', 'REFUNDED'] }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Build a lookup map: escrowTxHash → AgentJob (for joining data)
        const jobByTxHash = new Map<string, any>();
        const jobByClientAndAgent = new Map<string, any>();
        for (const job of agentJobs) {
            if (job.escrowTxHash) jobByTxHash.set(job.escrowTxHash, job);
            jobByClientAndAgent.set(`${job.clientWallet}-${job.agentId}`, job);
        }

        const formattedEscrows = a2aEscrows.map(item => {
            // Try to find the matching AgentJob for on-chain data
            const note = item.note || '';
            const matchedJob = agentJobs.find(j =>
                j.clientWallet === item.recipientWallet ||
                note.includes(j.id)
            );

            return {
                id: item.id,
                name: item.name || 'PayPol Neural Agent',
                recipientAddress: item.recipientWallet || '',
                amount: item.amount?.toString() || '0',
                token: item.token || 'AlphaUSD',
                note: item.note || '',
                status: item.status,
                // V2 fields for on-chain integration
                onChainJobId: matchedJob?.onChainJobId ?? null,
                deadline: matchedJob?.deadline ?? null,
                disputeReason: matchedJob?.disputeReason ?? null,
                escrowTxHash: matchedJob?.escrowTxHash ?? null,
                settleTxHash: matchedJob?.settleTxHash ?? null,
                agentJobId: matchedJob?.id ?? null,
            };
        });

        return NextResponse.json({ success: true, escrows: formattedEscrows });
    } catch (error: any) {
        console.error("[ESCROW_GET_ERROR]:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch escrows" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, action, reason, txHash, agentJobId } = body;

        if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

        // Action: Company Director raises a dispute against the Neural Agent
        if (action === 'dispute') {
            await prisma.timeVaultPayload.update({
                where: { id: String(id) },
                data: { status: 'DISPUTED', note: `[DISPUTED] Reason: ${reason}` }
            });
            // Also update AgentJob if linked
            if (agentJobId) {
                await prisma.agentJob.update({
                    where: { id: agentJobId },
                    data: { status: 'DISPUTED', disputeReason: reason || 'Employer dispute' }
                });
            }
            return NextResponse.json({ success: true, message: 'Transaction disputed successfully.' });
        }

        // Action: PayPol Arbitrator rules in favor of the Agent (Pay the Agent)
        if (action === 'release') {
            await prisma.timeVaultPayload.update({
                where: { id: String(id) },
                data: { status: 'SETTLED' }
            });
            // Also update AgentJob with settlement txHash
            if (agentJobId) {
                await prisma.agentJob.update({
                    where: { id: agentJobId },
                    data: { status: 'SETTLED', settleTxHash: txHash || null }
                });
            }
            return NextResponse.json({ success: true, message: 'Funds released to Agent.' });
        }

        // Action: PayPol Arbitrator rules in favor of the Company (Return funds to Company)
        if (action === 'refund') {
            await prisma.timeVaultPayload.update({
                where: { id: String(id) },
                data: { status: 'REFUNDED' }
            });
            // Also update AgentJob with refund txHash
            if (agentJobId) {
                await prisma.agentJob.update({
                    where: { id: agentJobId },
                    data: { status: 'REFUNDED', settleTxHash: txHash || null }
                });
            }
            return NextResponse.json({ success: true, message: 'Funds refunded to Company.' });
        }

        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("[ESCROW_POST_ERROR]:", error);
        return NextResponse.json({ success: false, error: "Database Error: " + error.message }, { status: 500 });
    }
}