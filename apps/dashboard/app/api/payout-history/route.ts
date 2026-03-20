import { apiSuccess, logAndReturn } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * Parse zkProof field — can be JSON object, plain tx hash string, or null.
 * Returns { depositTxHash, payoutTxHash }.
 */
function parseZkProof(raw: string | null): { depositTxHash: string; payoutTxHash: string } {
    let depositTxHash = '';
    let payoutTxHash = '';
    try {
        if (raw && typeof raw === 'string') {
            if (raw.startsWith('{')) {
                const proof = JSON.parse(raw);
                depositTxHash = proof.depositTxHash || '';
                payoutTxHash = proof.payoutTxHash || '';
            } else if (raw.startsWith('0x')) {
                payoutTxHash = raw;
            }
        }
    } catch { /* ignore malformed zkProof */ }
    return { depositTxHash, payoutTxHash };
}

export async function GET(req: Request) {
    try {
        // Optional workspace filter — when wallet param provided, scope to workspace
        const { searchParams } = new URL(req.url);
        const wallet = searchParams.get('wallet')?.trim();

        let where: any = { status: 'COMPLETED' };

        if (wallet) {
            const workspace = await prisma.workspace.findFirst({
                where: { adminWallet: { equals: wallet, mode: 'insensitive' } },
            });
            if (workspace) {
                where.workspaceId = workspace.id;
            }
            // No workspace found — fall through to show all completed data
        }

        // Fetch completed payloads (processed by Daemon or Public Batch)
        const completedTx = await prisma.timeVaultPayload.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // ═══ Batch Grouping Logic ═══
        // Jobs submitted together from OmniTerminal share the same createdAt (±1s).
        // Group shielded jobs by createdAt rounded to minute → show as single batch.
        // Public jobs keep their own hash (they already batch via MultisendV2).
        const batchGroups: Record<string, any[]> = {};
        const soloEntries: any[] = [];

        for (const tx of completedTx) {
            const { depositTxHash, payoutTxHash } = parseZkProof(tx.zkProof);
            const realTxHash = payoutTxHash || depositTxHash;

            const entry = {
                id: tx.id,
                txHash: realTxHash,
                depositTxHash,
                payoutTxHash,
                date: tx.createdAt.toLocaleString('en-GB'),
                amount: tx.amount || 0,
                token: tx.token,
                name: tx.name || 'Unknown Entity',
                address: tx.recipientWallet,
                note: tx.note,
                isShielded: tx.isShielded,
                zkCommitment: tx.zkCommitment,
                createdAt: tx.createdAt,
            };

            if (tx.isShielded && realTxHash) {
                // Group shielded jobs by createdAt minute → same Boardroom approval = same batch
                const batchKey = tx.createdAt.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
                if (!batchGroups[batchKey]) batchGroups[batchKey] = [];
                batchGroups[batchKey].push(entry);
            } else {
                soloEntries.push({ ...entry, hash: realTxHash || tx.id });
            }
        }

        // Merge batch groups into single history entries
        const batchedHistory: any[] = [];
        for (const [, group] of Object.entries(batchGroups)) {
            if (group.length === 1) {
                // Solo shielded — no batching needed
                batchedHistory.push({ ...group[0], hash: group[0].txHash || group[0].id });
            } else {
                // Multiple recipients in same batch → group under first TX hash
                const firstTxHash = group.find(g => g.txHash)?.txHash || group[0].id;
                batchedHistory.push({
                    hash: firstTxHash,
                    txHash: firstTxHash,
                    date: group[0].date,
                    amount: group.reduce((sum: number, g: any) => sum + (parseFloat(g.amount) || 0), 0),
                    token: group[0].token,
                    isShielded: true,
                    isLocalBatch: false,
                    // Breakdown: each recipient with their own proof + TX
                    breakdown: group.map(g => ({
                        name: g.name,
                        address: g.address,
                        amount: g.amount,
                        note: g.note || 'ZK-Shielded Transfer',
                        zkCommitment: g.zkCommitment,
                        txHash: g.txHash,
                        depositTxHash: g.depositTxHash,
                        payoutTxHash: g.payoutTxHash,
                    })),
                });
            }
        }

        // Combine: batched shielded groups + solo entries
        const formattedHistory = [...batchedHistory, ...soloEntries]
            .sort((a, b) => {
                const dateA = a.createdAt || new Date(a.date);
                const dateB = b.createdAt || new Date(b.date);
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            })
            .map(({ createdAt, ...rest }) => rest); // Remove createdAt from output

        return apiSuccess({ data: formattedHistory });
    } catch (error: any) {
        return logAndReturn("PAYOUT_HISTORY", error, "Failed to fetch history");
    }
}