/**
 * PayPol Daemon — ZK Shield & A2A Escrow Processor (Optimized)
 *
 * Background service that:
 *  1. Polls for PENDING shielded payroll payloads
 *  2. For pre-deposited commitments (fiat flow): generates ZK proof → executeShieldedPayout
 *  3. For non-deposited payloads (payroll flow): deposit → generate proof → executeShieldedPayout
 *  4. Processes A2A escrow timeouts and auto-settlements
 *
 * Performance optimizations:
 *  - Poseidon cached as singleton (loaded once at startup, ~200ms saved per job)
 *  - Parallel proof generation for pre-deposited jobs (Path A)
 *  - Reduced indexing delays (1000ms → 200ms)
 *  - Deduplicated Poseidon hash computations
 *
 * Circuit: Circom V2 (paypol_shield_v2) with PLONK proofs via snarkjs
 * Hashing: Poseidon (circomlibjs) — BN254 field compatible
 */

import { ethers } from "ethers";
import * as crypto from "crypto";
// @ts-ignore
import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// @ts-ignore
import { buildPoseidon } from "circomlibjs";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ==========================================
// PAYPOL DAEMON CONFIGURATION
// ==========================================
const RPC_URL = process.env.RPC_URL || "https://rpc.moderato.tempo.xyz";
const PAYPOL_SHIELD_ADDRESS = "0x4cfcaE530d7a49A0FE8c0de858a0fA8Cf9Aea8B1";
const PAYPOL_SHIELD_V2_ADDRESS = process.env.SHIELD_V2_ADDRESS || "0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055";
const PAYPOL_NEXUS_V2_ADDRESS = process.env.NEXUS_V2_ADDRESS || "0x6A467Cd4156093bB528e448C04366586a1052Fab";
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "0x20c0000000000000000000000000000000000001";
const TOKEN_DECIMALS = 6;

// Parallel processing config
const MAX_PARALLEL_PROOFS = 3;  // Max concurrent proof generations (Path A)
const INDEX_DELAY_MS = 200;     // Reduced from 1000ms — Tempo indexing is fast

const PRIVATE_KEY = process.env.DAEMON_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error("🚨 DAEMON_PRIVATE_KEY (or BOT_PRIVATE_KEY / ADMIN_PRIVATE_KEY) is missing in .env");
}

// V1 Shield ABI (2 pubSignals — legacy)
const SHIELD_ABI_V1 = [
    "function executeShieldedPayout(uint256[24] calldata proof, uint256[2] calldata pubSignals, uint256 exactAmount) external"
];

// V2 Shield ABI (3 pubSignals — commitment, nullifierHash, recipient)
const SHIELD_ABI_V2 = [
    "function deposit(uint256 commitment, uint256 amount) external",
    "function executeShieldedPayout(uint256[24] calldata proof, uint256[3] calldata pubSignals, uint256 exactAmount) external",
    "function isNullifierUsed(uint256 nullifierHash) external view returns (bool)",
    "function isCommitmentRegistered(uint256 commitment) external view returns (bool)"
];

// ERC20 ABI for approve
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

const NEXUS_V2_ABI = [
    "function settleJob(uint256 _jobId) external",
    "function claimTimeout(uint256 _jobId) external",
    "function isTimedOut(uint256 _jobId) external view returns (bool)",
    "function getJob(uint256 _jobId) external view returns (address employer, address worker, address judge, address token, uint256 budget, uint256 platformFee, uint256 deadline, uint8 status, bool rated)",
];

/**
 * Generate a cryptographically secure random field element for ZK circuits.
 * Returns a BigInt string safe for Poseidon hashing (< BN254 field order).
 */
function generateRandomSecret(): string {
    const bytes = crypto.randomBytes(31); // 31 bytes = 248 bits (safe for BN254)
    return BigInt("0x" + bytes.toString("hex")).toString();
}

/**
 * Verify a transaction succeeded on Tempo L1 via raw HTTP RPC.
 * Tempo uses custom tx type 0x76 that ethers.js v6 can't parse.
 */
async function verifyTxOnChain(txHash: string, label: string): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const res = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: Date.now(),
                    method: 'eth_getTransactionReceipt',
                    params: [txHash],
                }),
            });
            const json = await res.json();
            const receipt = json?.result;
            if (receipt) {
                if (receipt.status === '0x0') throw new Error(`${label} reverted on-chain: ${txHash}`);
                if (receipt.status === '0x1') { console.log(`[verifyTx] ${label} confirmed: ${txHash}`); return; }
                console.warn(`[verifyTx] ${label} unknown status ${receipt.status}: ${txHash}`);
                return;
            }
        } catch (err: any) {
            if (err.message?.includes('reverted')) throw err;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error(`${label} receipt not found after 10s: ${txHash}`);
}

class PayPolDaemon {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private shieldContractV1: ethers.Contract;
    private shieldContractV2: ethers.Contract;
    private nexusV2Contract: ethers.Contract;
    private prisma: PrismaClient;
    private isRunning: boolean = false;

    // Poseidon singleton — loaded once at startup, reused forever
    private poseidon: any = null;

    // Circuit paths — resolved at startup
    private v2WasmPath: string = "";
    private v2ZkeyPath: string = "";
    private v1WasmPath: string = "";
    private v1ZkeyPath: string = "";
    private hasV2Circuit: boolean = false;
    private hasV1Circuit: boolean = false;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.shieldContractV1 = new ethers.Contract(PAYPOL_SHIELD_ADDRESS, SHIELD_ABI_V1, this.wallet);
        this.shieldContractV2 = new ethers.Contract(PAYPOL_SHIELD_V2_ADDRESS, SHIELD_ABI_V2, this.wallet);
        this.nexusV2Contract = new ethers.Contract(PAYPOL_NEXUS_V2_ADDRESS, NEXUS_V2_ABI, this.wallet);
        this.prisma = new PrismaClient();

        // Resolve circuit paths — try Docker path first, then dev path
        const dockerCircuits = path.join(__dirname, "circuits");
        const devCircuitsBase = path.join(__dirname, "..", "..", "packages", "circuits");

        // V2 circuits
        if (fs.existsSync(path.join(dockerCircuits, "paypol_shield_v2.wasm"))) {
            this.v2WasmPath = path.join(dockerCircuits, "paypol_shield_v2.wasm");
            this.v2ZkeyPath = path.join(dockerCircuits, "paypol_shield_v2_final.zkey");
        } else if (fs.existsSync(path.join(devCircuitsBase, "paypol_shield_v2_js", "paypol_shield_v2.wasm"))) {
            this.v2WasmPath = path.join(devCircuitsBase, "paypol_shield_v2_js", "paypol_shield_v2.wasm");
            this.v2ZkeyPath = path.join(devCircuitsBase, "paypol_shield_v2_final.zkey");
        }
        this.hasV2Circuit = fs.existsSync(this.v2WasmPath) && fs.existsSync(this.v2ZkeyPath);

        // V1 circuits (legacy fallback)
        if (fs.existsSync(path.join(dockerCircuits, "paypol_shield.wasm"))) {
            this.v1WasmPath = path.join(dockerCircuits, "paypol_shield.wasm");
            this.v1ZkeyPath = path.join(dockerCircuits, "paypol_shield_final.zkey");
        } else if (fs.existsSync(path.join(devCircuitsBase, "paypol_shield_js", "paypol_shield.wasm"))) {
            this.v1WasmPath = path.join(devCircuitsBase, "paypol_shield_js", "paypol_shield.wasm");
            this.v1ZkeyPath = path.join(devCircuitsBase, "paypol_shield_final.zkey");
        }
        this.hasV1Circuit = fs.existsSync(this.v1WasmPath) && fs.existsSync(this.v1ZkeyPath);
    }

    /**
     * Get cached Poseidon instance. First call loads WASM (~200ms),
     * all subsequent calls return instantly (~0ms).
     */
    private async getPoseidon(): Promise<any> {
        if (!this.poseidon) {
            console.log(`[DAEMON] ⚡ Initializing Poseidon WASM (one-time ~200ms)...`);
            this.poseidon = await buildPoseidon();
            console.log(`[DAEMON] ⚡ Poseidon cached. All subsequent hashes: ~0ms`);
        }
        return this.poseidon;
    }

    /**
     * Compute commitment + nullifierHash using cached Poseidon.
     * Eliminates duplicate hash computations across functions.
     */
    private async computeCommitment(secret: string, nullifier: string, amount: string, recipient: string) {
        const poseidon = await this.getPoseidon();
        const commitHash = poseidon([BigInt(secret), BigInt(nullifier), BigInt(amount), BigInt(recipient)]);
        const commitment = poseidon.F.toObject(commitHash).toString();
        const nullHash = poseidon([BigInt(nullifier), BigInt(secret)]);
        const nullifierHash = poseidon.F.toObject(nullHash).toString();
        return { commitment, nullifierHash };
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[DAEMON] 🟢 Master Daemon initialized. Wallet: ${this.wallet.address}`);
        console.log(`[DAEMON] 🛡️ V2 Circuit: ${this.hasV2Circuit ? 'AVAILABLE' : 'NOT FOUND'} (${this.v2WasmPath || 'N/A'})`);
        console.log(`[DAEMON] 🛡️ V1 Circuit: ${this.hasV1Circuit ? 'AVAILABLE' : 'NOT FOUND'} (${this.v1WasmPath || 'N/A'})`);
        console.log(`[DAEMON] 📡 ShieldVaultV2: ${PAYPOL_SHIELD_V2_ADDRESS}`);
        console.log(`[DAEMON] 📡 NexusV2: ${PAYPOL_NEXUS_V2_ADDRESS}`);
        console.log(`[DAEMON] ⚡ Parallel proofs: ${MAX_PARALLEL_PROOFS} | Index delay: ${INDEX_DELAY_MS}ms`);

        if (!this.hasV2Circuit && !this.hasV1Circuit) {
            console.error(`[DAEMON] 🚨 No ZK circuit files found! Daemon will still process A2A jobs but cannot generate ZK proofs.`);
        }

        // Pre-warm Poseidon cache at startup
        await this.getPoseidon();

        try {
            const totalRecords = await this.prisma.timeVaultPayload.count();
            const balance = await this.provider.getBalance(this.wallet.address);
            console.log(`[DAEMON] 📡 Database Synced. Total Payloads: ${totalRecords}`);
            console.log(`[DAEMON] 💰 Wallet ETH balance: ${ethers.formatEther(balance)} ETH`);
        } catch (error: any) {
            console.error(`[DAEMON] 🚨 Startup Error:`, error.message);
        }

        let a2aCycleCounter = 0;
        let judgeCycleCounter = 0;

        while (this.isRunning) {
            try {
                // ═══ Shielded Payroll Processing (every 5s) ═══
                const pendingJobs = await this.prisma.timeVaultPayload.findMany({
                    where: { status: 'PENDING', isShielded: true },
                    take: 10,
                });

                if (pendingJobs.length > 0) {
                    console.log(`[DAEMON] 📥 Found ${pendingJobs.length} PENDING shielded transactions!`);
                    await this.processShieldedBatch(pendingJobs);
                }

                // ═══ A2A Escrow Processing (every ~30s) ═══
                a2aCycleCounter++;
                if (a2aCycleCounter >= 6) {
                    a2aCycleCounter = 0;
                    await this.processA2ATimeouts();
                    await this.processCompletedJobs();
                }

                // ═══ Auto-Judge Processing (every ~60s) ═══
                judgeCycleCounter++;
                if (judgeCycleCounter >= 12) {
                    judgeCycleCounter = 0;
                    await this.processAutoJudge();
                }
            } catch (error) {
                console.error("[DAEMON] 🚨 Polling Error:", error);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SHIELDED PAYROLL — Process PENDING ZK payloads
    // Split into Path A (pre-deposited, parallelizable) and Path B (sequential)
    // ═══════════════════════════════════════════════════════════
    private async processShieldedBatch(jobs: any[]) {
        if (!this.hasV2Circuit) {
            console.error("[DAEMON] ❌ Cannot process shielded payloads — V2 circuit files missing.");
            return;
        }

        // Classify jobs into Path A (pre-deposited) and Path B (full lifecycle)
        const pathAJobs: any[] = [];
        const pathBJobs: any[] = [];

        for (const job of jobs) {
            let storedSecrets: any = null;
            if (job.zkProof && job.zkProof !== 'N/A' && job.zkProof !== 'Mock-Proof-Data') {
                try { storedSecrets = JSON.parse(job.zkProof); } catch { }
            }
            if (storedSecrets?.secret && storedSecrets?.depositTxHash) {
                pathAJobs.push({ job, storedSecrets });
            } else {
                pathBJobs.push(job);
            }
        }

        // ═══ PATH A: Pre-deposited jobs — parallel proof generation ═══
        if (pathAJobs.length > 0) {
            console.log(`[DAEMON] ⚡ Path A: ${pathAJobs.length} pre-deposited jobs (parallel proofs, max ${MAX_PARALLEL_PROOFS} concurrent)`);

            // Mark all as PROCESSING
            await Promise.all(pathAJobs.map(({ job }) =>
                this.prisma.timeVaultPayload.update({ where: { id: job.id }, data: { status: 'PROCESSING' } })
            ));

            // Process in parallel batches
            for (let i = 0; i < pathAJobs.length; i += MAX_PARALLEL_PROOFS) {
                const batch = pathAJobs.slice(i, i + MAX_PARALLEL_PROOFS);
                const results = await Promise.allSettled(
                    batch.map(({ job, storedSecrets }) => this.processPreDepositedPayout(job, storedSecrets))
                );

                for (let j = 0; j < results.length; j++) {
                    if (results[j].status === 'rejected') {
                        const failedJob = batch[j].job;
                        console.error(`[DAEMON] ❌ Path A failed for Job ${failedJob.id}:`, (results[j] as PromiseRejectedResult).reason?.message);
                        await this.prisma.timeVaultPayload.update({ where: { id: failedJob.id }, data: { status: 'FAILED' } });
                    }
                }
            }
        }

        // ═══ PATH B: Full lifecycle jobs — must be sequential (nonce management) ═══
        for (const job of pathBJobs) {
            console.log(`[DAEMON] ⚙️ Path B: Job ${job.id} — full ZK lifecycle for ${job.recipientWallet}`);
            try {
                await this.prisma.timeVaultPayload.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });
                const scaledAmountWei = ethers.parseUnits(job.amount.toString(), TOKEN_DECIMALS);
                await this.processFullZKLifecycle(job, scaledAmountWei);
            } catch (error: any) {
                console.error(`[DAEMON] ❌ Path B failed for Job ${job.id}:`, error.reason || error.message || error);
                await this.prisma.timeVaultPayload.update({ where: { id: job.id }, data: { status: 'FAILED' } });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PATH A: Pre-deposited — generate proof + executeShieldedPayout
    // Now uses cached Poseidon (no rebuild per job)
    // ═══════════════════════════════════════════════════════════
    private async processPreDepositedPayout(
        job: any,
        storedSecrets: { secret?: string; nullifier?: string; nullifierHash?: string; depositTxHash?: string; amountScaled?: string },
    ) {
        const scaledAmount = ethers.parseUnits(job.amount.toString(), TOKEN_DECIMALS);
        const amountForCircuit = storedSecrets.amountScaled || scaledAmount.toString();

        console.log(`[DAEMON] 📦 Job ${job.id}: Using pre-stored secrets (depositTx: ${storedSecrets.depositTxHash?.slice(0, 16)}...)`);

        const { proofArray, pubSignals, commitment } = await this.generateZKProofV2WithSecrets(
            job.recipientWallet,
            amountForCircuit,
            storedSecrets.secret!,
            storedSecrets.nullifier!
        );

        console.log(`[DAEMON] 🔐 Job ${job.id}: Proof generated. Commitment: ${commitment.slice(0, 20)}...`);

        const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
        const tx = await this.shieldContractV2.executeShieldedPayout(
            proofArray, pubSignals, scaledAmount,
            { nonce: currentNonce, gasLimit: 3_000_000, type: 0 }
        );

        console.log(`[DAEMON] ⏳ Job ${job.id}: TX sent: ${tx.hash}`);
        try {
            await tx.wait(1);
        } catch (e: any) {
            if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                await verifyTxOnChain(tx.hash, 'executeShieldedPayout');
            } else { throw e; }
        }

        console.log(`[DAEMON] ✅ Job ${job.id} settled on-chain via ZK proof!`);
        console.log(`[DAEMON]    Deposit: ${storedSecrets.depositTxHash}`);
        console.log(`[DAEMON]    Payout:  ${tx.hash}`);

        await this.prisma.timeVaultPayload.update({
            where: { id: job.id },
            data: {
                status: 'COMPLETED',
                zkCommitment: commitment,
                zkProof: JSON.stringify({
                    secret: storedSecrets.secret,
                    nullifier: storedSecrets.nullifier,
                    nullifierHash: storedSecrets.nullifierHash,
                    depositTxHash: storedSecrets.depositTxHash,
                    payoutTxHash: tx.hash,
                    amountScaled: storedSecrets.amountScaled,
                }),
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // PATH B: Full ZK Lifecycle — deposit → proof → payout
    // Optimized: cached Poseidon, shared commitment computation,
    // reduced delays (200ms vs 1000ms)
    // ═══════════════════════════════════════════════════════════
    private async processFullZKLifecycle(job: any, scaledAmount: bigint) {
        // Step 1: Generate fresh secrets + commitment (using cached Poseidon)
        const secret = generateRandomSecret();
        const nullifier = generateRandomSecret();

        let cleanRecipient = job.recipientWallet.toLowerCase().trim();
        if (cleanRecipient.includes('...') || cleanRecipient.length !== 42) {
            cleanRecipient = "0x0000000000000000000000000000000000000001";
        }
        const recipientBigInt = BigInt(cleanRecipient).toString();

        // Single Poseidon computation — result reused for both deposit AND proof
        const { commitment, nullifierHash } = await this.computeCommitment(
            secret, nullifier, scaledAmount.toString(), recipientBigInt
        );

        console.log(`[DAEMON] 🔑 Generated fresh secrets. Commitment: ${commitment.slice(0, 20)}...`);

        // Step 2: Approve ShieldVaultV2 to spend tokens
        console.log(`[DAEMON] 📝 Approving ShieldVaultV2 to spend ${ethers.formatUnits(scaledAmount, TOKEN_DECIMALS)} tokens...`);
        const erc20 = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, this.wallet);

        let nonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
        const approveTx = await erc20.approve(PAYPOL_SHIELD_V2_ADDRESS, scaledAmount, {
            nonce, gasLimit: 800_000, type: 0
        });
        try { await approveTx.wait(1); } catch (e: any) {
            if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                await verifyTxOnChain(approveTx.hash, 'ERC20 approve');
            } else { throw e; }
        }
        console.log(`[DAEMON] ✅ Approve confirmed: ${approveTx.hash}`);

        // Reduced indexing delay (200ms vs 1000ms)
        await new Promise(r => setTimeout(r, INDEX_DELAY_MS));

        // Step 3: Deposit to ShieldVaultV2
        console.log(`[DAEMON] 💎 Depositing to ShieldVaultV2 with commitment...`);
        nonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
        const depositTx = await this.shieldContractV2.deposit(commitment, scaledAmount, {
            nonce, gasLimit: 1_500_000, type: 0
        });
        try { await depositTx.wait(1); } catch (e: any) {
            if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                await verifyTxOnChain(depositTx.hash, 'Shield deposit');
            } else { throw e; }
        }
        console.log(`[DAEMON] ✅ Deposit confirmed: ${depositTx.hash}`);

        await new Promise(r => setTimeout(r, INDEX_DELAY_MS));

        // Step 4: Generate ZK proof (reuses cached Poseidon + pre-computed commitment)
        console.log(`[DAEMON] 🛡️ Generating REAL ZK-SNARK PLONK proof...`);
        const { proofArray, pubSignals } = await this.generateZKProofV2WithSecrets(
            job.recipientWallet,
            scaledAmount.toString(),
            secret,
            nullifier
        );

        // Step 5: Execute shielded payout
        console.log(`[DAEMON] 🚀 Broadcasting executeShieldedPayout to Tempo L1...`);
        nonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
        const payoutTx = await this.shieldContractV2.executeShieldedPayout(
            proofArray, pubSignals, scaledAmount,
            { nonce, gasLimit: 3_000_000, type: 0 }
        );
        try { await payoutTx.wait(1); } catch (e: any) {
            if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                await verifyTxOnChain(payoutTx.hash, 'executeShieldedPayout');
            } else { throw e; }
        }

        console.log(`[DAEMON] ✅ Job ${job.id} settled on-chain via FULL ZK lifecycle!`);
        console.log(`[DAEMON]    Deposit: ${depositTx.hash}`);
        console.log(`[DAEMON]    Payout:  ${payoutTx.hash}`);

        await this.prisma.timeVaultPayload.update({
            where: { id: job.id },
            data: {
                status: 'COMPLETED',
                zkCommitment: commitment,
                zkProof: JSON.stringify({
                    secret, nullifier, nullifierHash,
                    depositTxHash: depositTx.hash,
                    payoutTxHash: payoutTx.hash,
                }),
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // ZK PROOF GENERATION - V2 with Secrets (cached Poseidon)
    // ═══════════════════════════════════════════════════════════
    private async generateZKProofV2WithSecrets(recipient: string, amount: string, secret: string, nullifier: string) {
        let cleanRecipient = recipient.toLowerCase().trim();
        if (cleanRecipient.includes('...') || cleanRecipient.length !== 42) {
            cleanRecipient = "0x0000000000000000000000000000000000000001";
        }
        const recipientBigIntStr = BigInt(cleanRecipient).toString();

        // Uses cached Poseidon — no WASM rebuild
        const { commitment, nullifierHash } = await this.computeCommitment(secret, nullifier, amount, recipientBigIntStr);

        const circuitInputs = {
            commitment,
            nullifierHash,
            recipient: recipientBigIntStr,
            amount,
            secret,
            nullifier,
        };

        if (!this.hasV2Circuit) throw new Error("V2 circuit files not found");

        const { proof, publicSignals } = await snarkjs.plonk.fullProve(circuitInputs, this.v2WasmPath, this.v2ZkeyPath);
        const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
        const calldataStr = String(calldata);

        const splitIndex = calldataStr.indexOf('][');
        if (splitIndex === -1) throw new Error("Invalid PLONK calldata format from snarkjs");

        const proofArray: string[] = JSON.parse(calldataStr.substring(0, splitIndex + 1));
        const pubSignals: string[] = JSON.parse(calldataStr.substring(splitIndex + 1));

        return { proofArray, pubSignals, secret, nullifier, commitment, nullifierHash };
    }

    // ═══════════════════════════════════════════════════════════
    // ZK PROOF GENERATION - V1 (Legacy: hardcoded adminSecret)
    // ═══════════════════════════════════════════════════════════
    private async generateZKProofV1(recipient: string, amount: string) {
        let cleanRecipient = recipient.toLowerCase().trim();
        if (cleanRecipient.includes('...') || cleanRecipient.length !== 42) {
            cleanRecipient = "0x0000000000000000000000000000000000000001";
        }

        const adminSecretStr = "123456789";
        const recipientBigIntStr = BigInt(cleanRecipient).toString();

        const poseidon = await this.getPoseidon();
        const secretHash = poseidon([BigInt(adminSecretStr), BigInt(amount), BigInt(recipientBigIntStr)]);
        const commitmentStr = poseidon.F.toObject(secretHash).toString();

        const circuitInputs = {
            commitment: commitmentStr,
            recipient: recipientBigIntStr,
            amount: amount,
            adminSecret: adminSecretStr
        };

        if (!this.hasV1Circuit) throw new Error("V1 circuit files not found");

        const { proof, publicSignals } = await snarkjs.plonk.fullProve(circuitInputs, this.v1WasmPath, this.v1ZkeyPath);
        const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
        const calldataStr = String(calldata);

        const splitIndex = calldataStr.indexOf('][');
        if (splitIndex === -1) throw new Error("Invalid PLONK calldata format from snarkjs.");

        const proofArray: string[] = JSON.parse(calldataStr.substring(0, splitIndex + 1));
        const pubSignals: string[] = JSON.parse(calldataStr.substring(splitIndex + 1));

        return { proofArray, pubSignals };
    }

    // ═══════════════════════════════════════════════════════════
    // A2A ESCROW - Timeout Auto-Refund
    // ═══════════════════════════════════════════════════════════
    private async processA2ATimeouts() {
        try {
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
                    const isTimeout = await this.nexusV2Contract.isTimedOut(job.onChainJobId);
                    if (!isTimeout) {
                        console.log(`[DAEMON] ⏰ Job #${job.onChainJobId} not yet timed out on-chain. Skipping.`);
                        continue;
                    }

                    console.log(`[DAEMON] ⏰ Claiming timeout refund for Job #${job.onChainJobId}...`);
                    const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
                    const tx = await this.nexusV2Contract.claimTimeout(
                        job.onChainJobId,
                        { nonce: currentNonce, gasLimit: 500_000, type: 0 }
                    );

                    console.log(`[DAEMON] ⏳ Timeout TX sent: ${tx.hash}`);
                    try { await tx.wait(1); } catch (e: any) {
                        if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                            await verifyTxOnChain(tx.hash, 'claimTimeout');
                        } else { throw e; }
                    }

                    await this.prisma.agentJob.update({
                        where: { id: job.id },
                        data: { status: 'REFUNDED', settleTxHash: tx.hash }
                    });

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
    // A2A ESCROW - Auto-Settle Completed Jobs
    // ═══════════════════════════════════════════════════════════
    private async processCompletedJobs() {
        try {
            const completedJobs = await this.prisma.agentJob.findMany({
                where: {
                    status: 'COMPLETED',
                    onChainJobId: { not: null },
                    settleTxHash: null
                },
                take: 5
            });

            if (completedJobs.length === 0) return;

            console.log(`[DAEMON] 🤖 Found ${completedJobs.length} completed A2A jobs. Auto-settling...`);

            for (const job of completedJobs) {
                try {
                    console.log(`[DAEMON] 💰 Auto-settling Job #${job.onChainJobId}...`);
                    const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");
                    const tx = await this.nexusV2Contract.settleJob(
                        job.onChainJobId,
                        { nonce: currentNonce, gasLimit: 500_000, type: 0 }
                    );

                    console.log(`[DAEMON] ⏳ Settlement TX sent: ${tx.hash}`);
                    try { await tx.wait(1); } catch (e: any) {
                        if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                            await verifyTxOnChain(tx.hash, 'settleJob');
                        } else { throw e; }
                    }

                    await this.prisma.agentJob.update({
                        where: { id: job.id },
                        data: { status: 'SETTLED', settleTxHash: tx.hash }
                    });

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
    // AUTO-JUDGE — Trigger automated dispute resolution
    // Calls dashboard API to evaluate eligible jobs
    // ═══════════════════════════════════════════════════════════
    private async processAutoJudge() {
        try {
            const dashboardUrl = process.env.DASHBOARD_URL || 'http://dashboard:3000';
            const res = await fetch(`${dashboardUrl}/api/judge/auto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(30000),
            });

            if (!res.ok) {
                console.error(`[DAEMON] [AutoJudge] Dashboard returned ${res.status}`);
                return;
            }

            const data = await res.json();
            if (data.evaluated > 0) {
                console.log(`[DAEMON] [AutoJudge] Evaluated ${data.evaluated} jobs: ${data.settled} settle, ${data.refunded} refund, ${data.escalated} escalate (${data.duration}ms)`);

                // Auto-execute high-confidence verdicts on-chain
                for (const v of (data.verdicts || [])) {
                    if (v.confidence >= 0.85 && v.verdict !== 'ESCALATE') {
                        await this.executeVerdict(v.jobId, v.verdict);
                    }
                }
            }
        } catch (error: any) {
            // Don't crash daemon if dashboard is unavailable
            if (error.name === 'TimeoutError' || error.code === 'ECONNREFUSED') {
                console.warn(`[DAEMON] [AutoJudge] Dashboard unreachable — skipping cycle`);
            } else {
                console.error(`[DAEMON] [AutoJudge] Error:`, error.message);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-JUDGE — Execute verdict on-chain (settle or refund)
    // ═══════════════════════════════════════════════════════════
    private async executeVerdict(jobId: string, verdict: 'SETTLE' | 'REFUND') {
        try {
            const job = await this.prisma.agentJob.findUnique({ where: { id: jobId } });
            if (!job || !job.onChainJobId) return;

            // Skip if already settled/refunded
            if (['SETTLED', 'REFUNDED'].includes(job.status)) return;

            console.log(`[DAEMON] [AutoJudge] Executing ${verdict} for Job #${job.onChainJobId}...`);

            const currentNonce = await this.provider.getTransactionCount(this.wallet.address, "pending");

            let tx: any;
            if (verdict === 'SETTLE') {
                tx = await this.nexusV2Contract.settleJob(
                    job.onChainJobId,
                    { nonce: currentNonce, gasLimit: 500_000, type: 0 }
                );
            } else {
                // For refund, check timeout first
                try {
                    const isTimeout = await this.nexusV2Contract.isTimedOut(job.onChainJobId);
                    if (isTimeout) {
                        tx = await this.nexusV2Contract.claimTimeout(
                            job.onChainJobId,
                            { nonce: currentNonce, gasLimit: 500_000, type: 0 }
                        );
                    } else {
                        // Can't refund if not timed out and job isn't in correct state
                        console.warn(`[DAEMON] [AutoJudge] Job #${job.onChainJobId} not timed out — skipping refund`);
                        return;
                    }
                } catch {
                    console.warn(`[DAEMON] [AutoJudge] Could not check timeout for Job #${job.onChainJobId}`);
                    return;
                }
            }

            console.log(`[DAEMON] [AutoJudge] TX sent: ${tx.hash}`);
            try { await tx.wait(1); } catch (e: any) {
                if (e?.code === 'BAD_DATA' || e?.message?.includes('invalid BigNumberish')) {
                    await verifyTxOnChain(tx.hash, `AutoJudge.${verdict}`);
                } else { throw e; }
            }

            const newStatus = verdict === 'SETTLE' ? 'SETTLED' : 'REFUNDED';
            await this.prisma.agentJob.update({
                where: { id: jobId },
                data: { status: newStatus, settleTxHash: tx.hash },
            });

            // Update verdict record
            await this.prisma.judgeVerdict.updateMany({
                where: { jobId, executedOnChain: false },
                data: { executedOnChain: true, txHash: tx.hash, executedAt: new Date() },
            });

            await this.syncTimeVaultPayload(job.clientWallet, jobId, newStatus);
            console.log(`[DAEMON] [AutoJudge] Job #${job.onChainJobId} ${verdict === 'SETTLE' ? 'settled' : 'refunded'} on-chain!`);

        } catch (error: any) {
            console.error(`[DAEMON] [AutoJudge] Execution failed for job ${jobId}:`, error.reason || error.message);
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
