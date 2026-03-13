/**
 * Shared On-Chain Transaction Verification Utility
 *
 * Verify a transaction succeeded on Tempo L1.
 *
 * Migrated to viem — publicClient.getTransactionReceipt handles
 * Tempo's custom tx type 0x76 better than ethers.js (no BAD_DATA errors).
 *
 * Falls back to raw RPC fetch() if viem also fails (belt-and-suspenders).
 *
 * Polls up to 5 times (2s apart) for receipt, then checks status.
 * Throws if reverted or receipt not found.
 */

import { publicClient } from './tempo/clients';
import { RPC_URL } from '@/app/lib/constants';
import { type Hex } from 'viem';

export async function verifyTxOnChain(
  txHash: string,
  label: string,
): Promise<void> {
  // ─── Attempt 1: viem publicClient (preferred) ───
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as Hex,
      timeout: 10_000, // 10s timeout
    });

    if (receipt.status === 'reverted') {
      throw new Error(`${label} reverted on-chain: ${txHash}`);
    }

    console.log(`[verifyTxOnChain] ${label} confirmed via viem: ${txHash}`);
    return;
  } catch (err: any) {
    // If it's a revert error, re-throw immediately
    if (err.message?.includes('reverted')) throw err;

    // Otherwise fall through to raw RPC (handles edge cases)
    console.warn(`[verifyTxOnChain] viem failed for ${label}, falling back to raw RPC:`, err.message);
  }

  // ─── Attempt 2: Raw RPC fetch (fallback for Tempo quirks) ───
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rpcRes = await fetch(RPC_URL, {
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
          console.log(`[verifyTxOnChain] ${label} confirmed via raw RPC: ${txHash}`);
          return;
        }
        // Unknown status -- log and assume OK
        console.warn(`[verifyTxOnChain] ${label} has unknown status ${receipt.status}: ${txHash}`);
        return;
      }
    } catch (err: any) {
      if (err.message?.includes('reverted')) throw err;
      console.warn(`[verifyTxOnChain] ${label} RPC error (attempt ${attempt + 1}):`, err.message);
    }
    // Receipt not available yet -- wait 2s and retry
    await new Promise(r => setTimeout(r, 2000));
  }

  // After 5 attempts (10s), receipt still not found
  throw new Error(`${label} receipt not found after 10s -- tx may have failed: ${txHash}`);
}
