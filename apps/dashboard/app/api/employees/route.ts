import { apiSuccess, apiError, safeParseFloat, logAndReturn } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";
export const dynamic = 'force-dynamic';

// ==========================================
// GET: Fetch pending and vaulted payloads
// ==========================================
export async function GET(req: Request) {
    try {
        const payloads = await prisma.timeVaultPayload.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // "Draft" means the payload is in The Boardroom awaiting admin signature
        const pending = payloads.filter((p: any) => p.status === "Draft");
        
        const mapToFrontend = (item: any) => ({
            id: item.id,
            name: item.name || "Unknown Entity",
            wallet_address: item.recipientWallet,
            amount: item.amount || 0,
            note: item.note || "",
            token: item.token || "AlphaUSD",
            isShielded: item.isShielded,
            isDiscovery: item.isDiscovery || false,
            // 🌟 REAL-TIME SYNC: Expose actual status and deposit hash to the frontend
            status: item.status,
            zkProof: item.zkProof 
        });

        return apiSuccess({
            pending: pending.map(mapToFrontend),
            awaiting: pending.map(mapToFrontend),
            // Send everything that is currently processing or completed
            vaulted: payloads.filter((p: any) => p.status === "PENDING" || p.status === "PROCESSING" || p.status === "COMPLETED").map(mapToFrontend)
        });
    } catch (error) {
        return logAndReturn("EMPLOYEES_GET", error, "Database error");
    }
}

// ==========================================
// POST: Queue payload into the Boardroom
// ==========================================
export async function POST(req: Request) {
    try {
        const payload = await req.json();
        console.log("📥 [API] Incoming Payload:", JSON.stringify(payload, null, 2));
        
        // Find default workspace if none specified
        let defaultWorkspace = await prisma.workspace.findFirst();
        if (!defaultWorkspace) {
            defaultWorkspace = await prisma.workspace.create({
                data: { name: "PayPol Default Hub", adminWallet: "0x000" }
            });
        }

        // 🌟 SAFETY FIX: Normalize payload to an array to prevent .map() undefined errors
        const intentsArray = Array.isArray(payload) ? payload : (payload.intents || [payload]);

        const operations = intentsArray.map((intent: any) => 
            prisma.timeVaultPayload.create({
                data: {
                    workspaceId: defaultWorkspace!.id,
                    name: intent.name || "Unknown Entity",
                    recipientWallet: intent.wallet || intent.wallet_address || "0x0000000000000000000000000000000000000000",
                    amount: safeParseFloat(intent.amount),
                    token: intent.token || "AlphaUSD",
                    note: intent.note || "",
                    isDiscovery: intent.isDiscovery || false,
                    status: "Draft" // Initial state before Admin signs
                }
            })
        );

        await prisma.$transaction(operations);
        console.log("✅ [API] Draft saved to Boardroom successfully!");
        return apiSuccess({});
        
    } catch (error: any) {
        return logAndReturn("EMPLOYEES_POST", error, "Failed to save draft to Boardroom");
    }
}

// ==========================================
// PUT: Process state transitions
// ==========================================
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { action, isShielded, batchTxHash, zkData } = body;

        if (action === 'approve') {
            if (isShielded && zkData && Array.isArray(zkData) && zkData.length > 0) {
                // ═══ REAL ZK Shield Mode (per-employee commitments) ═══
                // Frontend already deposited to ShieldVaultV2 with unique commitments per employee.
                // Store each employee's ZK data so daemon can generate proofs.
                const drafts = await prisma.timeVaultPayload.findMany({
                    where: { status: "Draft" },
                    orderBy: { createdAt: 'asc' },
                });

                for (const draft of drafts) {
                    // Match zkData to draft by recipient wallet or by order
                    const match = zkData.find((zk: any) =>
                        zk.employeeId === draft.id
                    ) || zkData.find((zk: any) =>
                        zk.recipient?.toLowerCase() === draft.recipientWallet?.toLowerCase()
                    );

                    if (match) {
                        await prisma.timeVaultPayload.update({
                            where: { id: draft.id },
                            data: {
                                status: "PENDING",
                                isShielded: true,
                                zkCommitment: match.commitment,
                                zkProof: JSON.stringify({
                                    secret: match.secret,
                                    nullifier: match.nullifier,
                                    nullifierHash: match.nullifierHash,
                                    depositTxHash: match.depositTxHash,
                                    amountScaled: match.amountScaled,
                                }),
                            },
                        });
                        console.log(`✅ [API] Employee ${draft.recipientWallet?.slice(0, 10)}... → PENDING with real ZK commitment: ${match.commitment?.slice(0, 16)}...`);
                    } else {
                        // No matching zkData — mark as PENDING without zkData (daemon generates fresh secrets)
                        await prisma.timeVaultPayload.update({
                            where: { id: draft.id },
                            data: {
                                status: "PENDING",
                                isShielded: true,
                                zkProof: batchTxHash || null,
                            },
                        });
                        console.log(`⚠️ [API] Employee ${draft.recipientWallet?.slice(0, 10)}... → PENDING (no matching zkData, daemon will handle)`);
                    }
                }
                console.log(`✅ [API] Boardroom approved (Real ZK Shield) → ${drafts.length} employees set to PENDING with per-employee commitments.`);

            } else if (isShielded) {
                // ═══ Legacy ZK Shield Mode (batch — daemon generates secrets) ═══
                await prisma.timeVaultPayload.updateMany({
                    where: { status: "Draft" },
                    data: {
                        status: "PENDING",
                        isShielded: true,
                        zkProof: batchTxHash || null
                    }
                });
                console.log("✅ [API] Boardroom approved (ZK Shield legacy) → PENDING for Daemon ZK execution.");
            } else {
                // ═══ Public Mode → On-chain TX already confirmed by frontend ═══
                await prisma.timeVaultPayload.updateMany({
                    where: { status: "Draft" },
                    data: {
                        status: "COMPLETED",
                        isShielded: false,
                        zkCommitment: batchTxHash || null
                    }
                });
                console.log("✅ [API] Boardroom approved (Public) → COMPLETED directly. TX already on-chain.");
            }
        } else if (action === 'cancel_vault') {
            await prisma.timeVaultPayload.deleteMany({
                where: { status: { in: ["Draft", "PENDING", "PROCESSING", "Vaulted"] } }
            });
        }
        return apiSuccess({});
    } catch (error) {
        return logAndReturn("EMPLOYEES_PUT", error, "Failed to process state transition");
    }
}

// ==========================================
// DELETE: Remove individual payload
// ==========================================
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return apiError("Missing payload ID", 400);

        await prisma.timeVaultPayload.delete({ where: { id: String(id) } });
        return apiSuccess({});
    } catch (error) {
        return logAndReturn("EMPLOYEES_DELETE", error, "Failed to delete payload");
    }
}