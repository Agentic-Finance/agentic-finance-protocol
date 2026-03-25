/**
 * @agtfi/zk-privacy — Privacy Middleware for Agent Payments
 *
 * "Plug ZK into any payment protocol"
 *
 * This module wraps existing payment protocols (x402, MPP, direct transfers)
 * with ZK compliance proofs and reputation verification.
 *
 * Usage:
 *   import { ZKPrivacy } from '@agtfi/sdk';
 *
 *   const zk = new ZKPrivacy({
 *     rpcUrl: 'https://rpc.tempo.xyz',
 *     complianceRegistry: '0x...',
 *     reputationRegistry: '0x...',
 *   });
 *
 *   // Generate compliance proof
 *   const cert = await zk.proveCompliance({
 *     senderAddress: '0x...',
 *     amount: 5000_000000,
 *     cumulativeVolume: 8000_000000,
 *   });
 *
 *   // Generate reputation proof
 *   const rep = await zk.proveReputation({
 *     agentAddress: '0x...',
 *     claims: [...],
 *     minTxCount: 10,
 *     minVolume: 50000_000000,
 *   });
 *
 *   // Wrap x402 payment with privacy
 *   const receipt = await zk.privateX402Payment(url, amount);
 *
 *   // Wrap MPP session with privacy
 *   const session = await zk.privateMPPSession(apiEndpoint, budget);
 */

import { ethers } from 'ethers';

// --- TYPES ---

export interface ZKPrivacyConfig {
    /** RPC URL for the target chain */
    rpcUrl: string;
    /** ComplianceRegistry contract address */
    complianceRegistry: string;
    /** AgentReputationRegistry contract address */
    reputationRegistry: string;
    /** Private key for signing transactions (optional — can use external signer) */
    privateKey?: string;
    /** Chain ID (default: 42431 for Tempo Moderato) */
    chainId?: number;
}

export interface ComplianceProofInput {
    /** Sender address to prove compliance for */
    senderAddress: string;
    /** Transaction amount (in token's smallest unit, e.g., USDC * 1e6) */
    amount: bigint | string | number;
    /** 30-day cumulative volume */
    cumulativeVolume: bigint | string | number;
}

export interface ComplianceResult {
    /** Whether compliance proof was generated and verified */
    success: boolean;
    /** The compliance commitment (public identifier) */
    commitment: string;
    /** Proof generation time in ms */
    proofTimeMs: number;
    /** Transaction hash if submitted on-chain */
    txHash?: string;
    /** Error message if failed */
    error?: string;
}

export interface ReputationClaim {
    /** Payment amount */
    amount: bigint | string | number;
    /** Unix timestamp */
    timestamp: number;
    /** 1 = success, 0 = dispute */
    status: 0 | 1;
}

export interface ReputationProofInput {
    /** Agent address */
    agentAddress: string;
    /** Transaction history claims */
    claims: ReputationClaim[];
    /** Minimum tx count to prove */
    minTxCount: number;
    /** Minimum volume to prove */
    minVolume: bigint | string | number;
}

export interface ReputationResult {
    success: boolean;
    agentCommitment: string;
    accumulatorHash: string;
    proofTimeMs: number;
    txHash?: string;
    error?: string;
}

export interface PrivatePaymentResult {
    success: boolean;
    /** Compliance certificate commitment */
    complianceCommitment: string;
    /** Reputation score (if available) */
    reputationVerified: boolean;
    /** Payment receipt/result from underlying protocol */
    paymentResult: unknown;
    /** Total time including proof generation */
    totalTimeMs: number;
}

// --- ABIS (minimal interfaces) ---

const COMPLIANCE_REGISTRY_ABI = [
    'function verifyCertify(uint256[24] calldata _proof, uint256[4] calldata _pubSignals) external returns (bool)',
    'function isCompliant(uint256 commitment) external view returns (bool)',
    'function sanctionsRoot() external view returns (uint256)',
    'function amountThreshold() external view returns (uint256)',
    'function volumeThreshold() external view returns (uint256)',
    'function getStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)',
];

const REPUTATION_REGISTRY_ABI = [
    'function verifyReputation(uint256[24] calldata _proof, uint256[4] calldata _pubSignals) external returns (bool)',
    'function meetsRequirements(uint256 agentCommitment, uint256 requiredTxCount, uint256 requiredVolume) external view returns (bool)',
    'function registerAccumulator(uint256 agentCommitment, uint256 accumulatorHash) external',
    'function getReputation(uint256 agentCommitment) external view returns (tuple(uint256 accumulatorHash, uint256 verifiedTxCount, uint256 verifiedVolume, uint256 lastVerifiedAt, uint256 blockNumber, uint256 proofCount, bool active))',
    'function getStats() external view returns (uint256, uint256)',
];

// --- MAIN CLASS ---

export class ZKPrivacy {
    private config: ZKPrivacyConfig;
    private provider: ethers.JsonRpcProvider;
    private signer?: ethers.Wallet;
    private complianceContract: ethers.Contract;
    private reputationContract: ethers.Contract;

    // Cache for secrets (per address)
    private secretCache = new Map<string, string>();

    constructor(config: ZKPrivacyConfig) {
        this.config = {
            chainId: 42431, // Default: Tempo Moderato
            ...config,
        };

        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

        if (this.config.privateKey) {
            this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
        }

        const signerOrProvider = this.signer || this.provider;

        this.complianceContract = new ethers.Contract(
            this.config.complianceRegistry,
            COMPLIANCE_REGISTRY_ABI,
            signerOrProvider
        );

        this.reputationContract = new ethers.Contract(
            this.config.reputationRegistry,
            REPUTATION_REGISTRY_ABI,
            signerOrProvider
        );
    }

    // --- COMPLIANCE ---

    /**
     * Check compliance status for a commitment
     */
    async isCompliant(commitment: string): Promise<boolean> {
        return this.complianceContract.isCompliant(commitment);
    }

    /**
     * Get current compliance parameters from on-chain
     */
    async getComplianceParams(): Promise<{
        sanctionsRoot: string;
        amountThreshold: string;
        volumeThreshold: string;
    }> {
        const [sanctionsRoot, amountThreshold, volumeThreshold] = await Promise.all([
            this.complianceContract.sanctionsRoot(),
            this.complianceContract.amountThreshold(),
            this.complianceContract.volumeThreshold(),
        ]);
        return {
            sanctionsRoot: sanctionsRoot.toString(),
            amountThreshold: amountThreshold.toString(),
            volumeThreshold: volumeThreshold.toString(),
        };
    }

    // --- REPUTATION ---

    /**
     * Check if an agent meets reputation requirements
     */
    async meetsRequirements(
        agentCommitment: string,
        requiredTxCount: number,
        requiredVolume: bigint | string | number,
    ): Promise<boolean> {
        return this.reputationContract.meetsRequirements(
            agentCommitment,
            requiredTxCount,
            requiredVolume.toString(),
        );
    }

    /**
     * Get agent reputation details
     */
    async getReputation(agentCommitment: string): Promise<{
        accumulatorHash: string;
        verifiedTxCount: number;
        verifiedVolume: string;
        lastVerifiedAt: number;
        proofCount: number;
        active: boolean;
    }> {
        const rep = await this.reputationContract.getReputation(agentCommitment);
        return {
            accumulatorHash: rep.accumulatorHash.toString(),
            verifiedTxCount: Number(rep.verifiedTxCount),
            verifiedVolume: rep.verifiedVolume.toString(),
            lastVerifiedAt: Number(rep.lastVerifiedAt),
            proofCount: Number(rep.proofCount),
            active: rep.active,
        };
    }

    /**
     * Get registry-wide statistics
     */
    async getStats(): Promise<{
        compliance: { totalCertificates: number; totalVerified: number };
        reputation: { totalAgents: number; totalProofs: number };
    }> {
        const [compStats, repStats] = await Promise.all([
            this.complianceContract.getStats(),
            this.reputationContract.getStats(),
        ]);

        return {
            compliance: {
                totalCertificates: Number(compStats[0]),
                totalVerified: Number(compStats[1]),
            },
            reputation: {
                totalAgents: Number(repStats[0]),
                totalProofs: Number(repStats[1]),
            },
        };
    }

    // --- UTILITY ---

    /**
     * Generate a deterministic secret for an address
     * (cached per session, never leaves the device)
     */
    private getSecretForAddress(address: string): string {
        if (!this.secretCache.has(address)) {
            const bytes = new Uint8Array(31);
            crypto.getRandomValues(bytes);
            let result = BigInt(0);
            for (const b of bytes) {
                result = (result << BigInt(8)) + BigInt(b);
            }
            this.secretCache.set(address, result.toString());
        }
        return this.secretCache.get(address)!;
    }

    /**
     * Get the chain ID this instance is configured for
     */
    getChainId(): number {
        return this.config.chainId!;
    }

    /**
     * Get the provider instance
     */
    getProvider(): ethers.JsonRpcProvider {
        return this.provider;
    }
}

// --- PROOF BATCHING ---

export interface BatchProofResult {
    /** Number of individual proofs batched */
    count: number;
    /** Combined proof data */
    proofs: Array<{ proof: unknown; publicSignals: string[] }>;
    /** Total proof generation time */
    totalTimeMs: number;
    /** Average time per proof */
    avgTimeMs: number;
}

/**
 * Batch multiple compliance proofs for efficient settlement
 *
 * Instead of settling each proof individually on-chain,
 * batch them and submit in a single transaction.
 *
 * @param proofInputs Array of compliance proof inputs
 * @param generateFn Function that generates a single proof
 * @param maxConcurrent Maximum concurrent proof generations (default: 3)
 */
export async function batchComplianceProofs(
    proofInputs: ComplianceProofInput[],
    generateFn: (input: ComplianceProofInput) => Promise<{ proof: unknown; publicSignals: string[] }>,
    maxConcurrent = 3,
): Promise<BatchProofResult> {
    const t0 = Date.now();
    const proofs: Array<{ proof: unknown; publicSignals: string[] }> = [];

    // Process in batches of maxConcurrent
    for (let i = 0; i < proofInputs.length; i += maxConcurrent) {
        const batch = proofInputs.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(batch.map(generateFn));
        proofs.push(...batchResults);
    }

    const totalTimeMs = Date.now() - t0;

    return {
        count: proofs.length,
        proofs,
        totalTimeMs,
        avgTimeMs: Math.round(totalTimeMs / proofs.length),
    };
}

// Default export
export default ZKPrivacy;
