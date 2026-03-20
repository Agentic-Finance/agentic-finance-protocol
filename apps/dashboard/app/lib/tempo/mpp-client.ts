/**
 * MPP Client — Machine Payments Protocol (Tempo + Stripe)
 * Allows Agentic Finance agents to pay for external services.
 *
 * MPP is an open standard co-authored by Stripe and Tempo for
 * machine-to-machine payments. It supports:
 *   - One-time charge intents (~500ms settlement)
 *   - Pay-as-you-go sessions with spending limits
 *   - Streamed micropayments over SSE
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
}

export interface MppSession {
  sessionId: string;
  serviceUrl: string;
  spendingLimit: bigint;
  spent: bigint;
  token: Address;
  expiresAt: number;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled';
}

// ── Charge Intents ────────────────────────────────────────

/** Create a one-time charge intent (agent pays service) */
export async function createChargeIntent(params: {
  serviceUrl: string;
  amount: bigint;
  token: Address;
  memo?: string;
}): Promise<MppChargeIntent> {
  return {
    intentId: `mpp_ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    serviceUrl: params.serviceUrl,
    amount: params.amount,
    token: params.token,
    memo: params.memo || '',
    status: 'pending',
    createdAt: Date.now(),
  };
}

/** Authorize a pending charge intent */
export function authorizeIntent(intent: MppChargeIntent): MppChargeIntent {
  return { ...intent, status: 'authorized' };
}

/** Mark intent as settled with TX hash */
export function settleIntent(intent: MppChargeIntent, txHash: Hex): MppChargeIntent {
  return { ...intent, status: 'settled', txHash };
}

// ── Sessions (OAuth for Money) ────────────────────────────

/** Create a pay-as-you-go session — authorize a spending limit upfront */
export async function createSession(params: {
  serviceUrl: string;
  spendingLimit: bigint;
  token: Address;
  durationMs?: number;
}): Promise<MppSession> {
  return {
    sessionId: `mpp_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    serviceUrl: params.serviceUrl,
    spendingLimit: params.spendingLimit,
    spent: BigInt(0),
    token: params.token,
    expiresAt: Date.now() + (params.durationMs || 3600000),
    status: 'active',
  };
}

/** Stream a micropayment within a session */
export function streamPayment(session: MppSession, amount: bigint): {
  session: MppSession;
  remaining: bigint;
} {
  if (session.status !== 'active') throw new Error('Session not active');
  if (Date.now() > session.expiresAt) throw new Error('Session expired');

  const newSpent = session.spent + amount;
  if (newSpent > session.spendingLimit) throw new Error('Spending limit exceeded');

  const updated: MppSession = {
    ...session,
    spent: newSpent,
    status: newSpent >= session.spendingLimit ? 'exhausted' : 'active',
  };

  return { session: updated, remaining: session.spendingLimit - newSpent };
}

/** Check if a session can handle a payment */
export function canPay(session: MppSession, amount: bigint): boolean {
  if (session.status !== 'active') return false;
  if (Date.now() > session.expiresAt) return false;
  return (session.spent + amount) <= session.spendingLimit;
}

/** Cancel a session — remaining funds returned to payer */
export function cancelSession(session: MppSession): MppSession {
  return { ...session, status: 'cancelled' };
}
