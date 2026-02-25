import { NextResponse } from "next/server";
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
        const pending = payloads.filter(p => p.status === "Draft");
        
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

        return NextResponse.json({
            success: true,
            pending: pending.map(mapToFrontend),
            awaiting: pending.map(mapToFrontend),
            // Send everything that is currently processing or completed
            vaulted: payloads.filter(p => p.status === "PENDING" || p.status === "PROCESSING" || p.status === "COMPLETED").map(mapToFrontend)
        });
    } catch (error) {
        console.error("❌ [GET] Fetch Error:", error);
        return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
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
                    amount: parseFloat(intent.amount) || 0,
                    token: intent.token || "AlphaUSD",
                    note: intent.note || "",
                    isDiscovery: intent.isDiscovery || false,
                    status: "Draft" // Initial state before Admin signs
                }
            })
        );

        await prisma.$transaction(operations);
        console.log("✅ [API] Draft saved to Boardroom successfully!");
        return NextResponse.json({ success: true });
        
    } catch (error: any) {
        console.error("🚨 [API] Boardroom Ingestion Error:", error.message || error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ==========================================
// PUT: Process state transitions
// ==========================================
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { action, isShielded, batchTxHash } = body;

        if (action === 'approve') {
            if (isShielded) {
                // ZK Shielded mode → Move to PENDING for Daemon to generate ZK proof + execute shieldContract
                await prisma.timeVaultPayload.updateMany({
                    where: { status: "Draft" },
                    data: {
                        status: "PENDING",
                        isShielded: true,
                        zkProof: batchTxHash || null
                    }
                });
                console.log("✅ [API] Boardroom approved (ZK Shield) → PENDING for Daemon ZK execution.");
            } else {
                // Public mode → On-chain TX already confirmed by frontend (transfer/createJob)
                // Skip daemon - mark as COMPLETED immediately (no ZK proof needed)
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
        return NextResponse.json({ success: true });
    } catch (error) { 
        console.error("❌ [PUT] Error:", error);
        return NextResponse.json({ success: false }, { status: 500 }); 
    }
}

// ==========================================
// DELETE: Remove individual payload
// ==========================================
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ success: false }, { status: 400 });
        
        await prisma.timeVaultPayload.delete({ where: { id: String(id) } });
        return NextResponse.json({ success: true });
    } catch (error) { 
        return NextResponse.json({ success: false }, { status: 500 }); 
    }
}