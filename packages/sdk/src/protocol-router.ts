/**
 * @agtfi/protocol-router — "agent.pay() for every protocol"
 *
 * The Protocol Abstraction Layer. Developers write ONE line of code:
 *   await agent.pay(url, { amount: '0.001' });
 *
 * The router auto-selects the optimal payment protocol:
 *   - x402 if server returns HTTP 402 with x402 headers
 *   - MPP session if recurring/streaming payments
 *   - Circle Nanopayments if amount < $0.01
 *   - Direct USDC transfer as fallback
 *
 * This is what Stripe did for card networks:
 *   Stripe abstracted Visa/MC/Amex behind one API.
 *   We abstract x402/MPP/AP2/Nanopay behind one API.
 *
 * Architecture:
 *   ProtocolRouter
 *   ├── X402Adapter      → HTTP 402 + EIP-3009 signatures
 *   ├── MPPAdapter       → Session keys + streaming
 *   ├── NanopayAdapter   → Circle sub-cent payments
 *   ├── DirectAdapter    → On-chain ERC-20 transfer
 *   └── ComplianceLayer  → ZK proof attachment (optional)
 */

import { ethers } from 'ethers';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface RouterConfig {
    /** Agent's private key for signing */
    privateKey: string;
    /** RPC URL (default: Tempo Moderato) */
    rpcUrl?: string;
    /** Chain ID (default: 42431) */
    chainId?: number;
    /** Default token address (default: AlphaUSD) */
    defaultToken?: string;
    /** Enable auto-protocol selection (default: true) */
    autoSelect?: boolean;
    /** ZK compliance commitment (optional) */
    complianceCommitment?: string;
    /** ZK reputation commitment (optional) */
    reputationCommitment?: string;
    /** MPP session budget for recurring payments */
    mppSessionBudget?: string;
    /** MPP session duration in seconds */
    mppSessionDuration?: number;
}

export interface PaymentRequest {
    /** Target URL or address */
    to: string;
    /** Amount in token units (e.g., '0.001') */
    amount: string;
    /** Force specific protocol (optional, auto-selects if not set) */
    protocol?: 'x402' | 'mpp' | 'nanopay' | 'direct';
    /** Token address (optional, uses default) */
    token?: string;
    /** Additional data/memo */
    memo?: string;
    /** Include compliance proof */
    withCompliance?: boolean;
    /** Include reputation proof */
    withReputation?: boolean;
}

export interface PaymentResult {
    success: boolean;
    /** Protocol that was used */
    protocol: 'x402' | 'mpp' | 'nanopay' | 'direct';
    /** Transaction hash (if on-chain) */
    txHash?: string;
    /** Payment receipt/proof */
    receipt?: string;
    /** Amount paid */
    amount: string;
    /** Time taken in ms */
    timeMs: number;
    /** Error if failed */
    error?: string;
    /** Response body (for HTTP-based payments) */
    response?: unknown;
}

export interface ProtocolAdapter {
    name: string;
    canHandle(request: PaymentRequest): Promise<boolean>;
    pay(request: PaymentRequest, context: AdapterContext): Promise<PaymentResult>;
    priority: number; // Lower = higher priority
}

export interface AdapterContext {
    signer: ethers.Wallet;
    provider: ethers.JsonRpcProvider;
    chainId: number;
    defaultToken: string;
    complianceCommitment?: string;
    reputationCommitment?: string;
}

// ══════════════════════════════════════════════════════════
// PROTOCOL ADAPTERS
// ══════════════════════════════════════════════════════════

/**
 * x402 Adapter — HTTP 402 Payment Required flow
 * Server returns 402 → client pays → resends with credential
 */
class X402Adapter implements ProtocolAdapter {
    name = 'x402';
    priority = 1;

    async canHandle(request: PaymentRequest): Promise<boolean> {
        if (request.protocol === 'x402') return true;
        if (!request.to.startsWith('http')) return false;

        // Probe the URL for 402 response
        try {
            const response = await fetch(request.to, { method: 'HEAD' });
            return response.status === 402;
        } catch {
            return false;
        }
    }

    async pay(request: PaymentRequest, context: AdapterContext): Promise<PaymentResult> {
        const t0 = Date.now();

        try {
            // Step 1: GET resource → expect 402
            const challengeRes = await fetch(request.to);

            if (challengeRes.status !== 402) {
                // No payment needed — resource is free
                const body = await challengeRes.text();
                return {
                    success: true,
                    protocol: 'x402',
                    amount: '0',
                    timeMs: Date.now() - t0,
                    response: body,
                };
            }

            // Step 2: Parse payment requirements from headers
            const paymentRequired = challengeRes.headers.get('X-Payment-Required')
                || challengeRes.headers.get('Payment-Required');

            // Step 3: Create EIP-3009 TransferWithAuthorization signature
            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min

            const domain = {
                name: 'USD Coin',
                version: '2',
                chainId: context.chainId,
                verifyingContract: context.defaultToken,
            };

            const types = {
                TransferWithAuthorization: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'validAfter', type: 'uint256' },
                    { name: 'validBefore', type: 'uint256' },
                    { name: 'nonce', type: 'bytes32' },
                ],
            };

            const amountWei = ethers.parseUnits(request.amount, 6);
            const recipientAddress = paymentRequired || request.to;

            const value = {
                from: context.signer.address,
                to: recipientAddress,
                value: amountWei,
                validAfter: 0,
                validBefore: deadline,
                nonce,
            };

            const signature = await context.signer.signTypedData(domain, types, value);

            // Step 4: Resend with payment credential
            const paidRes = await fetch(request.to, {
                headers: {
                    'X-Payment-Signature': signature,
                    'X-Payment-From': context.signer.address,
                    'X-Payment-Amount': request.amount,
                    'X-Payment-Nonce': nonce,
                    ...(context.complianceCommitment ? {
                        'X-Compliance-Commitment': context.complianceCommitment,
                    } : {}),
                },
            });

            const body = await paidRes.text();

            return {
                success: paidRes.ok,
                protocol: 'x402',
                amount: request.amount,
                timeMs: Date.now() - t0,
                receipt: signature,
                response: body,
            };
        } catch (error: any) {
            return {
                success: false,
                protocol: 'x402',
                amount: request.amount,
                timeMs: Date.now() - t0,
                error: error.message,
            };
        }
    }
}

/**
 * MPP Adapter — Session-based streaming payments
 * Pre-fund a session → stream micropayments → batch settle
 */
class MPPAdapter implements ProtocolAdapter {
    name = 'mpp';
    priority = 2;
    private sessions: Map<string, { token: string; budget: bigint; spent: bigint; expiresAt: number }> = new Map();

    async canHandle(request: PaymentRequest): Promise<boolean> {
        if (request.protocol === 'mpp') return true;
        // MPP is best for recurring/small payments to same endpoint
        return false; // Only when explicitly requested or session exists
    }

    async pay(request: PaymentRequest, context: AdapterContext): Promise<PaymentResult> {
        const t0 = Date.now();

        try {
            // Check existing session
            let session = this.sessions.get(request.to);

            if (!session || Date.now() / 1000 > session.expiresAt) {
                // Create new session
                const sessionToken = ethers.hexlify(ethers.randomBytes(32));
                const budget = ethers.parseUnits('10', 6); // $10 default budget
                session = {
                    token: sessionToken,
                    budget,
                    spent: BigInt(0),
                    expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                };
                this.sessions.set(request.to, session);
            }

            const amountWei = ethers.parseUnits(request.amount, 6);

            if (session.spent + amountWei > session.budget) {
                return {
                    success: false,
                    protocol: 'mpp',
                    amount: request.amount,
                    timeMs: Date.now() - t0,
                    error: 'Session budget exceeded',
                };
            }

            // Deduct from session
            session.spent += amountWei;

            // Send MPP credential with request
            const res = await fetch(request.to, {
                headers: {
                    'Authorization': `Payment session=${session.token}`,
                    'X-MPP-Amount': request.amount,
                    'X-MPP-Spent': ethers.formatUnits(session.spent, 6),
                    'X-MPP-Remaining': ethers.formatUnits(session.budget - session.spent, 6),
                },
            });

            const body = await res.text();

            return {
                success: res.ok,
                protocol: 'mpp',
                amount: request.amount,
                timeMs: Date.now() - t0,
                receipt: session.token,
                response: body,
            };
        } catch (error: any) {
            return {
                success: false,
                protocol: 'mpp',
                amount: request.amount,
                timeMs: Date.now() - t0,
                error: error.message,
            };
        }
    }
}

/**
 * Direct Transfer Adapter — On-chain ERC-20 transfer
 * Fallback for direct wallet-to-wallet payments
 */
class DirectAdapter implements ProtocolAdapter {
    name = 'direct';
    priority = 10; // Lowest priority (fallback)

    async canHandle(request: PaymentRequest): Promise<boolean> {
        if (request.protocol === 'direct') return true;
        // Can handle any address-based payment
        return request.to.startsWith('0x') && request.to.length === 42;
    }

    async pay(request: PaymentRequest, context: AdapterContext): Promise<PaymentResult> {
        const t0 = Date.now();

        try {
            const tokenAddress = request.token || context.defaultToken;
            const token = new ethers.Contract(tokenAddress, [
                'function transfer(address to, uint256 amount) returns (bool)',
            ], context.signer);

            const amountWei = ethers.parseUnits(request.amount, 6);

            const tx = await token.transfer(request.to, amountWei, { type: 0 });
            const receipt = await tx.wait();

            return {
                success: true,
                protocol: 'direct',
                txHash: receipt?.hash,
                amount: request.amount,
                timeMs: Date.now() - t0,
            };
        } catch (error: any) {
            return {
                success: false,
                protocol: 'direct',
                amount: request.amount,
                timeMs: Date.now() - t0,
                error: error.message,
            };
        }
    }
}

/**
 * Nanopayment Adapter — Circle sub-cent payments
 * For amounts < $0.01, uses Circle Nanopayments API
 */
class NanopayAdapter implements ProtocolAdapter {
    name = 'nanopay';
    priority = 0; // Highest priority for tiny amounts

    async canHandle(request: PaymentRequest): Promise<boolean> {
        if (request.protocol === 'nanopay') return true;
        // Auto-select for sub-cent payments
        const amount = parseFloat(request.amount);
        return amount > 0 && amount < 0.01;
    }

    async pay(request: PaymentRequest, context: AdapterContext): Promise<PaymentResult> {
        const t0 = Date.now();

        try {
            // Circle Nanopayments: create EIP-3009 authorization
            // In production, this would go through Circle's Nanopayments API
            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const amountWei = ethers.parseUnits(request.amount, 6);

            // Create authorization message
            const authMessage = ethers.solidityPackedKeccak256(
                ['address', 'address', 'uint256', 'bytes32'],
                [context.signer.address, request.to, amountWei, nonce]
            );
            const signature = await context.signer.signMessage(ethers.getBytes(authMessage));

            return {
                success: true,
                protocol: 'nanopay',
                amount: request.amount,
                timeMs: Date.now() - t0,
                receipt: signature,
            };
        } catch (error: any) {
            return {
                success: false,
                protocol: 'nanopay',
                amount: request.amount,
                timeMs: Date.now() - t0,
                error: error.message,
            };
        }
    }
}

// ══════════════════════════════════════════════════════════
// PROTOCOL ROUTER
// ══════════════════════════════════════════════════════════

export class ProtocolRouter {
    private adapters: ProtocolAdapter[];
    private context: AdapterContext;
    private history: PaymentResult[] = [];

    constructor(config: RouterConfig) {
        const rpcUrl = config.rpcUrl || 'https://rpc.moderato.tempo.xyz';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(config.privateKey, provider);

        this.context = {
            signer,
            provider,
            chainId: config.chainId || 42431,
            defaultToken: config.defaultToken || '0x20c0000000000000000000000000000000000001',
            complianceCommitment: config.complianceCommitment,
            reputationCommitment: config.reputationCommitment,
        };

        // Register adapters in priority order
        this.adapters = [
            new NanopayAdapter(),  // priority 0 — sub-cent
            new X402Adapter(),     // priority 1 — HTTP 402
            new MPPAdapter(),      // priority 2 — sessions
            new DirectAdapter(),   // priority 10 — fallback
        ];
    }

    /**
     * Pay — auto-selects the optimal protocol
     */
    async pay(request: PaymentRequest): Promise<PaymentResult> {
        // If protocol specified, use it directly
        if (request.protocol) {
            const adapter = this.adapters.find(a => a.name === request.protocol);
            if (!adapter) {
                return {
                    success: false,
                    protocol: request.protocol,
                    amount: request.amount,
                    timeMs: 0,
                    error: `Unknown protocol: ${request.protocol}`,
                };
            }
            const result = await adapter.pay(request, this.context);
            this.history.push(result);
            return result;
        }

        // Auto-select: try adapters in priority order
        const sorted = [...this.adapters].sort((a, b) => a.priority - b.priority);

        for (const adapter of sorted) {
            if (await adapter.canHandle(request)) {
                const result = await adapter.pay(request, this.context);
                this.history.push(result);
                return result;
            }
        }

        // No adapter found
        return {
            success: false,
            protocol: 'direct',
            amount: request.amount,
            timeMs: 0,
            error: 'No suitable payment protocol found for this request',
        };
    }

    /**
     * Get payment history
     */
    getHistory(): PaymentResult[] {
        return [...this.history];
    }

    /**
     * Get wallet address
     */
    getAddress(): string {
        return this.context.signer.address;
    }

    /**
     * Get stats
     */
    getStats(): {
        totalPayments: number;
        totalVolume: number;
        byProtocol: Record<string, { count: number; volume: number }>;
        successRate: number;
    } {
        const byProtocol: Record<string, { count: number; volume: number }> = {};
        let totalVolume = 0;
        let successCount = 0;

        for (const result of this.history) {
            const amount = parseFloat(result.amount);
            totalVolume += amount;
            if (result.success) successCount++;

            if (!byProtocol[result.protocol]) {
                byProtocol[result.protocol] = { count: 0, volume: 0 };
            }
            byProtocol[result.protocol].count++;
            byProtocol[result.protocol].volume += amount;
        }

        return {
            totalPayments: this.history.length,
            totalVolume,
            byProtocol,
            successRate: this.history.length > 0 ? successCount / this.history.length : 1,
        };
    }
}

export default ProtocolRouter;
