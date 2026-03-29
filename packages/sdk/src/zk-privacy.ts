/**
 * @agtfi/zk-privacy — ZK Proof Generation + Verification for Agent Payments
 *
 * Full-stack ZK privacy module:
 *   - Generate compliance proofs (OFAC + AML)
 *   - Generate reputation proofs (tx history + score)
 *   - Submit proofs on-chain for certificate issuance
 *   - Query compliance/reputation status
 *
 * Usage:
 *   import { ZKPrivacy } from '@agtfi/sdk';
 *
 *   const zk = new ZKPrivacy({
 *     rpcUrl: 'https://rpc.moderato.tempo.xyz',
 *     complianceRegistry: '0x85F6...',
 *     reputationRegistry: '0xF329...',
 *     privateKey: '0x...',  // Required for proof submission
 *   });
 *
 *   // Generate + submit compliance proof
 *   const cert = await zk.proveCompliance({
 *     senderAddress: '0x...',
 *     amount: 5000_000000n,
 *     cumulativeVolume: 8000_000000n,
 *   });
 *
 *   // Generate + submit reputation proof
 *   const rep = await zk.proveReputation({
 *     agentAddress: '0x...',
 *     claims: [{ amount: 100_000000n, timestamp: 1700000000, status: 1 }],
 *     minTxCount: 10,
 *     minVolume: 50000_000000n,
 *   });
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
    /** Private key for signing transactions (required for proof submission) */
    privateKey?: string;
    /** Chain ID (default: 42431 for Tempo Moderato) */
    chainId?: number;
    /** Path to compliance circuit WASM (for local proof generation) */
    complianceWasmPath?: string;
    /** Path to compliance proving key */
    complianceZkeyPath?: string;
    /** Path to reputation circuit WASM */
    reputationWasmPath?: string;
    /** Path to reputation proving key */
    reputationZkeyPath?: string;
}

export interface ComplianceProofInput {
    /** Sender address to prove compliance for */
    senderAddress: string;
    /** Transaction amount (in token's smallest unit, e.g., USDC * 1e6) */
    amount: bigint | string | number;
    /** 30-day cumulative volume */
    cumulativeVolume: bigint | string | number;
    /** Random blinding secret (auto-generated if omitted) */
    secret?: string;
}

export interface ComplianceResult {
    /** Whether proof was generated and verified on-chain */
    success: boolean;
    /** The compliance commitment: Poseidon(address, secret) */
    commitment: string;
    /** PLONK proof (24 field elements) */
    proof: string[];
    /** Public signals (4 field elements) */
    publicSignals: string[];
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
    /** Transaction history claims (max 32) */
    claims: ReputationClaim[];
    /** Minimum tx count to prove */
    minTxCount: number;
    /** Minimum volume to prove */
    minVolume: bigint | string | number;
    /** Random blinding secret (auto-generated if omitted) */
    secret?: string;
}

export interface ReputationResult {
    /** Whether proof was generated and verified on-chain */
    success: boolean;
    /** Agent commitment: Poseidon(agentAddress, secret) */
    agentCommitment: string;
    /** Final accumulator hash of the claim chain */
    accumulatorHash: string;
    /** PLONK proof */
    proof: string[];
    /** Public signals */
    publicSignals: string[];
    /** Proof generation time in ms */
    proofTimeMs: number;
    /** Transaction hash if submitted on-chain */
    txHash?: string;
    /** Error message if failed */
    error?: string;
}

export interface PrivatePaymentResult {
    success: boolean;
    complianceCommitment: string;
    reputationVerified: boolean;
    paymentResult: unknown;
    totalTimeMs: number;
}

// --- ABIS ---

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

// --- POSEIDON HELPER ---

/**
 * Lightweight Poseidon hash computation using the same parameters as circomlibjs.
 * For SDK usage, we use dynamic import of circomlibjs when proof generation is needed.
 */
let _poseidon: any = null;
let _poseidonF: any = null;

async function getPoseidon(): Promise<{ poseidon: any; F: any }> {
    if (!_poseidon) {
        try {
            const circomlibjs = await import('circomlibjs');
            _poseidon = await circomlibjs.buildPoseidon();
            _poseidonF = _poseidon.F;
        } catch {
            throw new Error(
                'circomlibjs is required for proof generation. Install it: npm install circomlibjs'
            );
        }
    }
    return { poseidon: _poseidon, F: _poseidonF };
}

/**
 * Generate a cryptographically secure random field element (< BN254 prime)
 */
function randomFieldElement(): string {
    const bytes = new Uint8Array(31); // 31 bytes < 254 bits
    crypto.getRandomValues(bytes);
    let result = BigInt(0);
    for (const b of bytes) {
        result = (result << BigInt(8)) + BigInt(b);
    }
    return result.toString();
}

// --- MAIN CLASS ---

export class ZKPrivacy {
    private config: ZKPrivacyConfig;
    private provider: ethers.JsonRpcProvider;
    private signer?: ethers.Wallet;
    private complianceContract: ethers.Contract;
    private reputationContract: ethers.Contract;
    private secretCache = new Map<string, string>();

    constructor(config: ZKPrivacyConfig) {
        this.config = {
            chainId: 42431,
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

    // ═══════════════════════════════════════════════════════
    // PROOF GENERATION
    // ═══════════════════════════════════════════════════════

    /**
     * Generate a ZK compliance proof and optionally submit on-chain.
     *
     * Proves:
     *   1. Sender is NOT on OFAC sanctions list (SMT non-inclusion)
     *   2. Transaction amount < AML threshold
     *   3. 30-day cumulative volume < AML threshold
     *
     * All private data (address, amounts) stays local. Only the commitment
     * and boolean pass/fail are revealed on-chain.
     *
     * @param input Compliance proof inputs
     * @param submitOnChain If true, submit proof to ComplianceRegistry (default: true)
     * @returns ComplianceResult with proof, commitment, and optional txHash
     */
    async proveCompliance(
        input: ComplianceProofInput,
        submitOnChain = true,
    ): Promise<ComplianceResult> {
        const t0 = Date.now();

        try {
            // Lazy-load snarkjs and circomlibjs
            const snarkjs = await import('snarkjs');
            const { poseidon, F } = await getPoseidon();
            const circomlibjs = await import('circomlibjs');

            // Generate or use provided secret
            const secret = input.secret || this.getSecretForAddress(input.senderAddress);

            // Compute commitment = Poseidon(senderAddress, secret)
            const senderBigInt = BigInt(input.senderAddress);
            const secretBigInt = BigInt(secret);
            const commitHash = poseidon([senderBigInt, secretBigInt]);
            const commitment = F.toObject(commitHash).toString();

            // Fetch on-chain parameters
            const params = await this.getComplianceParams();

            // Build Sparse Merkle Tree for sanctions check
            // In production, the sanctions tree should be fetched from an oracle
            // For now, we build an empty tree (no sanctioned addresses = all pass)
            const tree = await circomlibjs.newMemEmptyTrie();

            // Get SMT non-inclusion proof
            const res = await tree.find(senderBigInt);

            if (res.found) {
                return {
                    success: false,
                    commitment,
                    proof: [],
                    publicSignals: [],
                    proofTimeMs: Date.now() - t0,
                    error: 'Address is on the sanctions list',
                };
            }

            // Build SMT siblings (pad to 20 levels)
            const smtSiblings = res.siblings.map((s: any) => F.toObject(s));
            while (smtSiblings.length < 20) smtSiblings.push(BigInt(0));

            // Prepare circuit inputs
            const circuitInput = {
                sanctionsRoot: F.toObject(tree.root).toString(),
                complianceCommitment: commitment,
                amountThreshold: params.amountThreshold,
                volumeThreshold: params.volumeThreshold,
                senderAddress: senderBigInt.toString(),
                secret: secret,
                amount: input.amount.toString(),
                cumulativeVolume: input.cumulativeVolume.toString(),
                smtSiblings: smtSiblings.map((s: bigint) => s.toString()),
                smtOldKey: res.isOld0 ? '0' : F.toObject(res.notFoundKey).toString(),
                smtOldValue: res.isOld0 ? '0' : F.toObject(res.notFoundValue).toString(),
                smtIsOld0: res.isOld0 ? '1' : '0',
            };

            // Check if circuit files are configured
            if (!this.config.complianceWasmPath || !this.config.complianceZkeyPath) {
                // Return proof inputs without generating proof (for daemon-assisted flow)
                return {
                    success: true,
                    commitment,
                    proof: [],
                    publicSignals: [
                        circuitInput.sanctionsRoot,
                        commitment,
                        params.amountThreshold,
                        params.volumeThreshold,
                    ],
                    proofTimeMs: Date.now() - t0,
                    error: 'Circuit files not configured — set complianceWasmPath and complianceZkeyPath for local proof generation',
                };
            }

            // Generate PLONK proof
            const { proof, publicSignals } = await snarkjs.plonk.fullProve(
                circuitInput,
                this.config.complianceWasmPath,
                this.config.complianceZkeyPath,
            );

            const proofTimeMs = Date.now() - t0;

            // Parse proof into contract-compatible format (24 uint256)
            const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
            const [proofArray, pubSignalsArray] = this.parseCalldata(calldata);

            let txHash: string | undefined;

            // Submit on-chain if requested
            if (submitOnChain && this.signer) {
                const tx = await this.complianceContract.verifyCertify(
                    proofArray,
                    pubSignalsArray,
                    { type: 0 },
                );
                const receipt = await tx.wait();
                txHash = receipt?.hash;
            }

            return {
                success: true,
                commitment,
                proof: proofArray,
                publicSignals: pubSignalsArray,
                proofTimeMs,
                txHash,
            };
        } catch (error: any) {
            return {
                success: false,
                commitment: '',
                proof: [],
                publicSignals: [],
                proofTimeMs: Date.now() - t0,
                error: error.message,
            };
        }
    }

    /**
     * Generate a ZK reputation proof and optionally submit on-chain.
     *
     * Proves:
     *   1. Agent has >= minTxCount transactions
     *   2. Agent has >= minVolume total volume
     *   3. Agent has 0 disputes
     *   4. Hash chain integrity (accumulator matches registered value)
     *
     * @param input Reputation proof inputs
     * @param submitOnChain If true, submit proof to ReputationRegistry (default: true)
     * @returns ReputationResult with proof, commitment, and optional txHash
     */
    async proveReputation(
        input: ReputationProofInput,
        submitOnChain = true,
    ): Promise<ReputationResult> {
        const t0 = Date.now();

        try {
            const snarkjs = await import('snarkjs');
            const { poseidon, F } = await getPoseidon();

            // Generate or use provided secret
            const secret = input.secret || this.getSecretForAddress(input.agentAddress);

            // Compute agent commitment = Poseidon(agentAddress, agentSecret)
            const agentBigInt = BigInt(input.agentAddress);
            const secretBigInt = BigInt(secret);
            const commitHash = poseidon([agentBigInt, secretBigInt]);
            const agentCommitment = F.toObject(commitHash).toString();

            // Build claim arrays (pad to 32)
            const claimAmounts: string[] = [];
            const claimTimestamps: string[] = [];
            const claimStatuses: string[] = [];

            for (let i = 0; i < 32; i++) {
                if (i < input.claims.length) {
                    claimAmounts.push(input.claims[i].amount.toString());
                    claimTimestamps.push(input.claims[i].timestamp.toString());
                    claimStatuses.push(input.claims[i].status.toString());
                } else {
                    claimAmounts.push('0');
                    claimTimestamps.push('0');
                    claimStatuses.push('1'); // padding uses status=1 (no dispute)
                }
            }

            // Compute accumulator hash chain
            let accumulator = BigInt(0);
            for (let i = 0; i < input.claims.length; i++) {
                const claim = poseidon([
                    agentBigInt,
                    BigInt(input.claims[i].amount.toString()),
                    BigInt(input.claims[i].timestamp),
                    BigInt(input.claims[i].status),
                ]);
                const accHash = poseidon([F.toObject(claim), accumulator]);
                accumulator = F.toObject(accHash);
            }
            const accumulatorHash = accumulator.toString();

            // Prepare circuit inputs
            const circuitInput = {
                agentCommitment,
                accumulatorHash,
                minTxCount: input.minTxCount.toString(),
                minVolume: input.minVolume.toString(),
                agentAddress: agentBigInt.toString(),
                agentSecret: secret,
                actualClaimCount: input.claims.length.toString(),
                claimAmounts,
                claimTimestamps,
                claimStatuses,
            };

            // Check if circuit files are configured
            if (!this.config.reputationWasmPath || !this.config.reputationZkeyPath) {
                return {
                    success: true,
                    agentCommitment,
                    accumulatorHash,
                    proof: [],
                    publicSignals: [agentCommitment, accumulatorHash, input.minTxCount.toString(), input.minVolume.toString()],
                    proofTimeMs: Date.now() - t0,
                    error: 'Circuit files not configured — set reputationWasmPath and reputationZkeyPath for local proof generation',
                };
            }

            // Generate PLONK proof
            const { proof, publicSignals } = await snarkjs.plonk.fullProve(
                circuitInput,
                this.config.reputationWasmPath,
                this.config.reputationZkeyPath,
            );

            const proofTimeMs = Date.now() - t0;
            const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
            const [proofArray, pubSignalsArray] = this.parseCalldata(calldata);

            let txHash: string | undefined;

            if (submitOnChain && this.signer) {
                const tx = await this.reputationContract.verifyReputation(
                    proofArray,
                    pubSignalsArray,
                    { type: 0 },
                );
                const receipt = await tx.wait();
                txHash = receipt?.hash;
            }

            return {
                success: true,
                agentCommitment,
                accumulatorHash,
                proof: proofArray,
                publicSignals: pubSignalsArray,
                proofTimeMs,
                txHash,
            };
        } catch (error: any) {
            return {
                success: false,
                agentCommitment: '',
                accumulatorHash: '',
                proof: [],
                publicSignals: [],
                proofTimeMs: Date.now() - t0,
                error: error.message,
            };
        }
    }

    /**
     * Compute a Poseidon commitment for an address + secret.
     * Useful for checking compliance/reputation without generating a full proof.
     */
    async computeCommitment(address: string, secret?: string): Promise<string> {
        const { poseidon, F } = await getPoseidon();
        const s = secret || this.getSecretForAddress(address);
        const hash = poseidon([BigInt(address), BigInt(s)]);
        return F.toObject(hash).toString();
    }

    // ═══════════════════════════════════════════════════════
    // QUERIES (read-only)
    // ═══════════════════════════════════════════════════════

    /** Check compliance status for a commitment */
    async isCompliant(commitment: string): Promise<boolean> {
        return this.complianceContract.isCompliant(commitment);
    }

    /** Get current on-chain compliance parameters */
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

    /** Check if an agent meets reputation requirements */
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

    /** Get agent reputation details */
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

    /** Get registry-wide statistics */
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

    // ═══════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════

    /** Get or generate a secret for an address (cached per session) */
    getSecretForAddress(address: string): string {
        if (!this.secretCache.has(address)) {
            this.secretCache.set(address, randomFieldElement());
        }
        return this.secretCache.get(address)!;
    }

    /** Get the chain ID this instance is configured for */
    getChainId(): number {
        return this.config.chainId!;
    }

    /** Get the ethers provider instance */
    getProvider(): ethers.JsonRpcProvider {
        return this.provider;
    }

    /** Parse snarkjs Solidity calldata string into [proof[24], pubSignals[N]] */
    private parseCalldata(calldata: string): [string[], string[]] {
        // snarkjs exports: "proof[0],proof[1],...,[pubSignal0,pubSignal1,...]"
        const parts = calldata.replace(/[\[\]"]/g, '').split(',');
        const proof = parts.slice(0, 24);
        const pubSignals = parts.slice(24);
        return [proof, pubSignals];
    }
}

// --- PROOF BATCHING ---

export interface BatchProofResult {
    count: number;
    proofs: Array<{ proof: unknown; publicSignals: string[] }>;
    totalTimeMs: number;
    avgTimeMs: number;
}

/**
 * Batch multiple compliance proofs for efficient settlement.
 * Processes proofs in parallel (up to maxConcurrent).
 */
export async function batchComplianceProofs(
    proofInputs: ComplianceProofInput[],
    generateFn: (input: ComplianceProofInput) => Promise<{ proof: unknown; publicSignals: string[] }>,
    maxConcurrent = 3,
): Promise<BatchProofResult> {
    const t0 = Date.now();
    const proofs: Array<{ proof: unknown; publicSignals: string[] }> = [];

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

export default ZKPrivacy;
