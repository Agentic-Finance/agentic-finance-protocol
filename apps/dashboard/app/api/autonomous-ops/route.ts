/**
 * Autonomous Operations API
 *
 * Agents run 24/7 with budget management:
 * - Create autonomous task: set goal, budget, duration
 * - Agent works independently, reports progress
 * - Auto-pause when budget exhausted or goal achieved
 * - Real-time spending tracking and alerts
 *
 * Example: "Monitor contract 0x... for 30 days, budget $500,
 *           alert if TVL drops below $1M"
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    const status = searchParams.get('status');

    if (!walletAddress) {
        return NextResponse.json({ error: 'wallet required' }, { status: 400 });
    }

    try {
        // Check if AutonomousOp model exists, otherwise use in-memory
        const ops = await getOpsForWallet(walletAddress, status || undefined);

        const stats = {
            totalOps: ops.length,
            activeOps: ops.filter(o => o.status === 'running').length,
            totalBudget: ops.reduce((s, o) => s + o.budget, 0),
            totalSpent: ops.reduce((s, o) => s + o.spent, 0),
            completedOps: ops.filter(o => o.status === 'completed').length,
        };

        return NextResponse.json({ ops, stats });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        switch (action) {
            case 'create': {
                const { walletAddress, agentId, goal, budget, duration, alertThresholds, checkInterval } = body;

                if (!walletAddress || !agentId || !goal || !budget) {
                    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
                }

                const op = {
                    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    walletAddress,
                    agentId,
                    goal,
                    budget: parseFloat(budget),
                    spent: 0,
                    duration: duration || 30 * 24 * 3600, // default 30 days
                    status: 'running' as const,
                    alertThresholds: alertThresholds || { budgetWarning: 80, budgetCritical: 95 },
                    checkInterval: checkInterval || 3600, // default: check every hour
                    createdAt: new Date().toISOString(),
                    lastCheckAt: null as string | null,
                    logs: [] as Array<{ timestamp: string; message: string; type: string }>,
                    results: [] as Array<{ timestamp: string; data: any }>,
                };

                // Store in memory (in production: Prisma model)
                storeOp(op);

                return NextResponse.json({
                    success: true,
                    op: { id: op.id, status: op.status, budget: op.budget },
                    message: `Autonomous operation created. Agent will run for ${Math.round(op.duration / 86400)} days with $${op.budget} budget.`,
                });
            }

            case 'pause': {
                const { opId } = body;
                const op = getOp(opId);
                if (!op) return NextResponse.json({ error: 'Op not found' }, { status: 404 });
                op.status = 'paused';
                op.logs.push({ timestamp: new Date().toISOString(), message: 'Operation paused by user', type: 'info' });
                storeOp(op);
                return NextResponse.json({ success: true, status: 'paused' });
            }

            case 'resume': {
                const { opId } = body;
                const op = getOp(opId);
                if (!op) return NextResponse.json({ error: 'Op not found' }, { status: 404 });
                op.status = 'running';
                op.logs.push({ timestamp: new Date().toISOString(), message: 'Operation resumed by user', type: 'info' });
                storeOp(op);
                return NextResponse.json({ success: true, status: 'running' });
            }

            case 'stop': {
                const { opId } = body;
                const op = getOp(opId);
                if (!op) return NextResponse.json({ error: 'Op not found' }, { status: 404 });
                op.status = 'stopped';
                op.logs.push({ timestamp: new Date().toISOString(), message: 'Operation stopped by user', type: 'warning' });
                storeOp(op);
                return NextResponse.json({ success: true, status: 'stopped', spent: op.spent, remaining: op.budget - op.spent });
            }

            case 'record-spend': {
                const { opId, amount, description } = body;
                const op = getOp(opId);
                if (!op) return NextResponse.json({ error: 'Op not found' }, { status: 404 });

                const spendAmount = parseFloat(amount);
                op.spent += spendAmount;
                op.lastCheckAt = new Date().toISOString();
                op.logs.push({
                    timestamp: new Date().toISOString(),
                    message: `Spent $${spendAmount.toFixed(2)}: ${description}`,
                    type: 'spend',
                });

                // Check budget alerts
                const budgetUsedPct = (op.spent / op.budget) * 100;
                if (budgetUsedPct >= (op.alertThresholds?.budgetCritical || 95)) {
                    op.status = 'budget_exhausted';
                    op.logs.push({
                        timestamp: new Date().toISOString(),
                        message: `Budget exhausted (${budgetUsedPct.toFixed(1)}% used). Operation paused.`,
                        type: 'alert',
                    });
                } else if (budgetUsedPct >= (op.alertThresholds?.budgetWarning || 80)) {
                    op.logs.push({
                        timestamp: new Date().toISOString(),
                        message: `Budget warning: ${budgetUsedPct.toFixed(1)}% used ($${op.spent.toFixed(2)}/$${op.budget})`,
                        type: 'warning',
                    });
                }

                storeOp(op);
                return NextResponse.json({
                    success: true,
                    spent: op.spent,
                    remaining: op.budget - op.spent,
                    budgetUsedPct: budgetUsedPct.toFixed(1),
                    status: op.status,
                });
            }

            default:
                return NextResponse.json({ error: 'invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- In-memory store (production: use Prisma) ---

interface AutonomousOp {
    id: string;
    walletAddress: string;
    agentId: string;
    goal: string;
    budget: number;
    spent: number;
    duration: number;
    status: 'running' | 'paused' | 'stopped' | 'completed' | 'budget_exhausted';
    alertThresholds: { budgetWarning: number; budgetCritical: number };
    checkInterval: number;
    createdAt: string;
    lastCheckAt: string | null;
    logs: Array<{ timestamp: string; message: string; type: string }>;
    results: Array<{ timestamp: string; data: any }>;
}

const opsStore = new Map<string, AutonomousOp>();

function storeOp(op: AutonomousOp) { opsStore.set(op.id, op); }
function getOp(id: string): AutonomousOp | undefined { return opsStore.get(id); }
function getOpsForWallet(wallet: string, status?: string): AutonomousOp[] {
    const all = Array.from(opsStore.values()).filter(o => o.walletAddress.toLowerCase() === wallet.toLowerCase());
    if (status) return all.filter(o => o.status === status);
    return all;
}
