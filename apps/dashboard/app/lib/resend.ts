import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

export const resend = new Resend(RESEND_API_KEY);

// Default sender — use Resend's free onboarding domain
export const FROM_EMAIL = 'Agentic Finance <onboarding@resend.dev>';

export type NotificationType =
    | 'payout_completed'
    | 'payout_failed'
    | 'low_balance'
    | 'workspace_created'
    | 'employee_added'
    | 'daemon_status';

interface NotificationPayload {
    type: NotificationType;
    workspaceName: string;
    data: Record<string, any>;
}

/** Send a notification email */
export async function sendNotificationEmail(
    to: string,
    payload: NotificationPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!RESEND_API_KEY) {
        console.warn('[Resend] No API key configured');
        return { success: false, error: 'No API key' };
    }

    const { subject, html } = buildEmailContent(payload);

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });

        if (result.error) {
            return { success: false, error: result.error.message };
        }
        return { success: true, id: result.data?.id };
    } catch (err: any) {
        console.error('[Resend] Send failed:', err.message);
        return { success: false, error: err.message };
    }
}

function buildEmailContent(payload: NotificationPayload): { subject: string; html: string } {
    const { type, workspaceName, data } = payload;

    switch (type) {
        case 'payout_completed':
            return {
                subject: `Payout Completed - ${data.amount} ${data.token} sent`,
                html: emailTemplate(workspaceName, `
                    <h2 style="color: #0D9473;">Payout Completed</h2>
                    <p><strong>${data.amount} ${data.token}</strong> has been successfully sent to <strong>${data.recipientCount || 1}</strong> recipient(s).</p>
                    ${data.txHash ? `<p style="font-size: 12px; color: #888;">TX: <a href="https://explore.moderato.tempo.xyz/tx/${data.txHash}" style="color: #0F7FA3;">${data.txHash.slice(0, 16)}...</a></p>` : ''}
                    ${data.isShielded ? '<p style="font-size: 12px; color: #D6166B;">ZK-Shielded transfer</p>' : ''}
                `),
            };
        case 'low_balance':
            return {
                subject: `Low Vault Balance - ${workspaceName}`,
                html: emailTemplate(workspaceName, `
                    <h2 style="color: #C85A1F;">Low Balance Alert</h2>
                    <p>Your platform vault balance is <strong>${data.balance} ${data.token}</strong>.</p>
                    <p>Consider topping up to ensure payroll can continue processing.</p>
                `),
            };
        case 'workspace_created':
            return {
                subject: `Welcome to Agentic Finance - ${workspaceName}`,
                html: emailTemplate(workspaceName, `
                    <h2 style="color: #0D9473;">Welcome!</h2>
                    <p>Your workspace <strong>${workspaceName}</strong> has been created on Tempo L1.</p>
                    <p>Next steps:</p>
                    <ul>
                        <li>Fund your vault with AlphaUSD</li>
                        <li>Add team members</li>
                        <li>Run your first payroll</li>
                    </ul>
                    <p><a href="https://agt.finance/?app=1" style="color: #0F7FA3;">Go to Dashboard</a></p>
                `),
            };
        case 'employee_added':
            return {
                subject: `You've been added to ${workspaceName} on Agentic Finance`,
                html: emailTemplate(workspaceName, `
                    <h2>You've been added to a workspace</h2>
                    <p>The workspace <strong>${workspaceName}</strong> has added your wallet for payroll.</p>
                    <p>You'll receive salary payments directly to your wallet on Tempo L1.</p>
                    <p><a href="https://agt.finance/?app=1" style="color: #0F7FA3;">View your earnings</a></p>
                `),
            };
        default:
            return {
                subject: `Notification from ${workspaceName}`,
                html: emailTemplate(workspaceName, `<p>${JSON.stringify(data)}</p>`),
            };
    }
}

function emailTemplate(workspaceName: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; padding: 40px 20px; margin: 0;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
            <div style="padding: 24px 32px; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 16px; color: #1a1a2e;">Agentic Finance</strong>
                    <span style="font-size: 11px; color: #888; background: #f0f0f0; padding: 2px 8px; border-radius: 100px;">${workspaceName}</span>
                </div>
            </div>
            <div style="padding: 32px; color: #333; line-height: 1.6; font-size: 14px;">
                ${content}
            </div>
            <div style="padding: 16px 32px; background: #fafafa; border-top: 1px solid #f0f0f0; font-size: 11px; color: #999; text-align: center;">
                Agentic Finance on Tempo L1 | <a href="https://agt.finance" style="color: #999;">agt.finance</a>
            </div>
        </div>
    </body>
    </html>`;
}
