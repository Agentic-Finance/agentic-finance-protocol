import { NextResponse } from 'next/server';
import { sendTelegramMessage, getBotInfo, getUpdates, notifyPayout, notifyLowBalance } from '@/app/lib/telegram';

export const dynamic = 'force-dynamic';

// In-memory store: wallet → chatId mapping (production: use DB)
const walletChatMap: Map<string, string> = new Map();

/** GET: Bot info + check connection */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
        const bot = await getBotInfo();
        return NextResponse.json({
            success: true,
            connected: !!bot,
            botUsername: bot?.username || null,
            botName: bot?.first_name || null,
            registeredWallets: walletChatMap.size,
        });
    }

    if (action === 'updates') {
        const updates = await getUpdates();
        // Auto-link: if user sends /start <wallet>, link their chat_id
        for (const update of updates) {
            const msg = update.message;
            if (msg?.text?.startsWith('/start')) {
                const wallet = msg.text.split(' ')[1]?.trim();
                if (wallet && wallet.startsWith('0x')) {
                    walletChatMap.set(wallet.toLowerCase(), String(msg.chat.id));
                    await sendTelegramMessage(msg.chat.id, [
                        `<b>Connected to Agentic Finance</b>`,
                        ``,
                        `Wallet: <code>${wallet.slice(0, 10)}...${wallet.slice(-6)}</code>`,
                        ``,
                        `You'll receive real-time alerts for payroll events.`,
                    ].join('\n'));
                } else {
                    await sendTelegramMessage(msg.chat.id, [
                        `<b>Welcome to Agentic Finance Bot</b>`,
                        ``,
                        `To connect your wallet, use this link from your dashboard:`,
                        `<code>/start 0xYourWalletAddress</code>`,
                        ``,
                        `Or connect via the Notification settings in your dashboard.`,
                    ].join('\n'));
                }
            }
        }
        return NextResponse.json({ success: true, processed: updates.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/** POST: Send notification or link wallet */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, wallet, chatId, type, data, workspaceName } = body;

        // Link wallet to chat
        if (action === 'link' && wallet && chatId) {
            walletChatMap.set(wallet.toLowerCase(), String(chatId));
            await sendTelegramMessage(chatId, `<b>Linked!</b> Wallet <code>${wallet.slice(0, 10)}...</code> connected to Agentic Finance notifications.`);
            return NextResponse.json({ success: true });
        }

        // Send notification by wallet
        if (action === 'notify' && wallet) {
            const targetChatId = walletChatMap.get(wallet.toLowerCase());
            if (!targetChatId) {
                return NextResponse.json({ success: false, error: 'Wallet not linked to Telegram' });
            }

            if (type === 'payout_completed') {
                await notifyPayout(targetChatId, { ...data, workspaceName: workspaceName || 'Agentic Finance' });
            } else if (type === 'low_balance') {
                await notifyLowBalance(targetChatId, { ...data, workspaceName: workspaceName || 'Agentic Finance' });
            } else {
                await sendTelegramMessage(targetChatId, `<b>${type}</b>\n${JSON.stringify(data || {})}`);
            }

            return NextResponse.json({ success: true });
        }

        // Direct send by chatId
        if (chatId && body.message) {
            const ok = await sendTelegramMessage(chatId, body.message);
            return NextResponse.json({ success: ok });
        }

        return NextResponse.json({ error: 'Missing action or params' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
