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
            // Parse zkProof JSON to extract real on-chain tx hashes
            let depositTxHash = '';
            let payoutTxHash = '';
            try {
                const proof = JSON.parse(tx.zkProof || '{}');
                depositTxHash = proof.depositTxHash || '';
                payoutTxHash = proof.payoutTxHash || '';
            } catch {}

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