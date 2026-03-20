/**
 * TIP-403 Compliance Registry Client
 *
 * Tempo's TIP-403 defines a policy registry for token compliance:
 *   - Address whitelists/blacklists
 *   - Transfer restrictions
 *   - Freeze capabilities
 *
 * Agentic Finance checks compliance before processing payouts.
 * On testnet, the registry may not exist — defaults to allowing all transfers.
 */
import { type Address } from 'viem';
import { publicClient } from './clients';

// TIP-403 Policy Registry precompile address
const TIP403_REGISTRY = '0x4030000000000000000000000000000000000403' as Address;

const TIP403_ABI = [
  {
    type: 'function',
    name: 'isTransferAllowed',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPolicy',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'admin', type: 'address' },
      { name: 'frozen', type: 'bool' },
      { name: 'whitelistOnly', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isWhitelisted',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

/** Check if a transfer is allowed by the compliance registry */
export async function isTransferAllowed(
  token: Address,
  from: Address,
  to: Address,
  amount: bigint
): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: TIP403_REGISTRY,
      abi: TIP403_ABI,
      functionName: 'isTransferAllowed',
      args: [token, from, to, amount],
    });
    return result as boolean;
  } catch {
    // Registry not available on testnet — allow all transfers
    return true;
  }
}

/** Get token policy details */
export async function getTokenPolicy(token: Address): Promise<{
  admin: Address;
  frozen: boolean;
  whitelistOnly: boolean;
} | null> {
  try {
    const result = await publicClient.readContract({
      address: TIP403_REGISTRY,
      abi: TIP403_ABI,
      functionName: 'getPolicy',
      args: [token],
    }) as [Address, boolean, boolean];
    return { admin: result[0], frozen: result[1], whitelistOnly: result[2] };
  } catch {
    return null;
  }
}

/** Check if an address is whitelisted for a token */
export async function isWhitelisted(token: Address, account: Address): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: TIP403_REGISTRY,
      abi: TIP403_ABI,
      functionName: 'isWhitelisted',
      args: [token, account],
    });
    return result as boolean;
  } catch {
    return true; // Default: allowed
  }
}

/** Batch check compliance for multiple recipients */
export async function checkBatchCompliance(
  token: Address,
  from: Address,
  recipients: Array<{ address: Address; amount: bigint }>
): Promise<Array<{ address: Address; allowed: boolean }>> {
  const results = await Promise.all(
    recipients.map(async (r) => ({
      address: r.address,
      allowed: await isTransferAllowed(token, from, r.address, r.amount),
    }))
  );
  return results;
}
