import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// Fetch all autopilot rules to display in the UI
export async function GET(req: Request) {
    try {
        const rules = await prisma.autopilotRule.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        return NextResponse.json(rules);
    } catch (error) {
        console.error("Fetch Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch rules" }, { status: 500 });
    }
}

// Create new autopilot agents (supports both single object and array for CSV bulk)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Normalize input to array to handle both terminal inputs and CSV uploads
        const payloads = Array.isArray(body) ? body : [body];

        const operations = payloads.map(p => 
            prisma.autopilotRule.create({
                data: {
                    name: p.name || "Anonymous",
                    wallet_address: p.wallet,
                    amount: parseFloat(p.amount),
                    token: p.token || "AlphaUSD",
                    schedule: p.schedule,
                    note: p.note || "",
                    status: "Active" // Set to active by default upon creation
                }
            })
        );

        // Insert all records in a single transaction
        await prisma.$transaction(operations);
        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error("Ingestion Error:", error);
        return NextResponse.json({ success: false, error: "Failed to deploy agent" }, { status: 500 });
    }
}

// Update the status of an existing autopilot agent OR Trigger a cycle manually
export async function PUT(req: Request) {
    try {
        const { id, action } = await req.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Missing Agent ID" }, { status: 400 });
        }

        // --- NEW: Trigger a manual cycle into The Boardroom ---
        if (action === 'trigger') {
            const rule = await prisma.autopilotRule.findUnique({ where: { id: Number(id) } });
            if (!rule) throw new Error("Agent not found");

            let workspace = await prisma.workspace.findFirst();
            if (!workspace) {
                workspace = await prisma.workspace.create({
                    data: { name: "Genesis Workspace", adminWallet: "0x0000000000000000000000000000000000000000" }
                });
            }

            // Push a copy to The Boardroom queue
            await prisma.timeVaultPayload.create({
                data: {
                    workspaceId: workspace.id,
                    recipientWallet: rule.wallet_address,
                    amount: rule.amount,
                    status: "Draft",
                    zkCommitment: `[Autopilot] ${rule.schedule}` // Tag note to know origin
                }
            });

            return NextResponse.json({ success: true, message: "Cycle triggered to Boardroom" });
        }

        // --- EXISTING: Pause or Resume ---
        const newStatus = action === 'pause' ? 'Paused' : 'Active';
        await prisma.autopilotRule.update({
            where: { id: Number(id) },
            data: { status: newStatus }
        });

        return NextResponse.json({ success: true, message: `Agent ${newStatus}` });
    } catch (error) {
        console.error("State Mutation Error:", error);
        return NextResponse.json({ success: false, error: "Failed to process agent action" }, { status: 500 });
    }
}

// Delete an autopilot agent from the database
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ success: false, error: "Missing Agent ID" }, { status: 400 });
        }

        await prisma.autopilotRule.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json({ success: true, message: "Agent wiped from memory." });
    } catch (error) {
        console.error("Termination Error:", error);
        return NextResponse.json({ success: false, error: "Failed to terminate agent" }, { status: 500 });
    }
}