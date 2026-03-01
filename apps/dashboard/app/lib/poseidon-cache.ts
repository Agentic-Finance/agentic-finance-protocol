/**
 * Poseidon Hash Singleton Cache
 *
 * Eliminates the ~200ms cost of calling buildPoseidon() on every request.
 * The WASM module is loaded once and reused for all subsequent calls.
 *
 * Usage:
 *   import { getPoseidon, poseidonHash } from '@/app/lib/poseidon-cache';
 *   const poseidon = await getPoseidon();
 *   const hash = poseidon([input1, input2, ...]);
 *
 * Thread-safe: Multiple concurrent callers will await the same initialization promise.
 */

let cachedPoseidon: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Returns a cached Poseidon instance. First call initializes WASM (~200ms),
 * all subsequent calls return immediately (~0ms).
 */
export async function getPoseidon(): Promise<any> {
    if (cachedPoseidon) return cachedPoseidon;

    // Prevent duplicate initialization from concurrent callers
    if (!initPromise) {
        initPromise = (async () => {
            const { buildPoseidon } = await import('circomlibjs');
            cachedPoseidon = await buildPoseidon();
            return cachedPoseidon;
        })();
    }

    return initPromise;
}

/**
 * Generate a cryptographically secure random field element for ZK circuits.
 * Returns a BigInt string safe for Poseidon hashing (< BN254 field order).
 * 31 bytes = 248 bits — guaranteed under the BN254 prime.
 */
export function generateRandomSecret(): string {
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(31);
    return BigInt("0x" + bytes.toString("hex")).toString();
}

/**
 * Compute a 4-input Poseidon commitment: C = Poseidon(secret, nullifier, amount, recipient)
 * This is the core commitment scheme for ShieldVaultV2.
 */
export async function computeCommitment(
    secret: string,
    nullifier: string,
    amount: string,
    recipient: string
): Promise<{ commitment: string; nullifierHash: string }> {
    const poseidon = await getPoseidon();

    const commitHash = poseidon([BigInt(secret), BigInt(nullifier), BigInt(amount), BigInt(recipient)]);
    const commitment = poseidon.F.toObject(commitHash).toString();

    const nullHash = poseidon([BigInt(nullifier), BigInt(secret)]);
    const nullifierHash = poseidon.F.toObject(nullHash).toString();

    return { commitment, nullifierHash };
}
