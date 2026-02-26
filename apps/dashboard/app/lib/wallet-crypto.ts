/**
 * Embedded Wallet Crypto Utilities
 * AES-256-GCM encryption for private key storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Get or derive the master encryption key from env
 */
function getMasterKey(): Buffer {
    const envKey = process.env.WALLET_ENCRYPTION_KEY || process.env.DAEMON_PRIVATE_KEY;
    if (!envKey) {
        throw new Error('WALLET_ENCRYPTION_KEY or DAEMON_PRIVATE_KEY must be set');
    }
    // Derive a 32-byte key using SHA-256
    return crypto.createHash('sha256').update(envKey).digest();
}

export interface EncryptedData {
    encrypted: string; // hex
    iv: string;        // hex
    authTag: string;   // hex
}

/**
 * Encrypt a private key using AES-256-GCM
 */
export function encryptPrivateKey(privateKey: string): EncryptedData {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
    };
}

/**
 * Decrypt a private key using AES-256-GCM
 */
export function decryptPrivateKey(encrypted: string, iv: string, authTag: string): string {
    const masterKey = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate a new random wallet (address + encrypted private key)
 * Uses ethers.js Wallet.createRandom()
 */
export async function generateWallet(): Promise<{
    address: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
}> {
    // Dynamic import to avoid issues in edge runtime
    const { ethers } = await import('ethers');

    const wallet = ethers.Wallet.createRandom();
    const { encrypted, iv, authTag } = encryptPrivateKey(wallet.privateKey);

    return {
        address: wallet.address,
        encryptedKey: encrypted,
        iv,
        authTag,
    };
}
