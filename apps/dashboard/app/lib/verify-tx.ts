/**
 * Shared On-Chain Transaction Verification Utility
 *
 * Verify a transaction succeeded on Tempo L1 via raw HTTP RPC.
 * Uses raw fetch() instead of provider.send() to bypass ethers.js
 * parsing layer that throws BAD_DATA on Tempo's custom tx type 0x76.
 *
 * Polls up to 5 times (2s apart) for receipt, then checks status.
 * Throws if reverted or receipt not found.
 */

import { RPC_URL } from '@/app/lib/constants';

export async function verifyTxOnChain(
  txHash: string,
  label: string,
): Promise<void> {
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
          console.log(`[verifyTxOnChain] ${label} confirmed OK: ${txHash}`);
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
  // After 5 attempts (10s), receipt still not found -- throw error (don't assume success!)
  throw new Error(`${label} receipt not found after 10s -- tx may have failed: ${txHash}`);
}
