import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

// ==========================================
// GET: Fetch all conditional rules
// ==========================================
export async function GET() {
    try {
        const rules = await prisma.conditionalRule.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Parse JSON fields for frontend consumption
        const parsed = rules.map(rule => ({
            ...rule,
            recipients: JSON.parse(rule.recipients),
            conditions: JSON.parse(rule.conditions),
        }));

        return NextResponse.json({ success: true, rules: parsed });
    } catch (error) {
        console.error('❌ [Conditional] Fetch Error:', error);
        return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
}

// ==========================================
// POST: Create new conditional rule
// ==========================================
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, recipients, conditions, conditionLogic, note, maxTriggers } = body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ success: false, error: 'No recipients provided' }, { status: 400 });
        }

        if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
            return NextResponse.json({ success: false, error: 'No conditions provided' }, { status: 400 });
        }

        const rule = await prisma.conditionalRule.create({
            data: {
                name: name || 'Unnamed Conditional Rule',
                recipients: JSON.stringify(recipients),
                conditions: JSON.stringify(conditions),
                conditionLogic: conditionLogic || 'AND',
                note: note || '',
                maxTriggers: maxTriggers || 1,
                status: 'Watching',
            }
        });

        console.log(`✅ [Conditional] Rule created: ${rule.name} with ${conditions.length} condition(s) and ${recipients.length} recipient(s)`);
        return NextResponse.json({ success: true, rule });

    } catch (error: any) {
        console.error('🚨 [Conditional] Create Error:', error.message || error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ==========================================
// PUT: Update rule status or manually trigger
// ==========================================
export async function PUT(req: Request) {
    try {
        const { id, action } = await req.json();

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing rule ID' }, { status: 400 });
        }

        if (action === 'pause') {
            await prisma.conditionalRule.update({
                where: { id },
                data: { status: 'Paused' }
            });
            return NextResponse.json({ success: true, message: 'Rule paused' });
        }

        if (action === 'resume') {
            await prisma.conditionalRule.update({
                where: { id },
                data: { status: 'Watching' }
            });
            return NextResponse.json({ success: true, message: 'Rule resumed' });
        }

        if (action === 'trigger') {
            // Manually trigger: push all recipients to Boardroom as Draft payloads
            const rule = await prisma.conditionalRule.findUnique({ where: { id } });
            if (!rule) {
                return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
            }

            const recipients = JSON.parse(rule.recipients);

            let workspace = await prisma.workspace.findFirst();
            if (!workspace) {
                workspace = await prisma.workspace.create({
                    data: { name: 'PayPol Default Hub', adminWallet: '0x000' }
                });
            }

            // Create a TimeVaultPayload for each recipient
            const operations = recipients.map((r: any) =>
                prisma.timeVaultPayload.create({
                    data: {
                        workspaceId: workspace!.id,
                        name: r.name || 'Unknown Entity',
                        recipientWallet: r.wallet || '0x0000000000000000000000000000000000000000',
                        amount: parseFloat(r.amount) || 0,
                        token: r.token || 'AlphaUSD',
                        note: `⚡ [Conditional] ${rule.name} — ${r.note || ''}`.trim(),
                        status: 'Draft',
                    }
                })
            );

            await prisma.$transaction(operations);

            // Update the rule's trigger count and status
            await prisma.conditionalRule.update({
                where: { id },
                data: {
                    triggerCount: { increment: 1 },
                    triggeredAt: new Date(),
                    status: rule.maxTriggers === 1 ? 'Triggered' : 'Watching'
                }
            });

            console.log(`⚡ [Conditional] Rule "${rule.name}" triggered → ${recipients.length} payloads pushed to Boardroom`);
            return NextResponse.json({ success: true, message: 'Conditional payroll triggered to Boardroom' });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

    } catch (error: any) {
        console.error('🚨 [Conditional] Update Error:', error.message || error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// ==========================================
// DELETE: Remove a conditional rule
// ==========================================
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing rule ID' }, { status: 400 });
        }

        await prisma.conditionalRule.delete({ where: { id } });
        console.log(`🗑️ [Conditional] Rule deleted: ${id}`);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ [Conditional] Delete Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
