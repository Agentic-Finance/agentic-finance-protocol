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
  /** Paddle currency */
  paddleCurrency: 'USD' as const,
  /**
   * Platform markup percentage (added on top of crypto amount).
   * Covers Paddle processing fees (~5% + $0.50) and generates profit.
   *
   * Example with 8% markup:
   *   User wants 100 AlphaUSD → charged $108
   *   Paddle fee: 5% × $108 + $0.50 = $5.90
   *   PayPol receives: $108 - $5.90 = $102.10
   *   PayPol sends: 100 AlphaUSD (cost = $100 at 1:1 peg)
   *   Net profit: $2.10 per $100 transaction
   */
  platformMarkupPercent: 8,
  /** Paddle estimated fee percent (for UI display only) */
  paddleFeePercent: 5,
  /** Paddle fixed fee per transaction (for UI display only) */
  paddleFixedFee: 0.50,
  /** RPC URL */
  rpcUrl: 'https://rpc.moderato.tempo.xyz',
  /** Chain ID */
  chainId: 42431,
  /** NexusV2 contract */
  nexusV2Address: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
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

  // Tempo L1 uses custom tx types (0x76) that ethers.js v6 can't parse.
  // tx.wait() may throw "invalid BigNumberish value" when reading receipt.
  // We need to distinguish between:
  //   - Parse error (BAD_DATA): tx was mined OK, just can't read receipt → use tx.hash
  //   - Actual revert (CALL_EXCEPTION): tx failed on chain → throw error
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

    // If it's a parse/data error from Tempo's custom tx format, tx was likely successful
    if (errCode === 'BAD_DATA' || errMsg.includes('invalid BigNumberish') || errMsg.includes('invalid value for')) {
      console.warn(`[transferStablecoin] tx.wait() parse error (Tempo custom tx type), using tx.hash: ${txHash}`);
      // Verify the tx actually succeeded by checking via RPC
      try {
        const txReceipt = await provider.send('eth_getTransactionReceipt', [txHash]);
        if (txReceipt && txReceipt.status === '0x0') {
          throw new Error(`Transaction reverted on-chain: ${txHash}`);
        }
      } catch (rpcErr: any) {
        // If RPC check also fails with parse error, assume success (tx was mined)
        if (rpcErr.message?.includes('reverted')) {
          throw rpcErr;
        }
        console.warn(`[transferStablecoin] RPC receipt check failed, assuming tx success: ${txHash}`);
      }
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
 * Calculate the total charge amount with platform markup.
 *
 * @param cryptoAmount - How many AlphaUSD the user wants to receive
 * @returns Breakdown of charges
 *
 * Example: cryptoAmount = 100
 *   chargeAmount = 100 × (1 + 8/100) = $108.00
 *   markupAmount = $8.00
 *   estimatedPaddleFee = 5% × $108 + $0.50 = $5.90
 *   estimatedProfit = $108 - $5.90 - $100 = $2.10
 */
export function calculateMarkup(cryptoAmount: number) {
  const markup = FIAT_CONFIG.platformMarkupPercent;
  const chargeAmount = +(cryptoAmount * (1 + markup / 100)).toFixed(2);
  const markupAmount = +(chargeAmount - cryptoAmount).toFixed(2);
  const estimatedPaddleFee = +(
    chargeAmount * (FIAT_CONFIG.paddleFeePercent / 100) + FIAT_CONFIG.paddleFixedFee
  ).toFixed(2);
  const estimatedProfit = +(chargeAmount - estimatedPaddleFee - cryptoAmount).toFixed(2);

  return {
    /** Amount of AlphaUSD user receives */
    cryptoAmount,
    /** Total USD charged to user's card (includes markup) */
    chargeAmount,
    /** Markup added by platform */
    markupAmount,
    /** Markup percentage */
    markupPercent: markup,
    /** Estimated Paddle processing fee */
    estimatedPaddleFee,
    /** Estimated platform net profit */
    estimatedProfit,
    /** Processing fee label for UI (e.g., "8% processing fee") */
    feeLabel: `${markup}% processing fee`,
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

/** Shield V2 contract address */
const SHIELD_V2_ADDRESS = '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055';

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
  // Dynamic import circomlibjs (heavy library)
  const { buildPoseidon } = await import('circomlibjs');
  const poseidon = await buildPoseidon();

  const secret = generateRandomSecret();
  const nullifier = generateRandomSecret();
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
/**
 * Verify a transaction succeeded on Tempo L1 via raw HTTP RPC.
 * Uses raw fetch() instead of provider.send() to bypass ethers.js
 * parsing layer that throws BAD_DATA on Tempo's custom tx type 0x76.
 *
 * Polls up to 5 times (2s apart) for receipt, then checks status.
 * Throws if reverted or receipt not found.
 */
async function verifyTxOnChain(
  txHash: string,
  label: string,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rpcRes = await fetch(FIAT_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        }),
      });
      const rpcJson = await rpcRes.json();
      const receipt = rpcJson?.result;

      if (receipt) {
        if (receipt.status === '0x0') {
          throw new Error(`${label} reverted on-chain: ${txHash}`);
        }
        if (receipt.status === '0x1') {
          console.log(`[verifyTxOnChain] ${label} confirmed OK: ${txHash}`);
          return;
        }
        // Unknown status — log and assume OK
        console.warn(`[verifyTxOnChain] ${label} has unknown status ${receipt.status}: ${txHash}`);
        return;
      }
    } catch (err: any) {
      if (err.message?.includes('reverted')) throw err;
      console.warn(`[verifyTxOnChain] ${label} RPC error (attempt ${attempt + 1}):`, err.message);
    }
    // Receipt not available yet — wait 2s and retry
    await new Promise(r => setTimeout(r, 2000));
  }
  // After 5 attempts (10s), receipt still not found — throw error (don't assume success!)
  throw new Error(`${label} receipt not found after 10s — tx may have failed: ${txHash}`);
}

export async function depositToShieldVault(
  recipientWallet: string,
  amountUSD: number,
): Promise<{ depositTxHash: string; commitmentData: ShieldCommitmentData }> {
  const provider = new ethers.JsonRpcProvider(FIAT_CONFIG.rpcUrl);
  const treasuryKey = process.env.DAEMON_PRIVATE_KEY;

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
  const approveData = erc20Interface.encodeFunctionData('approve', [SHIELD_V2_ADDRESS, amountScaled]);

  const approveTx = await wallet.sendTransaction({
    to: FIAT_CONFIG.tokenAddress,
    data: approveData,
    type: 0,
    gasLimit: 200_000,
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
    to: SHIELD_V2_ADDRESS,
    data: depositData,
    type: 0,
    gasLimit: 500_000,
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
