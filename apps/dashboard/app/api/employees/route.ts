import { apiSuccess, apiError, safeParseFloat, logAndReturn } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";
import { requireWalletAuth } from "@/app/lib/api-auth";
import { payrollLimiter, getClientId } from "@/app/lib/rate-limit";
export const dynamic = 'force-dynamic';

// ==========================================
// GET: Fetch pending and vaulted payloads
// ==========================================
export async function GET(req: Request) {
    try {
        const payloads = await prisma.timeVaultPayload.findMany({
            where: { status: { in: ['Draft', 'PENDING', 'PROCESSING', 'Vaulted', 'Completed', 'Failed'] } },
            orderBy: { createdAt: 'desc' },
            take: 200,
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
            status: item.status,
            zkProof: item.zkProof,
            zkCommitment: item.zkCommitment,
            createdAt: item.createdAt,
        });

        return apiSuccess({
            pending: pending.map(mapToFrontend),
            awaiting: pending.map(mapToFrontend),
            // Send everything that is currently processing, completed, or failed
            vaulted: payloads.filter((p: any) => ["PENDING", "PROCESSING", "COMPLETED", "FAILED"].includes(p.status)).map(mapToFrontend)
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

        // 🛡️ Validate all wallet addresses before creating any payloads
        const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
        const invalidIntents = intentsArray.filter((intent: any) => {
            const wallet = intent.wallet || intent.wallet_address || "";
            return !isValidAddress(wallet) || wallet === "0x0000000000000000000000000000000000000000";
        });
        if (invalidIntents.length > 0) {
            const names = invalidIntents.map((i: any) => i.name || 'Unknown').join(', ');
            return apiError(`Invalid wallet address for: ${names}. Please assign valid wallet addresses before queuing.`, 400);
        }

        const operations = intentsArray.map((intent: any) =>
            prisma.timeVaultPayload.create({
                data: {
                    workspaceId: defaultWorkspace!.id,
                    name: intent.name || "Unknown Entity",
                    recipientWallet: intent.wallet || intent.wallet_address,
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
    const auth = requireWalletAuth(req);
    if (!auth.valid) return auth.response!;
    const rateCheck = payrollLimiter.check(getClientId(req));
    if (!rateCheck.success) return apiError('Rate limit exceeded', 429);

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
            // Look up workspace from authenticated wallet to scope the delete
            const workspace = await prisma.workspace.findFirst({
                where: { adminWallet: { equals: auth.wallet, mode: 'insensitive' } },
            });
            const workspaceId = workspace?.id;
            await prisma.timeVaultPayload.deleteMany({
                where: {
                    status: { in: ["Draft", "PENDING", "PROCESSING", "Vaulted"] },
                    ...(workspaceId ? { workspaceId } : {}),
                }
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