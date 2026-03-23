import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const RPC_URL = process.env.RPC_URL || 'https://rpc.moderato.tempo.xyz';
const TOKEN_ADDRESS = '0x20c0000000000000000000000000000000000001';
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

/**
 * POST /api/conditional-payroll/evaluate
 *
 * Autonomous Condition Evaluator — checks ALL "Watching" rules
 * against real on-chain data and triggers matching ones.
 *
 * Called by:
 *   1. Dashboard polling (every 60s when admin is online)
 *   2. Daemon cron job (every 5 min)
 *   3. Manual "Evaluate All" button
 *
 * Condition types evaluated:
 *   - date_time: Compare against current timestamp
 *   - wallet_balance: Query on-chain balance via RPC
 *   - price_feed: Check token price (placeholder — needs oracle)
 *   - webhook: Call external URL and check response
 *   - tvl_threshold: Placeholder for DeFi TVL
 */
export async function POST() {
    try {
        const rules = await prisma.conditionalRule.findMany({
            where: { status: 'Watching' },
        });

        if (rules.length === 0) {
            return NextResponse.json({ success: true, evaluated: 0, triggered: 0, results: [] });
        }

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const results: Array<{ ruleId: string; name: string; matched: boolean; reason: string }> = [];
        let triggeredCount = 0;

        for (const rule of rules) {
            // Check cooldown
            if (rule.triggeredAt && rule.cooldownMinutes > 0) {
                const cooldownMs = rule.cooldownMinutes * 60 * 1000;
                const elapsed = Date.now() - new Date(rule.triggeredAt).getTime();
                if (elapsed < cooldownMs) {
                    results.push({ ruleId: rule.id, name: rule.name, matched: false, reason: `Cooldown: ${Math.ceil((cooldownMs - elapsed) / 60000)}min remaining` });
                    continue;
                }
            }

            // Check max triggers
            if (rule.maxTriggers > 0 && rule.triggerCount >= rule.maxTriggers) {
                results.push({ ruleId: rule.id, name: rule.name, matched: false, reason: 'Max triggers reached' });
                continue;
            }

            const conditions = JSON.parse(rule.conditions);
            const logic = rule.conditionLogic; // AND or OR

            const condResults: boolean[] = [];

            for (const cond of conditions) {
                const matched = await evaluateCondition(cond, provider);
                condResults.push(matched);
            }

            const allMatch = logic === 'AND'
                ? condResults.every(Boolean)
                : condResults.some(Boolean);

            if (allMatch) {
                // TRIGGER the rule
                await triggerRule(rule);
                triggeredCount++;
                results.push({ ruleId: rule.id, name: rule.name, matched: true, reason: `All ${conditions.length} conditions met → triggered` });
            } else {
                const failedCount = condResults.filter(r => !r).length;
                results.push({ ruleId: rule.id, name: rule.name, matched: false, reason: `${failedCount}/${conditions.length} conditions not met` });
            }
        }

        console.log(`🔍 [Conditional] Evaluated ${rules.length} rules → ${triggeredCount} triggered`);

        return NextResponse.json({
            success: true,
            evaluated: rules.length,
            triggered: triggeredCount,
            results,
            evaluatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('🚨 [Conditional Evaluate] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * Evaluate a single condition against real data
 */
async function evaluateCondition(
    cond: { type: string; param: string; operator: string; value: string },
    provider: ethers.JsonRpcProvider,
): Promise<boolean> {
    try {
        switch (cond.type) {
            case 'date_time': {
                const now = new Date();
                const targetDate = new Date(cond.value);
                if (isNaN(targetDate.getTime())) return false;
                return compareValues(now.getTime(), targetDate.getTime(), cond.operator);
            }

            case 'wallet_balance': {
                const walletAddress = cond.param;
                if (!ethers.isAddress(walletAddress)) return false;

                const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
                const balance = await token.balanceOf(walletAddress);
                const balanceNum = parseFloat(ethers.formatUnits(balance, 6));

                const targetValue = parseFloat(cond.value.replace(/[$,]/g, ''));
                if (isNaN(targetValue)) return false;

                return compareValues(balanceNum, targetValue, cond.operator);
            }

            case 'price_feed': {
                // Placeholder: AlphaUSD is pegged to $1.00 on testnet
                // In production, this would query Chainlink/Pyth oracle
                const currentPrice = 1.0;
                const targetPrice = parseFloat(cond.value.replace(/[$,]/g, ''));
                if (isNaN(targetPrice)) return false;
                return compareValues(currentPrice, targetPrice, cond.operator);
            }

            case 'webhook': {
                if (!cond.param.startsWith('http')) return false;
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);
                    const res = await fetch(cond.param, { signal: controller.signal });
                    clearTimeout(timeout);
                    const data = await res.json();
                    return !!data?.result || !!data?.success || !!data?.triggered;
                } catch {
                    return false;
                }
            }

            case 'tvl_threshold': {
                // Placeholder — would query DeFi protocol TVL
                return false;
            }

            default:
                return false;
        }
    } catch (error) {
        console.error(`[Condition Eval] Error evaluating ${cond.type}:`, error);
        return false;
    }
}

/**
 * Compare two numeric values with an operator
 */
function compareValues(actual: number, target: number, operator: string): boolean {
    switch (operator) {
        case '>=': return actual >= target;
        case '<=': return actual <= target;
        case '==': return Math.abs(actual - target) < 0.001;
        case '>':  return actual > target;
        case '<':  return actual < target;
        default:   return false;
    }
}

/**
 * Trigger a conditional rule — push recipients to Boardroom
 */
async function triggerRule(rule: any) {
    const recipients = JSON.parse(rule.recipients);

    let workspace = await prisma.workspace.findFirst();
    if (!workspace) {
        workspace = await prisma.workspace.create({
            data: { name: 'Agentic Finance Hub', adminWallet: '0x000' },
        });
    }

    const operations = recipients.map((r: any) =>
        prisma.timeVaultPayload.create({
            data: {
                workspaceId: workspace!.id,
                name: r.name || 'Unknown',
                recipientWallet: r.wallet || '0x0000000000000000000000000000000000000000',
                amount: parseFloat(r.amount) || 0,
                token: r.token || 'AlphaUSD',
                note: `⚡ [Auto-Triggered] ${rule.name} — ${r.note || ''}`.trim(),
                status: 'Draft',
            },
        })
    );

    await prisma.$transaction(operations);

    const newTriggerCount = rule.triggerCount + 1;
    const newStatus = (rule.maxTriggers > 0 && newTriggerCount >= rule.maxTriggers)
        ? 'Triggered'
        : 'Watching';

    await prisma.conditionalRule.update({
        where: { id: rule.id },
        data: {
            triggerCount: { increment: 1 },
            triggeredAt: new Date(),
            status: newStatus,
        },
    });

    console.log(`⚡ [Auto-Trigger] "${rule.name}" → ${recipients.length} payloads queued`);
}
