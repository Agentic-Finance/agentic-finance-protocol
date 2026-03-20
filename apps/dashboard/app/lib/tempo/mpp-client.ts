/**
 * MPP Client — Machine Payments Protocol
 * Powered by Locus (paywithlocus.com) + Laso Finance
 *
 * Capabilities:
 *   - One-time USDC charge intents via Locus
 *   - Pay-as-you-go sessions with spending limits
 *   - Laso Finance: Prepaid Visa cards, Venmo/PayPal payments
 *   - Pay-per-use API access (32+ providers)
 */
import { type Address, type Hex } from 'viem';

// ── Types ─────────────────────────────────────────────────

export interface MppChargeIntent {
  intentId: string;
  serviceUrl: string;
  amount: bigint;
  token: Address;
  memo: string;
  status: 'pending' | 'authorized' | 'settled' | 'expired';
  createdAt: number;
  txHash?: Hex;
  locusTxId?: string;
  approvalUrl?: string;
}

export interface MppSession {
  sessionId: string;
  serviceUrl: string;
  spendingLimit: bigint;
  spent: bigint;
  token: Address;
  expiresAt: number;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled';
  payments?: { amount: string; locusTxId?: string; timestamp: number }[];
}

// ── Client-side API calls ─────────────────────────────────

/** Create a charge intent (calls backend which uses Locus) */
export async function createChargeIntent(params: {
  serviceUrl: string;
  amount: string;
  token?: Address;
  memo?: string;
  recipientAddress?: string;
}): Promise<{ success: boolean; intent?: any; error?: string }> {
  const res = await fetch('/api/mpp/charge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

/** List charge intents */
export async function listChargeIntents(): Promise<{ success: boolean; intents: any[]; source?: string }> {
  const res = await fetch('/api/mpp/charge');
  return res.json();
}

/** Create a pay-as-you-go session */
export async function createSession(params: {
  serviceUrl: string;
  spendingLimit: string;
  token?: Address;
  durationMs?: number;
  recipientAddress?: string;
}): Promise<{ success: boolean; session?: any; error?: string }> {
  const res = await fetch('/api/mpp/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

/** List sessions */
export async function listSessions(): Promise<{ success: boolean; sessions: any[]; walletBalance?: string; source?: string }> {
  const res = await fetch('/api/mpp/session');
  return res.json();
}

/** Stream a micropayment within a session */
export async function streamPayment(sessionId: string, amount: string): Promise<{ success: boolean; session?: any; error?: string }> {
  const res = await fetch('/api/mpp/session', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, addSpent: amount }),
  });
  return res.json();
}

/** Cancel a session */
export async function cancelSession(sessionId: string): Promise<{ success: boolean; session?: any; error?: string }> {
  const res = await fetch('/api/mpp/session', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, cancel: true }),
  });
  return res.json();
}

/** Get wallet balance */
export async function getBalance(): Promise<{ success: boolean; balance: string; address?: string; source?: string }> {
  const res = await fetch('/api/mpp/balance');
  return res.json();
}

/** Laso Finance: Auth */
export async function lasoAuth(): Promise<any> {
  const res = await fetch('/api/mpp/laso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'auth' }),
  });
  return res.json();
}

/** Laso Finance: Order prepaid Visa card */
export async function lasoGetCard(amount: number, merchant?: string): Promise<any> {
  const res = await fetch('/api/mpp/laso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'card', amount, merchant }),
  });
  return res.json();
}

/** Laso Finance: Send Venmo/PayPal payment */
export async function lasoSendPayment(params: {
  method: 'venmo' | 'paypal';
  recipient: string;
  amount: number;
  note?: string;
}): Promise<any> {
  const res = await fetch('/api/mpp/laso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'pay', ...params }),
  });
  return res.json();
}

/** Check if a session can handle a payment */
export function canPay(session: MppSession, amount: bigint): boolean {
  if (session.status !== 'active') return false;
  if (Date.now() > session.expiresAt) return false;
  return (session.spent + amount) <= session.spendingLimit;
}
