import { apiSuccess, logAndReturn } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all completed payloads (processed by Daemon or Public Batch)
        const completedTx = await prisma.timeVaultPayload.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' }
        });

        // Map data to the format expected by LedgerHistory UI
        const formattedHistory = completedTx.map(tx => {
            // Safely parse zkProof — can be JSON object, plain string (txHash), or null
            let depositTxHash = '';
            let payoutTxHash = '';
            try {
                const raw = tx.zkProof;
                if (raw && typeof raw === 'string') {
                    // Try JSON parse first
                    if (raw.startsWith('{')) {
                        const proof = JSON.parse(raw);
                        depositTxHash = proof.depositTxHash || '';
                        payoutTxHash = proof.payoutTxHash || '';
                    } else if (raw.startsWith('0x')) {
                        // Plain tx hash string — treat as batch payout hash
                        payoutTxHash = raw;
                    }
                }
            } catch { /* ignore malformed zkProof */ }

            // Real tx hash for explorer links (prefer payoutTxHash, then depositTxHash)
            const realTxHash = payoutTxHash || depositTxHash;

            return {
                hash: realTxHash || tx.id,   // Group by real tx hash (not raw JSON)
                txHash: realTxHash,           // For explorer links
                depositTxHash,
                payoutTxHash,
                date: tx.createdAt.toLocaleString('en-GB'),
                amount: tx.amount || 0,
                token: tx.token,
                name: tx.name || 'Unknown Entity',
                address: tx.recipientWallet,
                note: tx.note,
                isShielded: tx.isShielded,
                zkCommitment: tx.zkCommitment // Poseidon hash (display only, not for explorer)
            };
        });

        return apiSuccess({ data: formattedHistory });
    } catch (error: any) {
        return logAndReturn("PAYOUT_HISTORY", error, "Failed to fetch history");
    }
}