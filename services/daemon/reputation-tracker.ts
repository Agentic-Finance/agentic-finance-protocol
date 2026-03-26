/**
 * Agentic Finance — Reputation Tracker
 *
 * Automatically tracks agent transaction history and updates
 * the on-chain reputation accumulator after each payment.
 *
 * Flow:
 * 1. Payment settles on-chain (daemon processes it)
 * 2. ReputationTracker records the claim
 * 3. Poseidon hash chain updated: acc[i] = Poseidon(claim[i], acc[i-1])
 * 4. New accumulator registered on AgentReputationRegistry
 * 5. Agent can now generate ZK reputation proof with updated stats
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const RPC_URL = process.env.RPC_URL || 'https://rpc.moderato.tempo.xyz';
const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
const REPUTATION_REGISTRY = process.env.REPUTATION_REGISTRY_ADDRESS || '0xF3296984cb8785Ab236322658c13051801E58875';

const REGISTRY_ABI = [
    'function registerAccumulator(uint256 agentCommitment, uint256 accumulatorHash) external',
    'function batchRegisterAccumulators(uint256[] calldata commitments, uint256[] calldata accumulators) external',
    'function registeredAccumulators(uint256) view returns (uint256)',
];

const DATA_DIR = path.join(__dirname, '.reputation-data');

// --- Types ---

interface TransactionClaim {
    amount: bigint;
    timestamp: number;
    status: 0 | 1; // 0 = dispute, 1 = success
}

interface AgentReputation {
    agentAddress: string;
    agentSecret: string;
    commitment: string;
    claims: TransactionClaim[];
    accumulatorHash: string;
    totalVolume: bigint;
    txCount: number;
    disputeCount: number;
    lastUpdated: number;
}

// --- Reputation Tracker ---

export class ReputationTracker {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet | null = null;
    private registry: ethers.Contract;
    private agents: Map<string, AgentReputation> = new Map();
    private poseidon: any = null;
    private F: any = null;
    private pendingUpdates: Map<string, string> = new Map(); // commitment -> accumulatorHash

    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        if (PRIVATE_KEY) {
            this.signer = new ethers.Wallet(PRIVATE_KEY, this.provider);
        }
        this.registry = new ethers.Contract(
            REPUTATION_REGISTRY, REGISTRY_ABI,
            this.signer || this.provider
        );

        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        this.loadData();
    }

    /**
     * Initialize Poseidon (lazy load)
     */
    private async ensurePoseidon(): Promise<void> {
        if (this.poseidon) return;
        const { buildPoseidon } = await import('circomlibjs');
        this.poseidon = await buildPoseidon();
        this.F = this.poseidon.F;
    }

    /**
     * Record a successful payment for an agent
     */
    async recordPayment(agentAddress: string, amount: bigint, timestamp?: number): Promise<void> {
        await this.ensurePoseidon();

        const ts = timestamp || Math.floor(Date.now() / 1000);
        const claim: TransactionClaim = { amount, timestamp: ts, status: 1 };

        let agent = this.agents.get(agentAddress.toLowerCase());
        if (!agent) {
            // New agent — create with deterministic secret
            const secret = ethers.keccak256(ethers.toUtf8Bytes('agtfi-rep-' + agentAddress.toLowerCase()));
            const secretBigInt = BigInt(secret) >> BigInt(8);
            const commitHash = this.poseidon([BigInt(agentAddress), secretBigInt]);
            const commitment = this.F.toObject(commitHash).toString();

            agent = {
                agentAddress: agentAddress.toLowerCase(),
                agentSecret: secretBigInt.toString(),
                commitment,
                claims: [],
                accumulatorHash: '0',
                totalVolume: BigInt(0),
                txCount: 0,
                disputeCount: 0,
                lastUpdated: 0,
            };
            this.agents.set(agentAddress.toLowerCase(), agent);
        }

        // Add claim
        agent.claims.push(claim);

        // Update accumulator: acc = Poseidon(claimHash, prevAcc)
        const claimHash = this.poseidon([
            BigInt(agentAddress),
            amount,
            BigInt(ts),
            BigInt(claim.status),
        ]);
        const prevAcc = BigInt(agent.accumulatorHash);
        const newAcc = this.poseidon([this.F.toObject(claimHash), prevAcc]);
        agent.accumulatorHash = this.F.toObject(newAcc).toString();

        // Update stats
        agent.totalVolume += amount;
        agent.txCount++;
        agent.lastUpdated = ts;

        // Queue for on-chain update
        this.pendingUpdates.set(agent.commitment, agent.accumulatorHash);

        // Save to disk
        this.saveData();

        console.log(`[Reputation] Recorded payment for ${agentAddress.slice(0, 10)}... | txCount: ${agent.txCount} | volume: ${agent.totalVolume}`);
    }

    /**
     * Record a dispute for an agent
     */
    async recordDispute(agentAddress: string, amount: bigint, timestamp?: number): Promise<void> {
        await this.ensurePoseidon();

        const ts = timestamp || Math.floor(Date.now() / 1000);
        const agent = this.agents.get(agentAddress.toLowerCase());
        if (!agent) return;

        const claim: TransactionClaim = { amount, timestamp: ts, status: 0 };
        agent.claims.push(claim);

        const claimHash = this.poseidon([
            BigInt(agentAddress),
            amount,
            BigInt(ts),
            BigInt(0),
        ]);
        const prevAcc = BigInt(agent.accumulatorHash);
        const newAcc = this.poseidon([this.F.toObject(claimHash), prevAcc]);
        agent.accumulatorHash = this.F.toObject(newAcc).toString();

        agent.disputeCount++;
        agent.lastUpdated = ts;

        this.pendingUpdates.set(agent.commitment, agent.accumulatorHash);
        this.saveData();

        console.log(`[Reputation] Recorded DISPUTE for ${agentAddress.slice(0, 10)}... | disputes: ${agent.disputeCount}`);
    }

    /**
     * Flush pending accumulator updates to on-chain registry
     */
    async flushToChain(): Promise<string | null> {
        if (this.pendingUpdates.size === 0) {
            console.log('[Reputation] No pending updates');
            return null;
        }

        if (!this.signer) {
            console.error('[Reputation] No signer — cannot update on-chain');
            return null;
        }

        const commitments = Array.from(this.pendingUpdates.keys());
        const accumulators = Array.from(this.pendingUpdates.values());

        console.log(`[Reputation] Flushing ${commitments.length} accumulator updates on-chain...`);

        try {
            if (commitments.length === 1) {
                const tx = await this.registry.registerAccumulator(
                    commitments[0], accumulators[0], { type: 0 }
                );
                const receipt = await tx.wait();
                this.pendingUpdates.clear();
                console.log(`[Reputation] Updated 1 accumulator | TX: ${receipt?.hash}`);
                return receipt?.hash || null;
            } else {
                const tx = await this.registry.batchRegisterAccumulators(
                    commitments, accumulators, { type: 0 }
                );
                const receipt = await tx.wait();
                this.pendingUpdates.clear();
                console.log(`[Reputation] Batch updated ${commitments.length} accumulators | TX: ${receipt?.hash}`);
                return receipt?.hash || null;
            }
        } catch (error: any) {
            console.error(`[Reputation] Flush failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Get agent stats
     */
    getAgentStats(agentAddress: string): {
        txCount: number;
        totalVolume: string;
        disputeCount: number;
        commitment: string;
        accumulatorHash: string;
    } | null {
        const agent = this.agents.get(agentAddress.toLowerCase());
        if (!agent) return null;

        return {
            txCount: agent.txCount,
            totalVolume: agent.totalVolume.toString(),
            disputeCount: agent.disputeCount,
            commitment: agent.commitment,
            accumulatorHash: agent.accumulatorHash,
        };
    }

    /**
     * Get all tracked agents
     */
    getAllAgents(): Array<{ address: string; txCount: number; volume: string; disputes: number }> {
        return Array.from(this.agents.values()).map(a => ({
            address: a.agentAddress,
            txCount: a.txCount,
            volume: a.totalVolume.toString(),
            disputes: a.disputeCount,
        }));
    }

    // --- Disk persistence ---

    private loadData(): void {
        const dataFile = path.join(DATA_DIR, 'agents.json');
        if (!fs.existsSync(dataFile)) return;

        try {
            const raw = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
            for (const agent of raw) {
                agent.totalVolume = BigInt(agent.totalVolume);
                for (const claim of agent.claims) {
                    claim.amount = BigInt(claim.amount);
                }
                this.agents.set(agent.agentAddress, agent);
            }
            console.log(`[Reputation] Loaded ${this.agents.size} agents from cache`);
        } catch {
            console.warn('[Reputation] Failed to load cache');
        }
    }

    private saveData(): void {
        const dataFile = path.join(DATA_DIR, 'agents.json');
        const data = Array.from(this.agents.values()).map(a => ({
            ...a,
            totalVolume: a.totalVolume.toString(),
            claims: a.claims.map(c => ({ ...c, amount: c.amount.toString() })),
        }));
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    }
}

export default ReputationTracker;
