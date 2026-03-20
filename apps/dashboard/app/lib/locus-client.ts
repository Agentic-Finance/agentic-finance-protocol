/**
 * Locus API Client — AI Agent Payment Infrastructure
 * https://docs.paywithlocus.com
 *
 * Provides: USDC transfers, Laso Finance (prepaid cards, Venmo/PayPal),
 * Checkout, and pay-per-use wrapped APIs.
 */

const LOCUS_BASE = 'https://api.paywithlocus.com/api';

function getApiKey(): string {
  const key = process.env.LOCUS_API_KEY;
  if (!key) throw new Error('LOCUS_API_KEY not set');
  return key;
}

function headers(): HeadersInit {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

async function locusRequest<T = any>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: Record<string, any>,
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const url = `${LOCUS_BASE}${path}`;
  const opts: RequestInit = {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const res = await fetch(url, opts);
  const json = await res.json();

  if (!res.ok && res.status !== 202) {
    return { success: false, error: json.error || 'unknown', message: json.message || res.statusText };
  }

  return json;
}

// ── USDC Transfers ───────────────────────────────────────

export interface LocusTransaction {
  id: string;
  to_address?: string;
  amount: string;
  memo?: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'POLICY_REJECTED' | 'CANCELLED' | 'EXPIRED' | 'PENDING_APPROVAL';
  category?: string;
  created_at?: string;
  tx_hash?: string;
  approval_url?: string;
}

/** Send USDC to a wallet address */
export async function sendPayment(params: {
  to_address: string;
  amount: string;
  memo?: string;
}) {
  return locusRequest<LocusTransaction>('POST', '/pay/send', params);
}

/** Send USDC via email escrow */
export async function sendEmailPayment(params: {
  email: string;
  amount: string;
  memo?: string;
  expires_in_days?: number;
}) {
  return locusRequest<LocusTransaction>('POST', '/pay/send-email', params);
}

/** Get wallet USDC balance */
export async function getBalance() {
  return locusRequest<{ balance: string; address: string }>('GET', '/pay/balance');
}

/** List transactions */
export async function getTransactions(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  category?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return locusRequest<{ transactions: LocusTransaction[] }>('GET', `/pay/transactions${query}`);
}

/** Get single transaction detail */
export async function getTransaction(txId: string) {
  return locusRequest<LocusTransaction>('GET', `/pay/transactions/${txId}`);
}

// ── Laso Finance (Prepaid Cards + Venmo/PayPal) ──────────

/** Authenticate with Laso Finance (cost: $0.001) */
export async function lasoAuth() {
  return locusRequest('POST', '/x402/laso-auth');
}

/** Order a prepaid Visa card ($5-$1000, US only) */
export async function lasoGetCard(params: {
  amount: number;
  merchant?: string;
}) {
  return locusRequest('POST', '/x402/laso-get-card', params);
}

/** Send payment via Venmo or PayPal */
export async function lasoSendPayment(params: {
  method: 'venmo' | 'paypal';
  recipient: string; // phone for Venmo, email for PayPal
  amount: number;
  note?: string;
}) {
  return locusRequest('POST', '/x402/laso-send-payment', params);
}

// ── Checkout (Accept USDC Payments) ──────────────────────

export interface CheckoutPayment {
  id: string;
  amount: string;
  status: string;
  payer_email?: string;
  created_at?: string;
}

/** Preflight check for a checkout session */
export async function checkoutPreflight(sessionId: string) {
  return locusRequest('GET', `/checkout/agent/preflight/${sessionId}`);
}

/** Process a checkout payment */
export async function checkoutPay(sessionId: string, payerEmail: string) {
  return locusRequest<CheckoutPayment>('POST', `/checkout/agent/pay/${sessionId}`, {
    payerEmail,
  });
}

/** Check payment status */
export async function checkoutPaymentStatus(txId: string) {
  return locusRequest<CheckoutPayment>('GET', `/checkout/agent/payments/${txId}`);
}

/** List checkout payments */
export async function checkoutPayments() {
  return locusRequest<{ payments: CheckoutPayment[] }>('GET', '/checkout/agent/payments');
}

// ── Wrapped APIs (Pay-Per-Use) ───────────────────────────

/** List available wrapped API providers */
export async function wrappedProviders() {
  return locusRequest('GET', '/wrapped/md');
}

/** Call a wrapped API endpoint */
export async function callWrappedApi(provider: string, endpoint: string, body?: Record<string, any>) {
  return locusRequest('POST', `/wrapped/${provider}/${endpoint}`, body);
}

// ── x402 Pay-Per-Call ────────────────────────────────────

/** Call an x402 endpoint by slug */
export async function x402Call(slug: string, body?: Record<string, any>) {
  return locusRequest('POST', `/x402/${slug}`, body);
}

/** Ad-hoc x402 call to any URL */
export async function x402AdHocCall(params: {
  url: string;
  method?: 'GET' | 'POST';
  body?: Record<string, any>;
}) {
  return locusRequest('POST', '/x402/call', params);
}

/** Get x402 transaction history */
export async function x402Transactions() {
  return locusRequest('GET', '/x402/transactions');
}

// ── Feedback ─────────────────────────────────────────────

export async function submitFeedback(params: {
  category: 'error' | 'general' | 'endpoint' | 'suggestion';
  message: string;
  endpoint?: string;
  context?: Record<string, any>;
}) {
  return locusRequest('POST', '/feedback', params);
}
