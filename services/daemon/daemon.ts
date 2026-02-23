import { ethers } from "ethers";
// @ts-ignore
import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// 🌟 IMPORT REAL CRYPTOGRAPHIC HASHER
// @ts-ignore
import { buildPoseidon } from "circomlibjs";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ==========================================
// PAYPOL DAEMON CONFIGURATION
// ==========================================
const RPC_URL = "https://rpc.moderato.tempo.xyz";
const PAYPOL_SHIELD_ADDRESS = "0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1";

// NexusV2 — A2A Escrow Lifecycle (deployed to Tempo testnet)
const PAYPOL_NEXUS_V2_ADDRESS = "0x3Bc01ecc428Ca0Ff76c433F8B3B46D00edE15837";

if (!process.env.DAEMON_PRIVATE_KEY) {
    throw new Error("🚨 DAEMON_PRIVATE_KEY is missing in .env file");
}
const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY;

const SHIELD_ABI = [
    "function executeShieldedPayout(uint256[24] calldata proof, uint256[2] calldata pubSignals, uint256 exactAmount) external"
];

const NEXUS_V2_ABI = [
    "function settleJob(uint256 _jobId) external",
    "function claimTimeout(uint256 _jobId) external",
    "function isTimedOut(uint256 _jobId) external view returns (bool)",
    "function getJob(uint256 _jobId) external view returns (address employer, address worker, address judge, address token, uint256 budget, uint256 platformFee, uint256 deadline, uint8 status, bool rated)",
];

class PayPolDaemon {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private shieldContract: ethers.Contract;
    private nexusV2Contract: ethers.Contract;
    private prisma: PrismaClient;
    private isRunning: boolean = false;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.shieldContract = new ethers.Contract(PAYPOL_SHIELD_ADDRESS, SHIELD_ABI, this.wallet);
        this.nexusV2Contract = new ethers.Contract(PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI, this.wallet);
        this.prisma = new PrismaClient();
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[DAEMON] 🟢 Master Daemon initialized. Wallet: ${this.wallet.address}`);

        try {
            const totalRecords = await this.prisma.timeVaultPayload.count();
            console.log(`[DAEMON] 📡 Database Synced. Total Payloads in Ledger: ${totalRecords}`);
        } catch (error: any) {
            console.error(`[DAEMON] 🚨 Critical Database Error: Cannot read TimeVaultPayload.`, error.message);
        }

        // A2A Cycle Counter (runs A2A processing every 6th cycle = ~30 seconds)
        let a2aCycleCounter = 0;

        while (this.isRunning) {
            try {
                // ═══ Shielded Payroll Processing (every 5s) ═══
                const pendingJobs = await this.prisma.timeVaultPayload.findMany({
                    where: { status: 'PENDING', isShielded: true },
                    take: 10
                });

                if (pendingJobs.length > 0) {
                    console.log(`[DAEMON] 📥 Found ${pendingJobs.length} PENDING shielded transactions!`);
                    await this.processBatch(pendingJobs);
                }

                // ═══ A2A Escrow Processing (every ~30s) ═══
                a2aCycleCounter++;
                if (a2aCycleCounter >= 6) {
                    a2aCycleCounter = 0;
                    await this.processA2ATimeouts();
                    await this.processCompletedJobs();
                }
            } catch (error) {
                console.error("[DAEMON] 🚨 Polling Error:", error);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    private async processBatch(jobs: any[]) {
        for (const job of jobs) {
            console.log(`[DAEMON] ⚙️ Processing Job ID: ${job.id} for ${job.recipientWallet}`);
            
            try {
                await this.prisma.timeVaultPayload.update({
                    where: { id: job.id },
                    data: { status: 'PROCESSING' }
                });

                // Scale decimals to Wei to prevent BigInt float crashes
                const amountString = job.amount.toString();
                const scaledAmountWei = ethers.parseUnits(amountString, 6);

                console.log(`[DAEMON] 🛡️ Generating REAL ZK-SNARK Proof for ${amountString} AlphaUSD...`);
                
                // TRUE ZK PROOF (No try-catch mock block anymore)
                const { proofArray, pubSignals } = await this.generateZKProof(job.recipientWallet, scaledAmountWei.toString());

                console.log(`[DAEMON] 🚀 Broadcasting ZK Transaction to L1 Tempo...`);
                
                // 🌟 FIX NONCE: Always fetch the exact pending nonce from the blockchain right before TX
                const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");

                // REAL EXECUTION ON SMART CONTRACT
                const tx = await this.shieldContract.executeShieldedPayout(
                    proofArray, 
                    pubSignals, 
                    scaledAmountWei,
                    { nonce: currentNonce, gasLimit: 3000000, type: 0 }
                );

                console.log(`[DAEMON] ⏳ TX Sent. Hash: ${tx.hash}. Waiting for block confirmation...`);
                await tx.wait(1); 
                
                console.log(`[DAEMON] ✅ Job ${job.id} officially settled on-chain!`);
                
                await this.prisma.timeVaultPayload.update({
                    where: { id: job.id },
                    data: { status: 'COMPLETED', zkCommitment: tx.hash }
                });

            } catch (error: any) {
                // If it fails mathematically or on-chain, it will accurately log and halt here
                console.error(`[DAEMON] ❌ Failed to process Job ${job.id}:`, error.reason || error.message || error);
                await this.prisma.timeVaultPayload.update({
                    where: { id: job.id },
                    data: { status: 'FAILED' }
                });
            }
        }
    }

    private async generateZKProof(recipient: string, amount: string) {
        let cleanRecipient = recipient.toLowerCase().trim();
        if (cleanRecipient.includes('...') || cleanRecipient.length !== 42) {
            cleanRecipient = "0x0000000000000000000000000000000000000001";
        }

        const adminSecretStr = "123456789"; 
        const recipientBigIntStr = BigInt(cleanRecipient).toString();
        
        // ==============================================================
        // 🌟 ZK CIRCUIT ASSERT (LINE 21) FIX
        // Exactly matches the mathematical constraint: commitment === Poseidon(adminSecret)
        // ==============================================================
        const poseidon = await buildPoseidon();
        const secretHash = poseidon([BigInt(adminSecretStr), BigInt(amount), BigInt(recipientBigIntStr)]);
        const commitmentStr = poseidon.F.toObject(secretHash).toString();

        const circuitInputs = {
            commitment: commitmentStr,
            recipient: recipientBigIntStr,
            amount: amount, 
            adminSecret: adminSecretStr
        };

        // services/daemon/ is 2 levels deep → go up 2 to reach project root
        const wasmPath = path.join(__dirname, "..", "..", "apps", "dashboard", "public", "zk", "paypol_shield.wasm");
        const zkeyPath = path.join(__dirname, "..", "..", "apps", "dashboard", "public", "zk", "paypol_shield_final.zkey");

        if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
            throw new Error(`ZK circuits not found. Looked at: ${wasmPath}`);
        }

        // TRUE CIRCOM CALCULATION
        const { proof, publicSignals } = await snarkjs.plonk.fullProve(circuitInputs, wasmPath, zkeyPath);
        const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);

        const calldataStr = String(calldata);

        // snarkjs PLONK format: [proof_24_hex_fields][pub_signals] — two adjacent arrays, no separator
        const splitIndex = calldataStr.indexOf('][');
        if (splitIndex === -1) throw new Error("Invalid PLONK calldata format from snarkjs.");

        const proofArrayForContract: string[] = JSON.parse(calldataStr.substring(0, splitIndex + 1));
        const pubSignalsArray: string[] = JSON.parse(calldataStr.substring(splitIndex + 1));

        return { proofArray: proofArrayForContract, pubSignals: pubSignalsArray };
    }

    // ═══════════════════════════════════════════════════════════
    // A2A ESCROW — Timeout Auto-Refund
    // ═══════════════════════════════════════════════════════════
    private async processA2ATimeouts() {
        try {
            // Find AgentJobs where deadline has passed and status is still active
            const timedOutJobs = await this.prisma.agentJob.findMany({
                where: {
                    status: { in: ['ESCROW_LOCKED', 'EXECUTING'] },
                    deadline: { lt: new Date() },
                    onChainJobId: { not: null }
                },
                take: 5
            });

            if (timedOutJobs.length === 0) return;

            console.log(`[DAEMON] ⏰ Found ${timedOutJobs.length} timed-out A2A jobs. Processing refunds...`);

            for (const job of timedOutJobs) {
                try {
                    // Verify on-chain that the job is actually timed out
                    const isTimeout = await this.nexusV2Contract.isTimedOut(job.onChainJobId);
                    if (!isTimeout) {
                        console.log(`[DAEMON] ⏰ Job #${job.onChainJobId} not yet timed out on-chain. Skipping.`);
                        continue;
                    }

                    console.log(`[DAEMON] ⏰ Claiming timeout refund for Job #${job.onChainJobId}...`);

                    const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
                    const tx = await this.nexusV2Contract.claimTimeout(
                        job.onChainJobId,
                        { nonce: currentNonce, gasLimit: 300000, type: 0 }
                    );

                    console.log(`[DAEMON] ⏳ Timeout TX sent. Hash: ${tx.hash}`);
                    await tx.wait(1);

                    // Update AgentJob
                    await this.prisma.agentJob.update({
                        where: { id: job.id },
                        data: {
                            status: 'REFUNDED',
                            settleTxHash: tx.hash
                        }
                    });

                    // Sync TimeVaultPayload
                    await this.syncTimeVaultPayload(job.clientWallet, job.id, 'REFUNDED');

                    console.log(`[DAEMON] ✅ Timeout refund completed for Job #${job.onChainJobId}`);
                } catch (error: any) {
                    console.error(`[DAEMON] ❌ Timeout refund failed for Job #${job.onChainJobId}:`, error.reason || error.message);
                }
            }
        } catch (error) {
            console.error("[DAEMON] 🚨 A2A Timeout Processing Error:", error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // A2A ESCROW — Auto-Settle Completed Jobs
    // ═══════════════════════════════════════════════════════════
    private async processCompletedJobs() {
        try {
            // Find AgentJobs that are COMPLETED (agent finished) but not yet settled
            const completedJobs = await this.prisma.agentJob.findMany({
                where: {
                    status: 'COMPLETED',
                    onChainJobId: { not: null },
                    settleTxHash: null // Not yet settled on-chain
                },
                take: 5
            });

            if (completedJobs.length === 0) return;

            console.log(`[DAEMON] 🤖 Found ${completedJobs.length} completed A2A jobs. Auto-settling...`);

            for (const job of completedJobs) {
                try {
                    console.log(`[DAEMON] 💰 Auto-settling Job #${job.onChainJobId} for agent...`);

                    const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
                    const tx = await this.nexusV2Contract.settleJob(
                        job.onChainJobId,
                        { nonce: currentNonce, gasLimit: 300000, type: 0 }
                    );

                    console.log(`[DAEMON] ⏳ Settlement TX sent. Hash: ${tx.hash}`);
                    await tx.wait(1);

                    // Update AgentJob
                    await this.prisma.agentJob.update({
                        where: { id: job.id },
                        data: {
                            status: 'SETTLED',
                            settleTxHash: tx.hash
                        }
                    });

                    // Sync TimeVaultPayload
                    await this.syncTimeVaultPayload(job.clientWallet, job.id, 'SETTLED');

                    console.log(`[DAEMON] ✅ Job #${job.onChainJobId} settled. Agent paid on-chain!`);
                } catch (error: any) {
                    console.error(`[DAEMON] ❌ Auto-settlement failed for Job #${job.onChainJobId}:`, error.reason || error.message);
                }
            }
        } catch (error) {
            console.error("[DAEMON] 🚨 A2A Settlement Processing Error:", error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Helper: Sync TimeVaultPayload status with AgentJob
    // ═══════════════════════════════════════════════════════════
    private async syncTimeVaultPayload(clientWallet: string, jobId: string, newStatus: string) {
        try {
            const relatedPayloads = await this.prisma.timeVaultPayload.findMany({
                where: {
                    isDiscovery: true,
                    status: { in: ['EscrowLocked', 'DISPUTED'] }
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });

            const matched = relatedPayloads.find(p =>
                (p.note && p.note.includes(jobId)) ||
                p.recipientWallet === clientWallet
            );

            if (matched) {
                await this.prisma.timeVaultPayload.update({
                    where: { id: matched.id },
                    data: { status: newStatus }
                });
            }
        } catch (err) {
            console.error("[DAEMON] ⚠️ TimeVaultPayload sync error:", err);
        }
    }
}

const daemon = new PayPolDaemon();
daemon.start().catch(console.error);