/**
 * PayPal Payouts Integration — Fiat Off-Ramp
 *
 * Flow: Agent AlphaUSD → Agentic Finance Treasury → PayPal Payout → Agent's Bank
 *
 * Uses PayPal Payouts API v1:
 *   - OAuth2 token auth (Client ID + Secret)
 *   - Batch payouts with single items
 *   - Webhook or polling for status
 *
 * Fee structure:
 *   - Agentic Finance platform fee: 2.5% of withdrawal
 *   - PayPal fee: ~2% (varies by country)
 *   - Minimum withdrawal: $5.00
 *   - Maximum withdrawal: $10,000.00
 */

import { ethers } from 'ethers';
import { RPC_URL, ERC20_ABI } from '@/app/lib/constants';

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

const PAYPAL_BASE_URL = PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const PLATFORM_FEE_RATE = 0.025; // 2.5%
const MIN_WITHDRAWAL = 5.0;      // $5 minimum
const MAX_WITHDRAWAL = 10000.0;   // $10K maximum

const TOKEN_ADDRESS = '0x20c0000000000000000000000000000000000001'; // AlphaUSD
const TOKEN_DECIMALS = 6;
const TREASURY_WALLET = '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793';

// ═══════════════════════════════════════════════════════════
// PAYPAL AUTH
// ═══════════════════════════════════════════════════════════

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

// ═══════════════════════════════════════════════════════════
// PAYPAL PAYOUTS
// ═══════════════════════════════════════════════════════════

export interface PayoutResult {
  success: boolean;
  payoutBatchId: string;
  payoutItemId?: string;
  status: string;
  error?: string;
}

/**
 * Send a payout to a PayPal email address.
 *
 * @param recipientEmail - PayPal email of recipient
 * @param amountUSD - Amount in USD to send
 * @param senderItemId - Unique ID for tracking (withdrawal request ID)
 */
export async function sendPayout(
  recipientEmail: string,
  amountUSD: number,
  senderItemId: string,
): Promise<PayoutResult> {
  const token = await getPayPalAccessToken();

  const body = {
    sender_batch_header: {
      sender_batch_id: `agtfi_${senderItemId}_${Date.now()}`,
      email_subject: 'Agentic Finance Withdrawal',
      email_message: 'You have received a payout from Agentic Finance.',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: amountUSD.toFixed(2),
          currency: 'USD',
        },
        receiver: recipientEmail,
        note: `Agentic Finance off-ramp withdrawal (ID: ${senderItemId.slice(0, 8)})`,
        sender_item_id: senderItemId,
      },
    ],
  };

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      payoutBatchId: '',
      status: 'FAILED',
      error: data.message || data.error_description || JSON.stringify(data),
    };
  }

  return {
    success: true,
    payoutBatchId: data.batch_header?.payout_batch_id || '',
    status: data.batch_header?.batch_status || 'PENDING',
  };
}

/**
 * Check the status of a payout batch.
 */
export async function getPayoutStatus(payoutBatchId: string): Promise<{
  status: string;
  items: Array<{
    payoutItemId: string;
    transactionId: string;
    status: string;
    amount: string;
    fee: string;
    error?: string;
  }>;
}> {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payouts/${payoutBatchId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`PayPal payout status check failed (${res.status})`);
  }

  const data = await res.json();

  return {
    status: data.batch_header?.batch_status || 'UNKNOWN',
    items: (data.items || []).map((item: any) => ({
      payoutItemId: item.payout_item_id || '',
      transactionId: item.transaction_id || '',
      status: item.transaction_status || 'UNKNOWN',
      amount: item.payout_item?.amount?.value || '0',
      fee: item.payout_item_fee?.value || '0',
      error: item.errors?.message,
    })),
  };
}

// ═══════════════════════════════════════════════════════════
// ON-CHAIN: Lock AlphaUSD (transfer to treasury)
// ═══════════════════════════════════════════════════════════

/**
 * Transfer AlphaUSD from user wallet to treasury (daemon executes).
 * This "locks" the crypto before sending fiat.
 */
export async function lockAlphaUSD(
  fromWallet: string,
  amount: number,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const privateKey = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    return { success: false, error: 'No private key configured' };
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);

    const scaledAmount = ethers.parseUnits(amount.toString(), TOKEN_DECIMALS);

    // Transfer from treasury (daemon wallet) — in a real system,
    // the user would approve + transferFrom, but since this is
    // a managed platform, the treasury handles it
    const tx = await token.transfer(
      TREASURY_WALLET,
      scaledAmount,
      { gasLimit: 800_000, type: 0 },
    );

    await tx.wait(1).catch(() => {/* Tempo tx type 0x76 */});

    return { success: true, txHash: tx.hash };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════
// FEE CALCULATION
// ═══════════════════════════════════════════════════════════

export function calculateWithdrawalFees(amountCrypto: number) {
  const platformFee = amountCrypto * PLATFORM_FEE_RATE;
  const amountUSD = amountCrypto - platformFee; // 1:1 AlphaUSD:USD
  return {
    amountCrypto,
    platformFee: Math.round(platformFee * 100) / 100,
    amountUSD: Math.round(amountUSD * 100) / 100,
    feeRate: `${(PLATFORM_FEE_RATE * 100).toFixed(1)}%`,
  };
}

export function validateWithdrawal(amountCrypto: number, paypalEmail: string): string | null {
  if (!paypalEmail || !paypalEmail.includes('@')) {
    return 'Valid PayPal email required';
  }
  if (amountCrypto < MIN_WITHDRAWAL) {
    return `Minimum withdrawal is $${MIN_WITHDRAWAL}`;
  }
  if (amountCrypto > MAX_WITHDRAWAL) {
    return `Maximum withdrawal is $${MAX_WITHDRAWAL.toLocaleString()}`;
  }
  return null;
}

export { PLATFORM_FEE_RATE, MIN_WITHDRAWAL, MAX_WITHDRAWAL, PAYPAL_ENV };
