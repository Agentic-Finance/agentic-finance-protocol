/**
 * Fiat On-Ramp — Stripe → Crypto → Escrow Bridge
 *
 * Handles the full flow:
 *   1. User pays with credit card via Stripe Checkout
 *   2. Webhook receives confirmation
 *   3. Platform transfers stablecoin to user's wallet
 *   4. Optionally locks funds in NexusV2 escrow for agent job
 *
 * In production, step 3 uses the platform treasury wallet.
 * The treasury holds a reserve of stablecoins for instant conversion.
 */

import { ethers } from 'ethers';

// ── Configuration ────────────────────────────────────────

export const FIAT_CONFIG = {
  /** Platform treasury wallet (holds stablecoin reserve) */
  treasuryWallet: '0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793',
  /** Default stablecoin */
  defaultToken: 'AlphaUSD',
  /** Token address */
  tokenAddress: '0x20c0000000000000000000000000000000000001',
  /** Token decimals */
  tokenDecimals: 6,
  /** Minimum purchase amount in USD */
  minAmount: 1,
  /** Maximum purchase amount in USD */
  maxAmount: 10000,
  /** 1 USD = 1 AlphaUSD (stablecoin peg) */
  exchangeRate: 1.0,
  /** Stripe currency */
  stripeCurrency: 'usd' as const,
  /** RPC URL */
  rpcUrl: 'https://rpc.moderato.tempo.xyz',
  /** Chain ID */
  chainId: 42431,
  /** NexusV2 contract */
  nexusV2Address: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
} as const;

// ── Types ────────────────────────────────────────────────

export interface FiatCheckoutParams {
  /** Amount in USD */
  amount: number;
  /** User's wallet address */
  userWallet: string;
  /** Optional agent job ID (to create escrow after payment) */
  agentJobId?: string;
  /** Return URL after Stripe checkout */
  returnUrl: string;
}

export interface FiatPaymentStatus {
  id: string;
  status: 'PENDING' | 'PAID' | 'CRYPTO_SENT' | 'ESCROWED' | 'FAILED';
  amountUSD: number;
  amountCrypto: number | null;
  token: string;
  transferTxHash: string | null;
  escrowTxHash: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Stripe Checkout Session Creator ──────────────────────

/**
 * Create Stripe checkout session metadata.
 * The actual Stripe SDK call is done in the API route (server-side only).
 */
export function buildCheckoutMetadata(params: FiatCheckoutParams) {
  return {
    userWallet: params.userWallet,
    amountUSD: params.amount.toString(),
    token: FIAT_CONFIG.defaultToken,
    agentJobId: params.agentJobId ?? '',
  };
}

// ── On-Chain Transfer Helper ─────────────────────────────

/**
 * Transfer stablecoins from platform treasury to user wallet.
 * Called by webhook handler after Stripe payment confirmation.
 *
 * @returns Transaction hash
 */
export async function transferStablecoin(
  toWallet: string,
  amountUSD: number,
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(FIAT_CONFIG.rpcUrl);
  const treasuryKey = process.env.DAEMON_PRIVATE_KEY;

  if (!treasuryKey) {
    throw new Error('DAEMON_PRIVATE_KEY not configured for fiat on-ramp');
  }

  const wallet = new ethers.Wallet(treasuryKey, provider);

  // Convert USD to token amount (1:1 peg, 6 decimals)
  const amountInSmallestUnit = BigInt(Math.round(amountUSD * 10 ** FIAT_CONFIG.tokenDecimals));

  // ERC20 transfer(address,uint256)
  const erc20Interface = new ethers.Interface([
    'function transfer(address to, uint256 amount) returns (bool)',
  ]);

  const data = erc20Interface.encodeFunctionData('transfer', [toWallet, amountInSmallestUnit]);

  const tx = await wallet.sendTransaction({
    to: FIAT_CONFIG.tokenAddress,
    data,
    type: 0, // Legacy TX for Tempo L1
    gasLimit: 500_000,
  });

  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

/**
 * Compute the crypto amount from USD amount.
 */
export function usdToCrypto(amountUSD: number): number {
  return amountUSD * FIAT_CONFIG.exchangeRate;
}

/**
 * Validate fiat checkout params.
 */
export function validateCheckoutParams(params: FiatCheckoutParams): string | null {
  if (!params.userWallet || !params.userWallet.startsWith('0x')) {
    return 'Invalid wallet address';
  }
  if (params.amount < FIAT_CONFIG.minAmount) {
    return `Minimum amount is $${FIAT_CONFIG.minAmount}`;
  }
  if (params.amount > FIAT_CONFIG.maxAmount) {
    return `Maximum amount is $${FIAT_CONFIG.maxAmount}`;
  }
  if (!params.returnUrl) {
    return 'Return URL is required';
  }
  return null;
}
