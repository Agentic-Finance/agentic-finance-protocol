/**
 * x402 Payment Protocol Implementation
 *
 * HTTP 402 Payment Required — enables AI agents to auto-pay for services.
 *
 * Flow:
 * 1. Agent calls PayPol API without payment → receives 402 with payment requirements
 * 2. Agent creates payment proof (signed message with payment details)
 * 3. Agent retries with X-Payment header containing the proof
 * 4. PayPol verifies payment, executes request, records usage
 *
 * Compatible with Coinbase x402 standard with PayPol extensions.
 */

import { ethers } from 'ethers';
import prisma from '@/app/lib/prisma';

// ── x402 Types ─────────────────────────────────────────────

export interface X402PaymentRequirement {
  /** x402 protocol version */
  version: '1.0';
  /** Network chain ID */
  chainId: number;
  /** Token address for payment */
  token: string;
  /** Token symbol */
  tokenSymbol: string;
  /** Amount required (in token decimals) */
  amount: string;
  /** Recipient wallet (PayPol treasury) */
  recipient: string;
  /** What the payment is for */
  description: string;
  /** Payment deadline (ISO 8601) */
  expiresAt: string;
  /** Unique payment nonce */
  nonce: string;
  /** Supported payment methods */
  paymentMethods: ('signed-message' | 'metering-session' | 'api-key')[];
  /** Optional: metering session can be used instead */
  meteringSessionEndpoint?: string;
}

export interface X402PaymentProof {
  /** Payment version */
  version: '1.0';
  /** Payer wallet address */
  payer: string;
  /** EIP-191 signature of payment hash */
  signature: string;
  /** Payment nonce (must match requirement) */
  nonce: string;
  /** Amount being paid */
  amount: string;
  /** Token address */
  token: string;
  /** Optional metering session ID */
  meteringSessionId?: string;
}

// ── Payment Record (in-memory cache + DB) ──────────────────

const paymentNonces = new Map<string, { expiresAt: number; used: boolean }>();

export function generateNonce(): string {
  const nonce = `x402-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  paymentNonces.set(nonce, {
    expiresAt: Date.now() + 5 * 60_000, // 5 min expiry
    used: false,
  });
  return nonce;
}

export function validateNonce(nonce: string): boolean {
  const entry = paymentNonces.get(nonce);
  if (!entry) return false;
  if (entry.used) return false;
  if (Date.now() > entry.expiresAt) {
    paymentNonces.delete(nonce);
    return false;
  }
  return true;
}

export function consumeNonce(nonce: string): void {
  const entry = paymentNonces.get(nonce);
  if (entry) entry.used = true;
}

// Cleanup expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of paymentNonces) {
    if (now > val.expiresAt) paymentNonces.delete(key);
  }
}, 60_000);

// ── Payment Requirement Generator ──────────────────────────

const TREASURY_WALLET = '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793';
const DEFAULT_TOKEN = '0x20c0000000000000000000000000000000000001'; // AlphaUSD
const CHAIN_ID = 42431;

export function createPaymentRequirement(
  amount: number,
  description: string,
): X402PaymentRequirement {
  return {
    version: '1.0',
    chainId: CHAIN_ID,
    token: DEFAULT_TOKEN,
    tokenSymbol: 'AlphaUSD',
    amount: (amount * 1e6).toString(), // 6 decimals
    recipient: TREASURY_WALLET,
    description,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    nonce: generateNonce(),
    paymentMethods: ['signed-message', 'metering-session', 'api-key'],
    meteringSessionEndpoint: '/api/metering',
  };
}

// ── Payment Verification ───────────────────────────────────

/**
 * Verify an x402 payment proof.
 * Supports:
 * 1. EIP-191 signed message (for wallet-based agents)
 * 2. Metering session deduction (for session-based agents)
 * 3. API key credit (for API key holders)
 */
export async function verifyPayment(
  proof: X402PaymentProof,
  requirement: X402PaymentRequirement,
): Promise<{ valid: boolean; reason?: string; payer?: string }> {

  // Validate nonce
  if (!validateNonce(proof.nonce)) {
    return { valid: false, reason: 'Invalid or expired nonce' };
  }

  // Validate amounts match
  if (proof.amount !== requirement.amount) {
    return { valid: false, reason: `Amount mismatch: got ${proof.amount}, expected ${requirement.amount}` };
  }

  // Method 1: Metering session
  if (proof.meteringSessionId) {
    try {
      const session = await prisma.meteringSession.findUnique({
        where: { id: proof.meteringSessionId },
      });

      if (!session || session.status !== 'ACTIVE') {
        return { valid: false, reason: 'Invalid or inactive metering session' };
      }

      const cost = Number(requirement.amount) / 1e6;
      if (session.budgetCap - session.spent < cost) {
        return { valid: false, reason: 'Insufficient metering session budget' };
      }

      // Deduct from session
      await prisma.meteringSession.update({
        where: { id: proof.meteringSessionId },
        data: {
          spent: session.spent + cost,
          totalCalls: session.totalCalls + 1,
        },
      });

      consumeNonce(proof.nonce);
      return { valid: true, payer: session.clientWallet };

    } catch (err: any) {
      return { valid: false, reason: `Session error: ${err.message}` };
    }
  }

  // Method 2: Signed message verification
  if (proof.signature && proof.payer) {
    try {
      // Reconstruct the payment hash that was signed
      const paymentHash = ethers.solidityPackedKeccak256(
        ['string', 'address', 'uint256', 'address', 'string'],
        ['x402-payment', proof.payer, proof.amount, proof.token, proof.nonce],
      );

      // Verify EIP-191 signature
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(paymentHash),
        proof.signature,
      );

      if (recoveredAddress.toLowerCase() !== proof.payer.toLowerCase()) {
        return { valid: false, reason: 'Signature verification failed' };
      }

      consumeNonce(proof.nonce);
      return { valid: true, payer: proof.payer };

    } catch (err: any) {
      return { valid: false, reason: `Signature error: ${err.message}` };
    }
  }

  return { valid: false, reason: 'No valid payment method provided' };
}

// ── x402 Response Headers ──────────────────────────────────

export function x402Headers(requirement: X402PaymentRequirement): Record<string, string> {
  return {
    'X-Payment-Required': JSON.stringify(requirement),
    'X-Payment-Version': '1.0',
    'X-Payment-Chain-Id': requirement.chainId.toString(),
    'X-Payment-Token': requirement.token,
    'X-Payment-Amount': requirement.amount,
    'X-Payment-Recipient': requirement.recipient,
    'X-Payment-Nonce': requirement.nonce,
    'X-Payment-Expires': requirement.expiresAt,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-Payment-Required, X-Payment-Version, X-Payment-Chain-Id, X-Payment-Token, X-Payment-Amount, X-Payment-Recipient, X-Payment-Nonce, X-Payment-Expires',
  };
}

/**
 * Middleware: Check for x402 payment in request.
 * Returns payment proof if present, null otherwise.
 */
export function extractPayment(req: Request): X402PaymentProof | null {
  const paymentHeader = req.headers.get('x-payment') || req.headers.get('X-Payment');
  if (!paymentHeader) return null;

  try {
    return JSON.parse(paymentHeader) as X402PaymentProof;
  } catch {
    return null;
  }
}
