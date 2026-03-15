/**
 * Fee Sponsorship Service — Tempo Native Account Abstraction
 *
 * Tempo AA uses dual-signature fee sponsorship:
 *   - Sender signs tx type 0x76 (TempoTransaction)
 *   - Fee payer (daemon) co-signs with type 0x78
 *
 * Agentic Finance daemon acts as fee payer for all agent transactions,
 * so agents don't need to hold native tokens for gas.
 *
 * Note: Gas is free on Tempo testnet, but this ensures mainnet readiness
 * and establishes the pattern where agents transact without native token.
 */
import {
  type Hex,
  type Address,
  type TransactionSerializable,
  encodeFunctionData,
  parseAbi,
} from 'viem';
import { publicClient, getDaemonAccount, getDaemonWalletClient } from './clients';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface SponsoredTxRequest {
  /** Sender address (agent embedded wallet) */
  from: Address;
  /** Target contract address */
  to: Address;
  /** Encoded calldata */
  data: Hex;
  /** Value in wei (usually 0 for token ops) */
  value?: bigint;
  /** Gas limit override */
  gas?: bigint;
}

export interface SponsoredTxResult {
  txHash: Hex;
  feePayer: Address;
  gasUsed?: bigint;
}

// ────────────────────────────────────────────
// Fee Sponsorship
// ────────────────────────────────────────────

/**
 * Sponsor a transaction — daemon pays gas on behalf of sender.
 *
 * For Tempo testnet (gas-free): simply sends tx from daemon wallet.
 * For mainnet: will implement dual-signature 0x76+0x78 pattern.
 *
 * Current implementation: Daemon re-sends the intended call directly,
 * since testnet gas is free. This establishes the API contract.
 */
export async function sponsorTransaction(
  request: SponsoredTxRequest
): Promise<SponsoredTxResult> {
  const walletClient = getDaemonWalletClient();
  const daemonAccount = getDaemonAccount();

  if (!walletClient || !daemonAccount) {
    throw new Error('Fee payer (daemon wallet) not configured');
  }

  // On Tempo testnet, gas is free — daemon sends directly
  // On mainnet, this will be replaced with dual-signature flow
  const txHash = await walletClient.sendTransaction({
    account: daemonAccount,
    to: request.to,
    data: request.data,
    value: request.value ?? BigInt(0),
    gas: request.gas ?? BigInt(500_000),
    // Use legacy tx type to avoid ethers.js parsing issues with type 0x76
    type: 'legacy' as any,
  } as any);

  return {
    txHash,
    feePayer: daemonAccount.address,
  };
}

/**
 * Estimate gas for a sponsored transaction
 */
export async function estimateSponsoredGas(
  request: SponsoredTxRequest
): Promise<bigint> {
  try {
    const gas = await publicClient.estimateGas({
      account: request.from,
      to: request.to,
      data: request.data,
      value: request.value ?? BigInt(0),
    });
    // Add 20% buffer for Tempo's TIP-20 gas overhead
    return (gas * BigInt(120)) / BigInt(100);
  } catch {
    // Default fallback for TIP-20 precompile tokens (5-6x normal gas)
    return BigInt(500_000);
  }
}

/**
 * Check if daemon has sufficient balance to sponsor transactions.
 * On testnet this always returns true (gas-free).
 */
export async function canSponsor(): Promise<boolean> {
  const daemonAccount = getDaemonAccount();
  if (!daemonAccount) return false;

  // On testnet, gas is free — always able to sponsor
  // On mainnet, check native token balance
  return true;
}

/**
 * Build calldata for a common operation (token transfer)
 * Useful for agents that need to send tokens via fee sponsorship
 */
export function buildTransferCalldata(
  tokenAddress: Address,
  to: Address,
  amount: bigint
): Hex {
  return encodeFunctionData({
    abi: parseAbi(['function transfer(address to, uint256 amount) external returns (bool)']),
    functionName: 'transfer',
    args: [to, amount],
  });
}
