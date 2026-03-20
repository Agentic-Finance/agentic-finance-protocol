/**
 * Telegram Bot — Real-time notifications via @AgenticFinance_bot
 *
 * Users connect by sending /start to the bot.
 * The bot stores their chat_id linked to their wallet address.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/** Send a message to a Telegram chat */
export async function sendTelegramMessage(
    chatId: string | number,
    text: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
    if (!BOT_TOKEN) {
        console.warn('[Telegram] No bot token configured');
        return false;
    }

    try {
        const res = await fetch(`${API_BASE}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: parseMode,
                disable_web_page_preview: true,
            }),
        });
        const data = await res.json();
        return data.ok === true;
    } catch (err) {
        console.error('[Telegram] Send failed:', err);
        return false;
    }
}

/** Send a payout notification */
export async function notifyPayout(chatId: string | number, data: {
    amount: number | string;
    token: string;
    recipientCount: number;
    isShielded: boolean;
    txHash?: string;
    workspaceName: string;
}): Promise<boolean> {
    const shieldBadge = data.isShielded ? ' [ZK-Shielded]' : '';
    const txLink = data.txHash
        ? `\n<a href="https://explore.moderato.tempo.xyz/tx/${data.txHash}">View on Explorer</a>`
        : '';

    return sendTelegramMessage(chatId, [
        `<b>Payout Completed</b>${shieldBadge}`,
        ``,
        `Amount: <b>${data.amount} ${data.token}</b>`,
        `Recipients: ${data.recipientCount}`,
        `Workspace: ${data.workspaceName}`,
        txLink,
    ].filter(Boolean).join('\n'));
}

/** Send a low balance alert */
export async function notifyLowBalance(chatId: string | number, data: {
    balance: string;
    token: string;
    workspaceName: string;
}): Promise<boolean> {
    return sendTelegramMessage(chatId, [
        `<b>Low Balance Alert</b>`,
        ``,
        `Vault balance: <b>${data.balance} ${data.token}</b>`,
        `Workspace: ${data.workspaceName}`,
        ``,
        `<i>Top up your vault to continue processing payroll.</i>`,
    ].join('\n'));
}

/** Get bot info (test connection) */
export async function getBotInfo(): Promise<any> {
    if (!BOT_TOKEN) return null;
    try {
        const res = await fetch(`${API_BASE}/getMe`);
        const data = await res.json();
        return data.ok ? data.result : null;
    } catch {
        return null;
    }
}

/** Get recent updates (for linking chat_id to wallet) */
export async function getUpdates(offset?: number): Promise<any[]> {
    if (!BOT_TOKEN) return [];
    try {
        const url = offset
            ? `${API_BASE}/getUpdates?offset=${offset}&timeout=0`
            : `${API_BASE}/getUpdates?timeout=0`;
        const res = await fetch(url);
        const data = await res.json();
        return data.ok ? data.result : [];
    } catch {
        return [];
    }
}
