/**
 * @agtfi/identity — Agent Identity, Trust & Policy Management
 *
 * Integrates all Phase 2 contracts:
 *   - AgentDIDRegistry: W3C DID registration + Verifiable Credentials
 *   - AgentSpendPolicy: Programmable spend limits + kill switch
 *   - KnowYourAgent: 5-checkpoint trust assessment
 *   - TEERegistry: Hardware attestation
 *   - InferenceRegistry: zkML model verification
 *
 * Usage:
 *   import { AgentIdentity } from '@agtfi/sdk';
 *
 *   const identity = new AgentIdentity({
 *     rpcUrl: 'https://rpc.moderato.tempo.xyz',
 *     privateKey: '0x...',
 *   });
 *
 *   // Register agent DID
 *   await identity.registerDID('did:agtfi:tempo:my-agent');
 *
 *   // Set spend policy
 *   await identity.setSpendPolicy({ maxPerTx: 10000_000000n });
 *
 *   // Check trust tier
 *   const tier = await identity.getTrustTier(agentAddress);
 */

import { ethers } from 'ethers';

// ═══════════════════════════════════════════════════════
// CONTRACT ADDRESSES (Tempo Moderato — Chain 42431)
// ═══════════════════════════════════════════════════════

const CONTRACTS = {
    AGENT_DID_REGISTRY: '0x8510035Fb7B014527a41aBBB592F64d0b5Bf0DD2',
    AGENT_SPEND_POLICY: '0x6c393f33baE036F187200Bd5EB3e9ecE75166951',
    KNOW_YOUR_AGENT: '0x3993737035F952dC1b7A9E88573e7f5E9eCcf885',
    TEE_REGISTRY: '0x3afF0B6eB92a35516C08D4b741aC97f72436b99F',
    INFERENCE_REGISTRY: '0xD99108A49CC88e5363F4e8932Cca84Ab4EF6265F',
} as const;

// ═══════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════

const DID_ABI = [
    'function registerDID(address agent, string calldata didDocument, bytes32 didHash, uint8 agentType) external returns (uint256)',
    'function issueCredential(address agent, bytes32 credentialType, bytes calldata proof, uint256 expiresAt) external',
    'function revokeDID(address agent) external',
    'function getDID(address agent) external view returns (string memory didDocument, bytes32 didHash, uint8 agentType, uint256 registeredAt, bool active)',
    'function verifyCredential(address agent, bytes32 credentialType) external view returns (bool valid, uint256 issuedAt, uint256 expiresAt)',
    'function totalAgents() external view returns (uint256)',
];

const SPEND_ABI = [
    'function setPolicy(address agent, uint256 maxPerTx, uint256 maxPerDay, uint256 maxPerMonth, bool requireZKProof) external',
    'function checkAllowance(address agent, uint256 amount) external view returns (bool allowed, string memory reason)',
    'function recordSpend(address agent, uint256 amount) external',
    'function emergencyStop(address agent) external',
    'function resume(address agent) external',
    'function getPolicy(address agent) external view returns (uint256 maxPerTx, uint256 maxPerDay, uint256 maxPerMonth, bool requireZK, bool stopped, uint256 spentToday, uint256 spentThisMonth)',
];

const KYA_ABI = [
    'function setProvenance(address agent, address deployer, string calldata codeHash) external',
    'function setUserBinding(address agent, address controller) external',
    'function setPermissionScope(address agent, string calldata scope) external',
    'function getTrustTier(address agent) external view returns (uint8 tier, uint256 score, string memory label)',
    'function getFullAssessment(address agent) external view returns (bool hasProvenance, bool hasBinding, bool hasScope, bool hasTelemetry, bool hasRiskScore, uint256 totalScore, uint8 tier)',
];

const TEE_ABI = [
    'function registerAttestation(address agent, bytes32 enclaveHash, uint8 teeType, bytes calldata signature) external',
    'function isAttested(address agent) external view returns (bool)',
    'function getAttestation(address agent) external view returns (bytes32 enclaveHash, uint8 teeType, uint256 attestedAt, bool valid)',
];

const INFERENCE_ABI = [
    'function registerModel(bytes32 modelHash, string calldata modelURI, bytes32 verificationKeyHash) external',
    'function attestInference(address agent, bytes32 modelHash, bytes32 inputHash, bytes32 outputHash, bytes calldata proof) external',
    'function getModelInfo(bytes32 modelHash) external view returns (string memory modelURI, address registeredBy, uint256 registeredAt, uint256 totalInferences)',
    'function getAgentInferences(address agent) external view returns (uint256 totalInferences, bytes32 lastModelUsed, uint256 lastInferenceAt)',
];

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface IdentityConfig {
    rpcUrl?: string;
    privateKey?: string;
    chainId?: number;
}

export interface SpendPolicyConfig {
    maxPerTx?: bigint;
    maxPerDay?: bigint;
    maxPerMonth?: bigint;
    requireZKProof?: boolean;
}

export interface DIDInfo {
    didDocument: string;
    didHash: string;
    agentType: number;
    registeredAt: number;
    active: boolean;
}

export interface TrustTier {
    tier: number;
    score: number;
    label: string;
}

export interface SpendPolicyInfo {
    maxPerTx: string;
    maxPerDay: string;
    maxPerMonth: string;
    requireZK: boolean;
    stopped: boolean;
    spentToday: string;
    spentThisMonth: string;
}

export interface KYAAssessment {
    hasProvenance: boolean;
    hasBinding: boolean;
    hasScope: boolean;
    hasTelemetry: boolean;
    hasRiskScore: boolean;
    totalScore: number;
    tier: number;
}

// Trust tier labels
export const TRUST_TIERS = {
    0: 'Unverified',
    1: 'Basic',
    2: 'Verified',
    3: 'Trusted',
    4: 'Sovereign',
} as const;

// ═══════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════

export class AgentIdentity {
    private provider: ethers.JsonRpcProvider;
    private signer?: ethers.Wallet;
    private didRegistry: ethers.Contract;
    private spendPolicy: ethers.Contract;
    private kyaContract: ethers.Contract;
    private teeRegistry: ethers.Contract;
    private inferenceRegistry: ethers.Contract;

    constructor(config: IdentityConfig = {}) {
        const rpcUrl = config.rpcUrl || 'https://rpc.moderato.tempo.xyz';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);

        if (config.privateKey) {
            this.signer = new ethers.Wallet(config.privateKey, this.provider);
        }

        const s = this.signer || this.provider;
        this.didRegistry = new ethers.Contract(CONTRACTS.AGENT_DID_REGISTRY, DID_ABI, s);
        this.spendPolicy = new ethers.Contract(CONTRACTS.AGENT_SPEND_POLICY, SPEND_ABI, s);
        this.kyaContract = new ethers.Contract(CONTRACTS.KNOW_YOUR_AGENT, KYA_ABI, s);
        this.teeRegistry = new ethers.Contract(CONTRACTS.TEE_REGISTRY, TEE_ABI, s);
        this.inferenceRegistry = new ethers.Contract(CONTRACTS.INFERENCE_REGISTRY, INFERENCE_ABI, s);
    }

    // ─── DID Management ────────────────────────────────

    /** Register a W3C DID for an agent on-chain */
    async registerDID(
        agentAddress: string,
        didUri: string,
        agentType: 0 | 1 | 2 | 3 = 1, // 0=payroll, 1=payment, 2=analytics, 3=orchestration
    ): Promise<{ tokenId: string; txHash: string }> {
        this.requireSigner();
        const didDocument = JSON.stringify({
            '@context': 'https://www.w3.org/ns/did/v1',
            id: didUri,
            controller: `did:agtfi:tempo:${await this.signer!.getAddress()}`,
            verificationMethod: [{
                id: `${didUri}#key-1`,
                type: 'EcdsaSecp256k1VerificationKey2019',
                controller: didUri,
                publicKeyHex: this.signer!.publicKey,
            }],
        });
        const didHash = ethers.keccak256(ethers.toUtf8Bytes(didDocument));

        const tx = await this.didRegistry.registerDID(agentAddress, didDocument, didHash, agentType, { type: 0 });
        const receipt = await tx.wait();

        // Parse token ID from event
        const tokenId = receipt?.logs?.[0]?.topics?.[3] || '0';
        return { tokenId, txHash: receipt?.hash || '' };
    }

    /** Get DID info for an agent */
    async getDID(agentAddress: string): Promise<DIDInfo> {
        const [didDocument, didHash, agentType, registeredAt, active] =
            await this.didRegistry.getDID(agentAddress);
        return {
            didDocument,
            didHash: didHash.toString(),
            agentType: Number(agentType),
            registeredAt: Number(registeredAt),
            active,
        };
    }

    /** Issue a Verifiable Credential to an agent */
    async issueCredential(
        agentAddress: string,
        credentialType: string,
        proof: string,
        expiresAt: number,
    ): Promise<string> {
        this.requireSigner();
        const typeHash = ethers.keccak256(ethers.toUtf8Bytes(credentialType));
        const tx = await this.didRegistry.issueCredential(
            agentAddress, typeHash, ethers.toUtf8Bytes(proof), expiresAt, { type: 0 }
        );
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    /** Verify a credential for an agent */
    async verifyCredential(agentAddress: string, credentialType: string): Promise<{
        valid: boolean;
        issuedAt: number;
        expiresAt: number;
    }> {
        const typeHash = ethers.keccak256(ethers.toUtf8Bytes(credentialType));
        const [valid, issuedAt, expiresAt] = await this.didRegistry.verifyCredential(agentAddress, typeHash);
        return { valid, issuedAt: Number(issuedAt), expiresAt: Number(expiresAt) };
    }

    /** Get total registered agents */
    async totalAgents(): Promise<number> {
        return Number(await this.didRegistry.totalAgents());
    }

    // ─── Spend Policy ──────────────────────────────────

    /** Set spend limits for an agent */
    async setSpendPolicy(agentAddress: string, policy: SpendPolicyConfig): Promise<string> {
        this.requireSigner();
        const tx = await this.spendPolicy.setPolicy(
            agentAddress,
            policy.maxPerTx || 0,
            policy.maxPerDay || 0,
            policy.maxPerMonth || 0,
            policy.requireZKProof || false,
            { type: 0 },
        );
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    /** Check if an agent can spend a given amount */
    async checkAllowance(agentAddress: string, amount: bigint): Promise<{
        allowed: boolean;
        reason: string;
    }> {
        const [allowed, reason] = await this.spendPolicy.checkAllowance(agentAddress, amount);
        return { allowed, reason };
    }

    /** Get current spend policy for an agent */
    async getSpendPolicy(agentAddress: string): Promise<SpendPolicyInfo> {
        const [maxPerTx, maxPerDay, maxPerMonth, requireZK, stopped, spentToday, spentThisMonth] =
            await this.spendPolicy.getPolicy(agentAddress);
        return {
            maxPerTx: maxPerTx.toString(),
            maxPerDay: maxPerDay.toString(),
            maxPerMonth: maxPerMonth.toString(),
            requireZK,
            stopped,
            spentToday: spentToday.toString(),
            spentThisMonth: spentThisMonth.toString(),
        };
    }

    /** Emergency stop an agent's spending */
    async emergencyStop(agentAddress: string): Promise<string> {
        this.requireSigner();
        const tx = await this.spendPolicy.emergencyStop(agentAddress, { type: 0 });
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    /** Resume an agent's spending after emergency stop */
    async resume(agentAddress: string): Promise<string> {
        this.requireSigner();
        const tx = await this.spendPolicy.resume(agentAddress, { type: 0 });
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    // ─── Know Your Agent (KYA) ─────────────────────────

    /** Get trust tier for an agent (0-4) */
    async getTrustTier(agentAddress: string): Promise<TrustTier> {
        const [tier, score, label] = await this.kyaContract.getTrustTier(agentAddress);
        return { tier: Number(tier), score: Number(score), label };
    }

    /** Get full KYA assessment (5 checkpoints) */
    async getFullAssessment(agentAddress: string): Promise<KYAAssessment> {
        const result = await this.kyaContract.getFullAssessment(agentAddress);
        return {
            hasProvenance: result[0],
            hasBinding: result[1],
            hasScope: result[2],
            hasTelemetry: result[3],
            hasRiskScore: result[4],
            totalScore: Number(result[5]),
            tier: Number(result[6]),
        };
    }

    /** Set agent provenance (who deployed it, code hash) */
    async setProvenance(agentAddress: string, codeHash: string): Promise<string> {
        this.requireSigner();
        const deployer = await this.signer!.getAddress();
        const tx = await this.kyaContract.setProvenance(agentAddress, deployer, codeHash, { type: 0 });
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    /** Bind an agent to a controller (human or DAO) */
    async setUserBinding(agentAddress: string, controller: string): Promise<string> {
        this.requireSigner();
        const tx = await this.kyaContract.setUserBinding(agentAddress, controller, { type: 0 });
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    // ─── TEE Attestation ───────────────────────────────

    /** Check if an agent has valid TEE attestation */
    async isAttested(agentAddress: string): Promise<boolean> {
        return this.teeRegistry.isAttested(agentAddress);
    }

    /** Register a TEE attestation for an agent */
    async registerTEEAttestation(
        agentAddress: string,
        enclaveHash: string,
        teeType: 0 | 1 | 2 | 3, // 0=SGX, 1=TDX, 2=SEV-SNP, 3=ARM CCA
        signature: string,
    ): Promise<string> {
        this.requireSigner();
        const tx = await this.teeRegistry.registerAttestation(
            agentAddress, enclaveHash, teeType, signature, { type: 0 }
        );
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    // ─── Inference Attestation ─────────────────────────

    /** Register an AI model for verification */
    async registerModel(modelHash: string, modelURI: string): Promise<string> {
        this.requireSigner();
        const vkHash = ethers.keccak256(ethers.toUtf8Bytes(modelURI + ':vk'));
        const tx = await this.inferenceRegistry.registerModel(modelHash, modelURI, vkHash, { type: 0 });
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    /** Attest an AI inference execution */
    async attestInference(
        agentAddress: string,
        modelHash: string,
        inputHash: string,
        outputHash: string,
        proof: string = '0x',
    ): Promise<string> {
        this.requireSigner();
        const tx = await this.inferenceRegistry.attestInference(
            agentAddress, modelHash, inputHash, outputHash,
            ethers.toUtf8Bytes(proof), { type: 0 }
        );
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    /** Get agent inference stats */
    async getAgentInferences(agentAddress: string): Promise<{
        totalInferences: number;
        lastModelUsed: string;
        lastInferenceAt: number;
    }> {
        const [total, lastModel, lastTime] = await this.inferenceRegistry.getAgentInferences(agentAddress);
        return {
            totalInferences: Number(total),
            lastModelUsed: lastModel,
            lastInferenceAt: Number(lastTime),
        };
    }

    // ─── Utilities ─────────────────────────────────────

    private requireSigner(): void {
        if (!this.signer) {
            throw new Error('Private key required for write operations. Pass privateKey in config.');
        }
    }

    /** Get the connected wallet address */
    get address(): string {
        return this.signer?.address || '';
    }
}

export default AgentIdentity;
