import { apiSuccess, apiError, safeParseFloat, logAndReturn } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";

// Fetch all autopilot rules to display in the UI
export async function GET(req: Request) {
    try {
        const rules = await prisma.autopilotRule.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        return apiSuccess({ data: rules });
    } catch (error) {
        return logAndReturn("AUTOPILOT_GET", error, "Failed to fetch rules");
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
                    amount: safeParseFloat(p.amount),
                    token: p.token || "AlphaUSD",
                    schedule: p.schedule,
                    note: p.note || "",
                    status: "Active" // Set to active by default upon creation
                }
            })
        );

        // Insert all records in a single transaction
        await prisma.$transaction(operations);
        return apiSuccess({});

    } catch (error) {
        return logAndReturn("AUTOPILOT_POST", error, "Failed to deploy agent");
    }
}

// Update the status of an existing autopilot agent OR Trigger a cycle manually
export async function PUT(req: Request) {
    try {
        const { id, action } = await req.json();

        if (!id) {
            return apiError("Missing Agent ID", 400);
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

            return apiSuccess({ message: "Cycle triggered to Boardroom" });
        }

        // --- EXISTING: Pause or Resume ---
        const newStatus = action === 'pause' ? 'Paused' : 'Active';
        await prisma.autopilotRule.update({
            where: { id: Number(id) },
            data: { status: newStatus }
        });

        return apiSuccess({ message: `Agent ${newStatus}` });
    } catch (error) {
        return logAndReturn("AUTOPILOT_PUT", error, "Failed to process agent action");
    }
}

// Delete an autopilot agent from the database
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return apiError("Missing Agent ID", 400);
        }

        await prisma.autopilotRule.delete({
            where: { id: Number(id) }
        });

        return apiSuccess({ message: "Agent wiped from memory." });
    } catch (error) {
        return logAndReturn("AUTOPILOT_DELETE", error, "Failed to terminate agent");
    }
}