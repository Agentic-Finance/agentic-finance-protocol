/**
 * Fiat On-Ramp - Paddle → Crypto → Escrow Bridge
 *
 * Handles the full flow:
 *   1. User pays with credit card via Paddle Checkout
 *   2. Webhook receives confirmation
 *   3. Platform transfers stablecoin to user's wallet
 *   4. Optionally locks funds in NexusV2 escrow for agent job
 *
 * In production, step 3 uses the platform treasury wallet.
 * The treasury holds a reserve of stablecoins for instant conversion.
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import {
  AGTFI_TREASURY_WALLET,
  AGTFI_NEXUS_V2_ADDRESS,
  AGTFI_SHIELD_V2_ADDRESS,
  RPC_URL,
  SUPPORTED_TOKENS,
} from '@/app/lib/constants';
import { verifyTxOnChain } from '@/app/lib/verify-tx';

// ── Configuration ────────────────────────────────────────

const alphaUSD = SUPPORTED_TOKENS.find(t => t.symbol === 'AlphaUSD')!;

export const FIAT_CONFIG = {
  /** Platform treasury wallet (holds stablecoin reserve) */
  treasuryWallet: AGTFI_TREASURY_WALLET,
  /** Default stablecoin */
  defaultToken: alphaUSD.symbol,
  /** Token address */
  tokenAddress: alphaUSD.address,
  /** Token decimals */
  tokenDecimals: alphaUSD.decimals,
  /** Minimum card purchase amount in USD (covers Paddle $0.50 fixed fee) */
  minAmount: 5,
  /** Maximum purchase amount in USD */
  maxAmount: 10000,
  /** 1 USD = 1 AlphaUSD (stablecoin peg) */
  exchangeRate: 1.0,
  /** Paddle currency */
  paddleCurrency: 'USD' as const,
  /**
   * Platform markup percentage (added on top of crypto amount).
   * Combined with platformFixedFee to ensure profitability at all amounts.
   *
   * Example with 5% + $1.00:
   *   User wants 100 AlphaUSD → charged $106 (100 × 1.05 + $1)
   *   Paddle fee: 5% × $106 + $0.50 = $5.80
   *   Agentic Finance receives: $106 - $5.80 = $100.20
   *   Agentic Finance sends: 100 AlphaUSD (cost = $100 at 1:1 peg)
   *   Net profit: $0.20 per $100 transaction
   *
   *   User wants 5 AlphaUSD (min) → charged $6.25 (5 × 1.05 + $1)
   *   Paddle fee: 5% × $6.25 + $0.50 = $0.81
   *   Agentic Finance receives: $6.25 - $0.81 = $5.44
   *   Net profit: $0.44 — never negative at min $5!
   */
  platformMarkupPercent: 5,
  /** Fixed processing fee per transaction (covers Paddle fixed cost + min profit) */
  platformFixedFee: 1.00,
  /** Paddle estimated fee percent (for UI display only) */
  paddleFeePercent: 5,
  /** Paddle fixed fee per transaction (for UI display only) */
  paddleFixedFee: 0.50,
  /** RPC URL */
  rpcUrl: RPC_URL,
  /** Chain ID */
  chainId: 42431,
  /** NexusV2 contract */
  nexusV2Address: AGTFI_NEXUS_V2_ADDRESS,
  /** Paddle API base URL */
  paddleApiUrl: process.env.PADDLE_ENVIRONMENT === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com',
} as const;

// ── Types ────────────────────────────────────────────────

export interface FiatCheckoutParams {
  /** Amount in USD */
  amount: number;
  /** User's wallet address */
  userWallet: string;
  /** Optional agent job ID (to create escrow after payment) */
  agentJobId?: string;
  /** Return URL after Paddle checkout */
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

// ── Paddle Checkout Metadata Builder ─────────────────────

/**
 * Create Paddle checkout custom data.
 * Passed as custom_data in Paddle transaction.
 */
export function buildCheckoutMetadata(params: FiatCheckoutParams) {
  return {
    userWallet: params.userWallet,
    amountUSD: params.amount.toString(),
    token: FIAT_CONFIG.defaultToken,
    agentJobId: params.agentJobId ?? '',
  };
}

// ── Paddle API Helper ────────────────────────────────────

/**
 * Make authenticated request to Paddle API.
 */
export async function paddleApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: Record<string, unknown>,
): Promise<any> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error('PADDLE_API_KEY not configured');

  const baseUrl = process.env.PADDLE_ENVIRONMENT === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.detail || `Paddle API error: ${res.status}`);
  }
  return data;
}

// ── On-Chain Transfer Helper ─────────────────────────────

/**
 * Transfer stablecoins from platform treasury to user wallet.
 * Called by webhook handler after Paddle payment confirmation.
 *
 * @returns Transaction hash
 */
export async function transferStablecoin(
  toWallet: string,
  amountUSD: number,
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(FIAT_CONFIG.rpcUrl);
  const treasuryKey = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;

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
    // Tempo TIP-20 precompile tokens use ~276k gas for transfer()
    gasLimit: 800_000,
  });

  // Tempo L1 uses custom tx types (0x76) that ethers.js v6 can't parse.
  // tx.wait() may throw "invalid BigNumberish value" when reading receipt.
  // Use verifyTxOnChain() with raw RPC to reliably check status.
  let txHash = tx.hash;
  try {
    const receipt = await tx.wait(1, 15000); // 1 confirmation, 15s timeout
    if (receipt && receipt.status === 0) {
      throw new Error(`Transaction reverted on-chain: ${txHash}`);
    }
    txHash = receipt?.hash ?? tx.hash;
  } catch (waitErr: any) {
    const errCode = waitErr?.code || '';
    const errMsg = waitErr?.message || '';

    // If it's a parse/data error from Tempo's custom tx format, verify via raw RPC
    if (errCode === 'BAD_DATA' || errMsg.includes('invalid BigNumberish') || errMsg.includes('invalid value for')) {
      console.warn(`[transferStablecoin] tx.wait() parse error (Tempo custom tx type), verifying via RPC...`);
      await verifyTxOnChain(txHash, 'ERC20 transfer');
    } else {
      // Actual failure — rethrow
      throw waitErr;
    }
  }
  return txHash;
}

/**
 * Compute the crypto amount from USD amount.
 */
export function usdToCrypto(amountUSD: number): number {
  return amountUSD * FIAT_CONFIG.exchangeRate;
}

// ── Markup & Pricing Calculator ──────────────────────────

/**
 * Calculate the total charge amount with platform markup + fixed fee.
 *
 * @param cryptoAmount - How many AlphaUSD the user wants to receive
 * @returns Breakdown of charges
 *
 * Example: cryptoAmount = 100
 *   chargeAmount = 100 × (1 + 5/100) + $1.00 = $106.00
 *   markupAmount = $6.00 (5% + $1)
 *   estimatedPaddleFee = 5% × $106 + $0.50 = $5.80
 *   estimatedProfit = $106 - $5.80 - $100 = $0.20
 *
 * Example: cryptoAmount = 5 (minimum)
 *   chargeAmount = 5 × 1.05 + $1.00 = $6.25
 *   Paddle fee = $0.81
 *   Profit = $0.44 — always positive at min $5!
 */
export function calculateMarkup(cryptoAmount: number) {
  const markup = FIAT_CONFIG.platformMarkupPercent;
  const fixedFee = FIAT_CONFIG.platformFixedFee;
  const chargeAmount = +(cryptoAmount * (1 + markup / 100) + fixedFee).toFixed(2);
  const markupAmount = +(chargeAmount - cryptoAmount).toFixed(2);
  const estimatedPaddleFee = +(
    chargeAmount * (FIAT_CONFIG.paddleFeePercent / 100) + FIAT_CONFIG.paddleFixedFee
  ).toFixed(2);
  const estimatedProfit = +(chargeAmount - estimatedPaddleFee - cryptoAmount).toFixed(2);

  return {
    /** Amount of AlphaUSD user receives */
    cryptoAmount,
    /** Total USD charged to user's card (includes markup + fixed fee) */
    chargeAmount,
    /** Total fees added by platform (markup % + fixed fee) */
    markupAmount,
    /** Markup percentage */
    markupPercent: markup,
    /** Fixed processing fee */
    fixedFee,
    /** Estimated Paddle processing fee */
    estimatedPaddleFee,
    /** Estimated platform net profit */
    estimatedProfit,
    /** Processing fee label for UI */
    feeLabel: `${markup}% + $${fixedFee.toFixed(2)} processing fee`,
  };
}

/**
 * Validate fiat checkout params.
 */
export function validateCheckoutParams(params: FiatCheckoutParams): string | null {
  if (!params.userWallet || !params.userWallet.startsWith('0x') || params.userWallet.length !== 42) {
    return 'Invalid wallet address';
  }
  // Reject zero address — ERC20 transfers to 0x0 will revert
  if (params.userWallet === '0x0000000000000000000000000000000000000000' || params.userWallet.replace(/0x0*/g, '') === '') {
    return 'Please connect your wallet first';
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

// ── Shield ZK Deposit Helper ─────────────────────────────

/**
 * Generate a cryptographically secure random field element for ZK circuits.
 * Returns a BigInt string safe for Poseidon hashing (< BN254 field order).
 */
function generateRandomSecret(): string {
  const bytes = crypto.randomBytes(31); // 31 bytes = 248 bits (safe for BN254)
  return BigInt('0x' + bytes.toString('hex')).toString();
}

export interface ShieldCommitmentData {
  secret: string;
  nullifier: string;
  commitment: string;
  nullifierHash: string;
}

/**
 * Generate a Poseidon commitment for Shield Vault V2 deposit.
 * Uses circomlibjs for real cryptographic hashing.
 *
 * commitment = Poseidon(secret, nullifier, amount, recipient)
 * nullifierHash = Poseidon(nullifier, secret)
 */
export async function generateShieldCommitment(
  recipientWallet: string,
  amountScaled: bigint,
): Promise<ShieldCommitmentData> {
  // Use cached Poseidon singleton — no WASM rebuild per call
  const { getPoseidon, generateRandomSecret: genSecret } = await import('./poseidon-cache');
  const poseidon = await getPoseidon();

  const secret = genSecret();
  const nullifier = genSecret();
  const recipientBigInt = BigInt(recipientWallet.toLowerCase()).toString();

  // Commitment: Poseidon(secret, nullifier, amount, recipient) — 4 inputs
  const commitHash = poseidon([
    BigInt(secret),
    BigInt(nullifier),
    BigInt(amountScaled.toString()),
    BigInt(recipientBigInt),
  ]);
  const commitment = poseidon.F.toObject(commitHash).toString();

  // NullifierHash: Poseidon(nullifier, secret) — 2 inputs
  const nullHash = poseidon([BigInt(nullifier), BigInt(secret)]);
  const nullifierHash = poseidon.F.toObject(nullHash).toString();

  return { secret, nullifier, commitment, nullifierHash };
}

/**
 * Deposit stablecoins into Shield Vault V2 with a Poseidon commitment.
 * Called after Paddle payment when shieldEnabled=true.
 *
 * Flow:
 *  1. Approve ShieldVaultV2 to spend treasury tokens
 *  2. Call ShieldVaultV2.deposit(commitment, amount)
 *  3. Return deposit tx hash + commitment data
 *
 * The daemon later generates a ZK proof and calls executeShieldedPayout()
 * to withdraw funds to the user's wallet with zero-knowledge privacy.
 */
export async function depositToShieldVault(
  recipientWallet: string,
  amountUSD: number,
): Promise<{ depositTxHash: string; commitmentData: ShieldCommitmentData }> {
  const provider = new ethers.JsonRpcProvider(FIAT_CONFIG.rpcUrl);
  const treasuryKey = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;

  if (!treasuryKey) {
    throw new Error('DAEMON_PRIVATE_KEY not configured for Shield deposit');
  }

  const wallet = new ethers.Wallet(treasuryKey, provider);
  const amountScaled = BigInt(Math.round(amountUSD * 10 ** FIAT_CONFIG.tokenDecimals));

  // Step 1: Generate Poseidon commitment
  const commitmentData = await generateShieldCommitment(recipientWallet, amountScaled);
  console.log(`[depositToShieldVault] Commitment generated: ${commitmentData.commitment.slice(0, 20)}...`);

  // Step 2: Approve ShieldVaultV2 to spend tokens
  const erc20Interface = new ethers.Interface([
    'function approve(address spender, uint256 amount) returns (bool)',
  ]);
  const approveData = erc20Interface.encodeFunctionData('approve', [AGTFI_SHIELD_V2_ADDRESS, amountScaled]);

  const approveTx = await wallet.sendTransaction({
    to: FIAT_CONFIG.tokenAddress,
    data: approveData,
    type: 0,
    // Tempo TIP-20 precompile tokens (0x20c0...) use ~276k gas for approve()
    // — much higher than standard ERC20 (~46k). Use 800k for safety margin.
    gasLimit: 800_000,
  });

  // Wait for approve + verify via RPC (don't just catch BAD_DATA blindly)
  try {
    await approveTx.wait(1, 15000);
  } catch (waitErr: any) {
    const errCode = waitErr?.code || '';
    const errMsg = waitErr?.message || '';
    if (errCode === 'BAD_DATA' || errMsg.includes('invalid BigNumberish') || errMsg.includes('invalid value for')) {
      // Tempo parse error — verify via raw RPC that approve actually succeeded
      await verifyTxOnChain(approveTx.hash, 'ERC20 approve');
    } else {
      throw waitErr;
    }
  }
  console.log(`[depositToShieldVault] ERC20 approval confirmed: ${approveTx.hash}`);

  // Small delay to ensure approve is fully indexed before deposit
  await new Promise(r => setTimeout(r, 1000));

  // Step 3: Deposit to Shield Vault V2
  const shieldInterface = new ethers.Interface([
    'function deposit(uint256 commitment, uint256 amount) external',
  ]);
  const depositData = shieldInterface.encodeFunctionData('deposit', [
    commitmentData.commitment,
    amountScaled,
  ]);

  const depositTx = await wallet.sendTransaction({
    to: AGTFI_SHIELD_V2_ADDRESS,
    data: depositData,
    type: 0,
    // deposit() calls TIP-20 transferFrom() internally (~300k+ gas)
    // plus storage writes for commitment (~40k). Total can exceed 500k.
    // Use 1.5M for safety on Tempo's precompile tokens.
    gasLimit: 1_500_000,
  });

  // Wait for deposit + verify via RPC
  let depositTxHash = depositTx.hash;
  try {
    const receipt = await depositTx.wait(1, 15000);
    if (receipt && receipt.status === 0) {
      throw new Error(`Shield deposit reverted on-chain: ${depositTxHash}`);
    }
    depositTxHash = receipt?.hash ?? depositTx.hash;
  } catch (waitErr: any) {
    const errCode = waitErr?.code || '';
    const errMsg = waitErr?.message || '';
    if (errCode === 'BAD_DATA' || errMsg.includes('invalid BigNumberish') || errMsg.includes('invalid value for')) {
      // Tempo parse error — verify via raw RPC (STRICT: throw if not confirmed)
      await verifyTxOnChain(depositTxHash, 'Shield deposit');
    } else {
      throw waitErr;
    }
  }

  console.log(`[depositToShieldVault] Shield deposit confirmed: ${depositTxHash}`);
  return { depositTxHash, commitmentData };
}
