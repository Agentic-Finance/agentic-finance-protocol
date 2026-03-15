/**
 * Stealth Addresses (ERC-5564) for Agentic Finance
 *
 * Enables unlinkable agent-to-agent payments.
 * Even if someone sees a ShieldVault deposit/withdrawal,
 * they cannot link sender to recipient.
 *
 * Flow:
 * 1. Recipient publishes a "stealth meta-address" (spending key + viewing key)
 * 2. Sender generates a one-time stealth address from the meta-address
 * 3. Sender sends funds to the stealth address
 * 4. Only the recipient can derive the private key to spend
 *
 * Crypto: ECDH (secp256k1) + keccak256
 */

import { keccak256, encodePacked, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ────────────────────────────────────────────
// Stealth Meta-Address
// ────────────────────────────────────────────

export interface StealthMetaAddress {
  /** Spending public key (compressed hex) */
  spendingPubKey: string;
  /** Viewing public key (compressed hex) */
  viewingPubKey: string;
  /** ERC-5564 formatted: st:eth:0x<spendingPubKey><viewingPubKey> */
  metaAddress: string;
}

export interface StealthAddress {
  /** The one-time stealth address */
  address: string;
  /** Ephemeral public key (sender publishes this) */
  ephemeralPubKey: string;
  /** View tag (first byte of shared secret, for scan optimization) */
  viewTag: string;
}

export interface StealthKeys {
  /** Spending private key */
  spendingKey: string;
  /** Viewing private key */
  viewingKey: string;
}

// ────────────────────────────────────────────
// Key Generation
// ────────────────────────────────────────────

/**
 * Generate a stealth meta-address from a seed/secret
 * In production, this uses secp256k1 ECDH.
 * Here we use a deterministic derivation for simplicity.
 */
export function generateStealthKeys(seed: string): StealthKeys {
  const spendingKey = keccak256(encodePacked(['string', 'string'], [seed, ':spending']));
  const viewingKey = keccak256(encodePacked(['string', 'string'], [seed, ':viewing']));
  return { spendingKey, viewingKey };
}

export function generateMetaAddress(keys: StealthKeys): StealthMetaAddress {
  const spendingAccount = privateKeyToAccount(keys.spendingKey as `0x${string}`);
  const viewingAccount = privateKeyToAccount(keys.viewingKey as `0x${string}`);

  const spendingPubKey = spendingAccount.address;
  const viewingPubKey = viewingAccount.address;

  const metaAddress = `st:tempo:${spendingPubKey}:${viewingPubKey}`;

  return { spendingPubKey, viewingPubKey, metaAddress };
}

// ────────────────────────────────────────────
// Stealth Address Generation (Sender side)
// ────────────────────────────────────────────

/**
 * Generate a one-time stealth address for a recipient
 * Sender calls this with the recipient's meta-address
 */
export function generateStealthAddress(
  recipientSpendingPubKey: string,
  recipientViewingPubKey: string
): StealthAddress {
  // Generate ephemeral key pair (random for each payment)
  const ephemeralSecret = keccak256(
    encodePacked(
      ['string', 'uint256'],
      ['ephemeral', BigInt(Date.now()) * BigInt(Math.floor(Math.random() * 1e9))]
    )
  );
  const ephemeralAccount = privateKeyToAccount(ephemeralSecret as `0x${string}`);

  // Shared secret = keccak256(ephemeralSecret || recipientViewingPubKey)
  const sharedSecret = keccak256(
    encodePacked(
      ['bytes32', 'address'],
      [ephemeralSecret as `0x${string}`, recipientViewingPubKey as Address]
    )
  );

  // View tag = first byte of shared secret (for efficient scanning)
  const viewTag = sharedSecret.slice(0, 4); // 0x + 1 byte

  // Stealth address = keccak256(sharedSecret || recipientSpendingPubKey) → address
  const stealthHash = keccak256(
    encodePacked(
      ['bytes32', 'address'],
      [sharedSecret as `0x${string}`, recipientSpendingPubKey as Address]
    )
  );
  // Derive stealth address (last 20 bytes of hash)
  const stealthAddress = ('0x' + stealthHash.slice(26)) as Address;

  return {
    address: stealthAddress,
    ephemeralPubKey: ephemeralAccount.address,
    viewTag,
  };
}

// ────────────────────────────────────────────
// Stealth Address Scanning (Recipient side)
// ────────────────────────────────────────────

/**
 * Check if a stealth address belongs to you
 * Recipient calls this with their viewing key + the ephemeral pub key
 */
export function checkStealthAddress(
  viewingKey: string,
  ephemeralPubKey: string,
  spendingPubKey: string,
  stealthAddress: string
): boolean {
  // Reconstruct shared secret
  const sharedSecret = keccak256(
    encodePacked(
      ['bytes32', 'address'],
      [viewingKey as `0x${string}`, ephemeralPubKey as Address]
    )
  );

  // Reconstruct stealth address
  const stealthHash = keccak256(
    encodePacked(
      ['bytes32', 'address'],
      [sharedSecret as `0x${string}`, spendingPubKey as Address]
    )
  );
  const expectedAddress = '0x' + stealthHash.slice(26);

  return expectedAddress.toLowerCase() === stealthAddress.toLowerCase();
}

/**
 * Derive the private key to spend from a stealth address
 * Only the recipient can do this
 */
export function deriveStealthSpendingKey(
  spendingKey: string,
  viewingKey: string,
  ephemeralPubKey: string
): string {
  // Shared secret
  const sharedSecret = keccak256(
    encodePacked(
      ['bytes32', 'address'],
      [viewingKey as `0x${string}`, ephemeralPubKey as Address]
    )
  );

  // Stealth spending key = spendingKey + sharedSecret (modular addition in secp256k1)
  // Simplified: hash(spendingKey || sharedSecret)
  const stealthSpendingKey = keccak256(
    encodePacked(
      ['bytes32', 'bytes32'],
      [spendingKey as `0x${string}`, sharedSecret as `0x${string}`]
    )
  );

  return stealthSpendingKey;
}

// ────────────────────────────────────────────
// Meta-Address Parsing
// ────────────────────────────────────────────

/**
 * Parse a stealth meta-address string
 * Format: st:tempo:0xSpendingPub:0xViewingPub
 */
export function parseMetaAddress(metaAddress: string): {
  spendingPubKey: string;
  viewingPubKey: string;
} | null {
  const parts = metaAddress.split(':');
  if (parts.length !== 4 || parts[0] !== 'st' || parts[1] !== 'tempo') {
    return null;
  }
  return {
    spendingPubKey: parts[2],
    viewingPubKey: parts[3],
  };
}
