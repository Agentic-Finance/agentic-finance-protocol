/**
 * x402 Payment Facilitator for Agentic Finance
 *
 * Implements the x402 protocol (HTTP 402 Payment Required)
 * enabling AI agents to pay for API access with AlphaUSD micropayments.
 *
 * Flow:
 * 1. Agent calls a protected endpoint
 * 2. Server returns 402 with payment requirements in headers
 * 3. Agent signs a payment authorization
 * 4. Agent re-sends request with X-PAYMENT header
 * 5. Server verifies payment, processes request, settles on-chain
 *
 * Reference: https://www.x402.org
 */

import { publicClient, getDaemonWalletClient } from '@/app/lib/tempo/clients';
import { ERC20_VIEM_ABI } from '@/app/lib/tempo/contracts';
import { SUPPORTED_TOKENS, AGTFI_TREASURY_WALLET } from '@/app/lib/constants';
import {
  verifyMessage,
  formatUnits,
  parseUnits,
  keccak256,
  encodePacked,
  type Address,
} from 'viem';
import prisma from '@/app/lib/prisma';

// ────────────────────────────────────────────
// x402 Constants
// ────────────────────────────────────────────

export const X402_VERSION = '1';
export const X402_NETWORK = 'tempo-42431';
export const X402_TOKEN = SUPPORTED_TOKENS[0]; // AlphaUSD
export const X402_FACILITATOR_ADDRESS = AGTFI_TREASURY_WALLET;

// ────────────────────────────────────────────
// Payment Requirement (402 Response Headers)
// ────────────────────────────────────────────

export interface PaymentRequirement {
  version: string;
  network: string;
  facilitator: string;
  token: string;
  amount: string; // In human-readable units (e.g., "0.01")
  description: string;
  resource: string;
  scheme: 'exact';
  mimeType: 'application/json';
  maxTimeoutSeconds: number;
  extra?: Record<string, any>;
}

export function createPaymentRequirement(
  resource: string,
  amount: number,
  description: string,
  maxTimeoutSeconds: number = 300
): PaymentRequirement {
  return {
    version: X402_VERSION,
    network: X402_NETWORK,
    facilitator: X402_FACILITATOR_ADDRESS,
    token: X402_TOKEN.address,
    amount: String(amount),
    description,
    resource,
    scheme: 'exact',
    mimeType: 'application/json',
    maxTimeoutSeconds,
  };
}

// ────────────────────────────────────────────
// Payment Header (from Agent)
// ────────────────────────────────────────────

export interface PaymentPayload {
  version: string;
  network: string;
  from: string; // Agent wallet address
  to: string; // Facilitator address (Agentic Finance treasury)
  token: string;
  amount: string;
  nonce: string; // Unique per payment
  timestamp: number;
  signature: string; // EIP-191 signature of payment intent
  resource: string; // The resource being paid for
}

// ────────────────────────────────────────────
// Verification
// ────────────────────────────────────────────

/**
 * Build the payment message that agents must sign
 */
export function buildPaymentMessage(payload: Omit<PaymentPayload, 'signature'>): string {
  return [
    `x402 Payment Authorization v${payload.version}`,
    `Network: ${payload.network}`,
    `From: ${payload.from}`,
    `To: ${payload.to}`,
    `Token: ${payload.token}`,
    `Amount: ${payload.amount}`,
    `Nonce: ${payload.nonce}`,
    `Timestamp: ${payload.timestamp}`,
    `Resource: ${payload.resource}`,
  ].join('\n');
}

/**
 * Verify a payment header from an agent
 * Returns the verified payer address or throws
 */
export async function verifyPayment(
  payment: PaymentPayload,
  requirement: PaymentRequirement
): Promise<{
  valid: boolean;
  payer: string;
  amount: number;
  error?: string;
}> {
  try {
    // 1. Version check
    if (payment.version !== X402_VERSION) {
      return { valid: false, payer: payment.from, amount: 0, error: 'Version mismatch' };
    }

    // 2. Network check
    if (payment.network !== X402_NETWORK) {
      return { valid: false, payer: payment.from, amount: 0, error: 'Network mismatch' };
    }

    // 3. Amount check
    const paymentAmount = parseFloat(payment.amount);
    const requiredAmount = parseFloat(requirement.amount);
    if (paymentAmount < requiredAmount) {
      return {
        valid: false,
        payer: payment.from,
        amount: paymentAmount,
        error: `Insufficient payment: ${paymentAmount} < ${requiredAmount}`,
      };
    }

    // 4. Timestamp check (within maxTimeoutSeconds)
    const now = Math.floor(Date.now() / 1000);
    if (now - payment.timestamp > requirement.maxTimeoutSeconds) {
      return { valid: false, payer: payment.from, amount: paymentAmount, error: 'Payment expired' };
    }

    // 5. Nonce check (prevent replay)
    const existingPayment = await prisma.x402Payment.findUnique({
      where: { nonce: payment.nonce },
    });
    if (existingPayment) {
      return { valid: false, payer: payment.from, amount: paymentAmount, error: 'Nonce already used (replay attack)' };
    }

    // 6. Verify signature (EIP-191)
    const message = buildPaymentMessage({
      version: payment.version,
      network: payment.network,
      from: payment.from,
      to: payment.to,
      token: payment.token,
      amount: payment.amount,
      nonce: payment.nonce,
      timestamp: payment.timestamp,
      resource: payment.resource,
    });

    const recoveredAddress = await verifyMessage({
      address: payment.from as Address,
      message,
      signature: payment.signature as `0x${string}`,
    });

    if (!recoveredAddress) {
      return { valid: false, payer: payment.from, amount: paymentAmount, error: 'Invalid signature' };
    }

    // 7. Check payer has sufficient balance
    const balance = await publicClient.readContract({
      address: X402_TOKEN.address as Address,
      abi: ERC20_VIEM_ABI,
      functionName: 'balanceOf',
      args: [payment.from as Address],
    });

    const parsedRequired = parseUnits(String(requiredAmount), X402_TOKEN.decimals);
    if ((balance as bigint) < parsedRequired) {
      return {
        valid: false,
        payer: payment.from,
        amount: paymentAmount,
        error: `Insufficient balance: ${formatUnits(balance as bigint, X402_TOKEN.decimals)} ${X402_TOKEN.symbol}`,
      };
    }

    return { valid: true, payer: payment.from, amount: paymentAmount };
  } catch (error: any) {
    return { valid: false, payer: payment.from || 'unknown', amount: 0, error: error.message };
  }
}

// ────────────────────────────────────────────
// Settlement (on-chain transfer)
// ────────────────────────────────────────────

/**
 * Settle a verified x402 payment on-chain
 * Daemon executes the ERC-20 transfer from payer to facilitator
 *
 * NOTE: In production, this would use EIP-3009 transferWithAuthorization
 * or a permit-based flow. For now, we record the payment off-chain
 * and batch-settle periodically.
 */
export async function settlePayment(
  payment: PaymentPayload,
  resource: string
): Promise<{ paymentId: string; status: string }> {
  // Record the payment
  const record = await prisma.x402Payment.create({
    data: {
      nonce: payment.nonce,
      payer: payment.from,
      facilitator: payment.to,
      token: payment.token,
      amount: parseFloat(payment.amount),
      resource,
      signature: payment.signature,
      timestamp: new Date(payment.timestamp * 1000),
      status: 'VERIFIED',
    },
  });

  return { paymentId: record.id, status: 'VERIFIED' };
}

// ────────────────────────────────────────────
// x402 Middleware Helper
// ────────────────────────────────────────────

/**
 * Parse the X-PAYMENT header from a request
 */
export function parsePaymentHeader(headerValue: string | null): PaymentPayload | null {
  if (!headerValue) return null;

  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    // Try direct JSON parse
    try {
      return JSON.parse(headerValue);
    } catch {
      return null;
    }
  }
}

/**
 * Create 402 response with payment requirements
 */
export function create402Response(requirement: PaymentRequirement): Response {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set(
    'X-PAYMENT-REQUIRED',
    Buffer.from(JSON.stringify(requirement)).toString('base64')
  );
  headers.set('X-PAYMENT-VERSION', X402_VERSION);
  headers.set('X-PAYMENT-NETWORK', X402_NETWORK);
  headers.set('X-PAYMENT-TOKEN', X402_TOKEN.address);
  headers.set('X-PAYMENT-AMOUNT', requirement.amount);

  return new Response(
    JSON.stringify({
      error: 'Payment Required',
      status: 402,
      paymentRequired: requirement,
      instructions: {
        step1: 'Sign a payment authorization message with your wallet',
        step2: 'Include the signed payment as base64 in the X-PAYMENT header',
        step3: 'Re-send your request with the X-PAYMENT header',
        message_format: 'Call GET /api/x402/message to generate the signing message',
      },
    }),
    { status: 402, headers }
  );
}

// ────────────────────────────────────────────
// Pricing Tiers
// ────────────────────────────────────────────

export const X402_PRICING: Record<string, number> = {
  // MCP tool calls
  'mcp:send_payment': 0.05,
  'mcp:create_escrow': 0.10,
  'mcp:hire_agent': 0.10,
  'mcp:create_stream': 0.08,
  'mcp:shield_payment': 0.15,
  'mcp:multisend': 0.12,
  'mcp:check_balance': 0.001,
  'mcp:list_agents': 0.002,
  'mcp:get_tvl': 0.001,
  'mcp:get_agent_reputation': 0.002,

  // API endpoints
  'api:marketplace': 0.005,
  'api:agents': 0.005,
  'api:shield': 0.10,
  'api:stream': 0.05,
  'api:reputation': 0.005,
  'api:a2a': 0.08,
};

export function getPrice(resource: string): number {
  return X402_PRICING[resource] || 0.01; // Default: 0.01 AUSD
}
