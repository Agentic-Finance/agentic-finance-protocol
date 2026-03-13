/**
 * Access Keys — Tempo Scoped Agent Permissions
 *
 * Tempo Access Keys allow a root account (daemon) to grant limited
 * signing authority to sub-keys (agent embedded wallets).
 *
 * Each agent gets an access key with:
 *   - Spending limit (max AlphaUSD per period)
 *   - Allowed contracts (which contracts the agent can call)
 *   - Expiry (when the key becomes invalid)
 *   - Auto-revoke on deactivation
 *
 * Precompile address: 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
 * (Tempo-specific, not available on other chains)
 *
 * Current implementation: Off-chain tracking via Prisma AccessKey model.
 * On-chain enforcement will be added when Tempo exposes precompile API.
 */
import { type Address } from 'viem';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

/** Access key precompile address (Tempo-specific) */
export const ACCESS_KEY_PRECOMPILE = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as Address;

export interface AccessKeyConfig {
  /** Agent's embedded wallet address */
  agentWallet: Address;
  /** Associated agent ID (optional) */
  agentId?: string;
  /** Max AlphaUSD per period (e.g., per day/week) */
  spendingLimit: number;
  /** Allowed contract addresses ("*" for all) */
  allowedContracts: Address[] | '*';
  /** Key expiry timestamp */
  validUntil: Date;
  /** Spending period reset interval in ms (default: 24h) */
  periodMs?: number;
}

export interface AccessKeyStatus {
  agentWallet: string;
  spendingLimit: number;
  spentThisPeriod: number;
  remainingBudget: number;
  allowedContracts: string;
  validUntil: Date;
  isActive: boolean;
  txCount: number;
}

// ────────────────────────────────────────────
// Spending Check (Off-chain enforcement)
// ────────────────────────────────────────────

/**
 * Check if an agent has sufficient budget remaining
 * Returns null if OK, or an error message if denied
 */
export function checkSpendingLimit(
  key: { spendingLimit: number; spentThisPeriod: number; isActive: boolean; validUntil: Date },
  requestedAmount: number
): string | null {
  if (!key.isActive) {
    return 'Access key is revoked or inactive';
  }

  if (new Date() >= key.validUntil) {
    return 'Access key has expired';
  }

  const remaining = key.spendingLimit - key.spentThisPeriod;
  if (requestedAmount > remaining) {
    return `Insufficient budget: requested ${requestedAmount}, remaining ${remaining.toFixed(2)} of ${key.spendingLimit} limit`;
  }

  return null; // OK
}

/**
 * Check if a contract call is allowed by the access key
 */
export function isContractAllowed(
  allowedContracts: string,
  targetContract: Address
): boolean {
  if (allowedContracts === '*') return true;

  const allowed = allowedContracts.split(',').map(a => a.trim().toLowerCase());
  return allowed.includes(targetContract.toLowerCase());
}

// ────────────────────────────────────────────
// Default Configurations by Agent Tier
// ────────────────────────────────────────────

export const ACCESS_KEY_TIERS = {
  /** Tier 0: New/unverified agent */
  basic: {
    spendingLimit: 10,      // 10 AlphaUSD per day
    periodMs: 24 * 60 * 60 * 1000, // 24h
    validDays: 30,
  },
  /** Tier 1: Verified agent with some history */
  standard: {
    spendingLimit: 100,     // 100 AlphaUSD per day
    periodMs: 24 * 60 * 60 * 1000,
    validDays: 90,
  },
  /** Tier 2: High-reputation agent */
  premium: {
    spendingLimit: 1000,    // 1000 AlphaUSD per day
    periodMs: 24 * 60 * 60 * 1000,
    validDays: 180,
  },
  /** Tier 3: System/admin agent */
  unlimited: {
    spendingLimit: 100_000, // 100k AlphaUSD per day
    periodMs: 24 * 60 * 60 * 1000,
    validDays: 365,
  },
} as const;

export type AccessKeyTier = keyof typeof ACCESS_KEY_TIERS;

/**
 * Get default config for an agent tier
 */
export function getDefaultConfig(tier: AccessKeyTier): {
  spendingLimit: number;
  validUntil: Date;
} {
  const tierConfig = ACCESS_KEY_TIERS[tier];
  const validUntil = new Date(Date.now() + tierConfig.validDays * 24 * 60 * 60 * 1000);
  return {
    spendingLimit: tierConfig.spendingLimit,
    validUntil,
  };
}
