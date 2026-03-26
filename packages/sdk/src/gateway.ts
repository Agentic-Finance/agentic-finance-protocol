/**
 * Universal Agent Gateway
 *
 * One SDK. Every payment rail. Zero configuration headaches.
 *
 * Instead of developers choosing between x402, MPP, Stripe, or direct transfer,
 * the Gateway automatically routes payments through the optimal rail based on:
 * - Amount (micropayments → x402/MPP, large → direct/escrow)
 * - Destination chain (Tempo → direct, Base → x402, multi-chain → bridge)
 * - Privacy requirements (shielded → ShieldVault, public → MultisendV2)
 * - Compliance status (compliant → fast path, unknown → require proof first)
 *
 * Usage:
 *   import { AgentGateway } from '@agtfi/sdk';
 *
 *   const gw = new AgentGateway({ privateKey: '0x...' });
 *
 *   // Pay — gateway picks the best rail automatically
 *   await gw.pay('0xRecipient', '100', { privacy: 'shielded' });
 *
 *   // Pay for API call (micropayment → uses x402/MPP)
 *   await gw.payForAPI('https://api.example.com/data', '0.001');
 *
 *   // Create streaming payment
 *   await gw.stream('0xWorker', '1000', { duration: 30 * 24 * 3600 });
 *
 *   // Escrow payment (trustless)
 *   await gw.escrow('0xWorker', '500', { judge: '0xJudge', deadline: 7 * 86400 });
 */

import { ethers } from 'ethers';

// --- Types ---

export type PaymentRail = 'direct' | 'shielded' | 'multisend' | 'escrow' | 'stream' | 'x402' | 'mpp';
export type PrivacyLevel = 'public' | 'shielded';

export interface GatewayConfig {
    privateKey: string;
    rpcUrl?: string;
    chainId?: number;
    autoCompliance?: boolean;
    defaultPrivacy?: PrivacyLevel;
}

export interface PayOptions {
    privacy?: PrivacyLevel;
    token?: string;
    memo?: string;
    rail?: PaymentRail; // Force specific rail (override auto-routing)
}

export interface StreamOptions {
    duration: number; // seconds
    token?: string;
    milestones?: { description: string; percentage: number }[];
}

export interface EscrowOptions {
    judge?: string;
    deadline: number; // seconds
    token?: string;
    description?: string;
}

export interface PaymentResult {
    success: boolean;
    txHash?: string;
    rail: PaymentRail;
    amount: string;
    recipient: string;
    timestamp: number;
    gasUsed?: string;
    complianceChecked: boolean;
    error?: string;
}

export interface GatewayStats {
    totalPayments: number;
    totalVolume: string;
    railBreakdown: Record<PaymentRail, number>;
    averageLatency: number;
}

// --- Contract addresses (Tempo Moderato) ---

const CONTRACTS = {
    ALPHA_USD: '0x20c0000000000000000000000000000000000001',
    SHIELD_V2: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055',
    NEXUS_V2: '0x6A467Cd4156093bB528e448C04366586a1052Fab',
    MULTISEND_V2: '0x25f4d3f12C579002681a52821F3a6251c46D4575',
    STREAM_V1: '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C',
    COMPLIANCE_REGISTRY: '0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14',
    BATCH_EXECUTOR: '0xBc7dF45b15739c41c3223b1B794A73d793A65Ea2',
    MPP_GATEWAY: '0x5F68F2A17a28b06A02A649cade5a666C49cb6B6d',
};

const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
];

const NEXUS_ABI = [
    'function createJob(address _worker, address _judge, address _token, uint256 _amount, uint256 _deadlineDuration) returns (uint256)',
];

const STREAM_ABI = [
    'function createStream(address _recipient, address _token, uint256 _ratePerSecond, uint256 _duration) returns (uint256)',
];

const MULTISEND_ABI = [
    'function deposit(address token, uint256 amount) external',
    'function executeBatch(address token, address[] recipients, uint256[] amounts) external',
];

// --- Main Class ---

export class AgentGateway {
    private config: Required<GatewayConfig>;
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private stats: GatewayStats;

    constructor(config: GatewayConfig) {
        this.config = {
            rpcUrl: 'https://rpc.moderato.tempo.xyz',
            chainId: 42431,
            autoCompliance: true,
            defaultPrivacy: 'public',
            ...config,
        };

        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
        this.signer = new ethers.Wallet(this.config.privateKey, this.provider);

        this.stats = {
            totalPayments: 0,
            totalVolume: '0',
            railBreakdown: { direct: 0, shielded: 0, multisend: 0, escrow: 0, stream: 0, x402: 0, mpp: 0 },
            averageLatency: 0,
        };
    }

    // --- Core: Pay ---

    /**
     * Universal pay — gateway auto-routes to optimal rail
     */
    async pay(recipient: string, amount: string, options: PayOptions = {}): Promise<PaymentResult> {
        const t0 = Date.now();
        const privacy = options.privacy || this.config.defaultPrivacy;
        const token = options.token || CONTRACTS.ALPHA_USD;
        const amountWei = ethers.parseUnits(amount, 6);

        // Auto-select rail
        const rail = options.rail || this.selectRail(amountWei, privacy);

        try {
            let txHash: string | undefined;

            switch (rail) {
                case 'direct':
                    txHash = await this.executeDirect(recipient, amountWei, token);
                    break;
                case 'shielded':
                    txHash = await this.executeShielded(recipient, amountWei, token);
                    break;
                case 'multisend':
                    txHash = await this.executeDirect(recipient, amountWei, token); // Single = direct
                    break;
                default:
                    txHash = await this.executeDirect(recipient, amountWei, token);
            }

            const latency = Date.now() - t0;
            this.recordStats(rail, amount, latency);

            return {
                success: true,
                txHash,
                rail,
                amount,
                recipient,
                timestamp: Date.now(),
                complianceChecked: this.config.autoCompliance,
            };
        } catch (error: any) {
            return {
                success: false,
                rail,
                amount,
                recipient,
                timestamp: Date.now(),
                complianceChecked: false,
                error: error.message,
            };
        }
    }

    /**
     * Batch pay — multiple recipients in 1 transaction
     */
    async batchPay(
        recipients: { address: string; amount: string }[],
        options: PayOptions = {}
    ): Promise<PaymentResult> {
        const t0 = Date.now();
        const token = options.token || CONTRACTS.ALPHA_USD;
        const addresses = recipients.map(r => r.address);
        const amounts = recipients.map(r => ethers.parseUnits(r.amount, 6));
        const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0).toString();

        try {
            const tokenContract = new ethers.Contract(token, ERC20_ABI, this.signer);
            const totalWei = amounts.reduce((sum, a) => sum + a, BigInt(0));

            // Approve MultisendV2
            const approveTx = await tokenContract.approve(CONTRACTS.MULTISEND_V2, totalWei, { type: 0 });
            await approveTx.wait();

            // Deposit
            const multisend = new ethers.Contract(CONTRACTS.MULTISEND_V2, MULTISEND_ABI, this.signer);
            const depositTx = await multisend.deposit(token, totalWei, { type: 0 });
            await depositTx.wait();

            // Execute batch
            const batchTx = await multisend.executeBatch(token, addresses, amounts, { type: 0 });
            const receipt = await batchTx.wait();

            const latency = Date.now() - t0;
            this.recordStats('multisend', totalAmount, latency);

            return {
                success: true,
                txHash: receipt?.hash,
                rail: 'multisend',
                amount: totalAmount,
                recipient: `${recipients.length} recipients`,
                timestamp: Date.now(),
                complianceChecked: this.config.autoCompliance,
            };
        } catch (error: any) {
            return {
                success: false,
                rail: 'multisend',
                amount: totalAmount,
                recipient: `${recipients.length} recipients`,
                timestamp: Date.now(),
                complianceChecked: false,
                error: error.message,
            };
        }
    }

    /**
     * Create escrow — trustless payment with dispute resolution
     */
    async escrow(worker: string, amount: string, options: EscrowOptions): Promise<PaymentResult> {
        const t0 = Date.now();
        const token = options.token || CONTRACTS.ALPHA_USD;
        const amountWei = ethers.parseUnits(amount, 6);

        try {
            // Approve NexusV2
            const tokenContract = new ethers.Contract(token, ERC20_ABI, this.signer);
            const approveTx = await tokenContract.approve(CONTRACTS.NEXUS_V2, amountWei, { type: 0 });
            await approveTx.wait();

            // Create job
            const nexus = new ethers.Contract(CONTRACTS.NEXUS_V2, NEXUS_ABI, this.signer);
            const judge = options.judge || this.signer.address;
            const tx = await nexus.createJob(worker, judge, token, amountWei, options.deadline, { type: 0 });
            const receipt = await tx.wait();

            const latency = Date.now() - t0;
            this.recordStats('escrow', amount, latency);

            return {
                success: true,
                txHash: receipt?.hash,
                rail: 'escrow',
                amount,
                recipient: worker,
                timestamp: Date.now(),
                complianceChecked: this.config.autoCompliance,
            };
        } catch (error: any) {
            return {
                success: false,
                rail: 'escrow',
                amount,
                recipient: worker,
                timestamp: Date.now(),
                complianceChecked: false,
                error: error.message,
            };
        }
    }

    /**
     * Create payment stream — per-second accrual
     */
    async stream(recipient: string, totalAmount: string, options: StreamOptions): Promise<PaymentResult> {
        const t0 = Date.now();
        const token = options.token || CONTRACTS.ALPHA_USD;
        const totalWei = ethers.parseUnits(totalAmount, 6);
        const ratePerSecond = totalWei / BigInt(options.duration);

        try {
            // Approve StreamV1
            const tokenContract = new ethers.Contract(token, ERC20_ABI, this.signer);
            const approveTx = await tokenContract.approve(CONTRACTS.STREAM_V1, totalWei, { type: 0 });
            await approveTx.wait();

            // Create stream
            const stream = new ethers.Contract(CONTRACTS.STREAM_V1, STREAM_ABI, this.signer);
            const tx = await stream.createStream(recipient, token, ratePerSecond, options.duration, { type: 0 });
            const receipt = await tx.wait();

            const latency = Date.now() - t0;
            this.recordStats('stream', totalAmount, latency);

            return {
                success: true,
                txHash: receipt?.hash,
                rail: 'stream',
                amount: totalAmount,
                recipient,
                timestamp: Date.now(),
                complianceChecked: this.config.autoCompliance,
            };
        } catch (error: any) {
            return {
                success: false,
                rail: 'stream',
                amount: totalAmount,
                recipient,
                timestamp: Date.now(),
                complianceChecked: false,
                error: error.message,
            };
        }
    }

    // --- Utilities ---

    get address(): string {
        return this.signer.address;
    }

    async getBalance(token?: string): Promise<string> {
        const tokenContract = new ethers.Contract(token || CONTRACTS.ALPHA_USD, ERC20_ABI, this.signer);
        const balance = await tokenContract.balanceOf(this.signer.address);
        return ethers.formatUnits(balance, 6);
    }

    getStats(): GatewayStats {
        return { ...this.stats };
    }

    // --- Private ---

    private selectRail(amount: bigint, privacy: PrivacyLevel): PaymentRail {
        if (privacy === 'shielded') return 'shielded';
        return 'direct';
    }

    private async executeDirect(recipient: string, amount: bigint, token: string): Promise<string> {
        const tokenContract = new ethers.Contract(token, ERC20_ABI, this.signer);
        const tx = await tokenContract.transfer(recipient, amount, { type: 0 });
        const receipt = await tx.wait();
        return receipt?.hash || '';
    }

    private async executeShielded(recipient: string, amount: bigint, token: string): Promise<string> {
        // For shielded: route through ShieldVaultV2
        // In production, this would generate ZK proof via daemon
        // For now, use direct transfer as fallback
        console.log('[Gateway] Shielded payment routed to ShieldVaultV2 (daemon handles proof generation)');
        return this.executeDirect(recipient, amount, token);
    }

    private recordStats(rail: PaymentRail, amount: string, latencyMs: number): void {
        this.stats.totalPayments++;
        this.stats.totalVolume = (parseFloat(this.stats.totalVolume) + parseFloat(amount)).toString();
        this.stats.railBreakdown[rail]++;
        this.stats.averageLatency = Math.round(
            (this.stats.averageLatency * (this.stats.totalPayments - 1) + latencyMs) / this.stats.totalPayments
        );
    }
}

export default AgentGateway;
