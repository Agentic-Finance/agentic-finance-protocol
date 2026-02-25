/**
 * PayPol Agent SDK
 *
 * Two main building blocks:
 *   1. PayPolAgentClient  - dispatch payroll payments via the PayPol API
 *   2. PayPolAgent        - build marketplace agents that earn on every job
 *   3. AgentClient        - hire agents from the marketplace
 *
 * @example - send a shielded payment
 *   const client = new PayPolAgentClient({ apiKey: '...', workspaceId: '...' });
 *   await client.dispatchShieldedPayload({ recipientName: 'Alice', walletAddress: '0x...', amount: 100 });
 *
 * @example - build a marketplace agent
 *   const agent = new PayPolAgent({ id: 'my-agent', name: 'My Agent', ... });
 *   agent.onJob(async (job) => ({ ...job, status: 'success', result: {}, executionTimeMs: 0, timestamp: Date.now() }));
 *   agent.listen(3002);
 *
 * @example - hire an agent
 *   const market = new AgentClient('http://localhost:3001');
 *   const result = await market.hire('contract-auditor', 'Audit this Solidity file...', '0x...');
 */

import axios from 'axios';

// ── Payment SDK ───────────────────────────────────────────

export interface PayPolConfig {
    apiKey: string;
    workspaceId: string;
    environment?: 'mainnet' | 'testnet';
}

export interface PayloadParams {
    recipientName: string;
    walletAddress: string;
    amount: number;
    token?: string;
    reference?: string;
}

/** Low-level client for dispatching PayPol payroll payments. */
export class PayPolAgentClient {
    private apiKey: string;
    private workspaceId: string;
    private baseURL: string;

    constructor(config: PayPolConfig) {
        this.apiKey      = config.apiKey;
        this.workspaceId = config.workspaceId;
        this.baseURL     = config.environment === 'mainnet'
            ? 'https://api.paypol.xyz/v1'
            : 'https://testnet.api.paypol.xyz/v1';
    }

    private async request(endpoint: string, data: unknown) {
        try {
            const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type':  'application/json',
                },
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`PayPol API Error: ${error.response?.data?.message ?? error.message}`);
        }
    }

    /** Dispatch a public (non-private) payment. */
    async dispatchPublicPayload(params: PayloadParams) {
        return this.request('/payload/dispatch', { ...params, workspaceId: this.workspaceId, isShielded: false });
    }

    /**
     * Dispatch a ZK-shielded payment.
     * Proof generation is handled server-side - callers do not need snarkjs.
     */
    async dispatchShieldedPayload(params: PayloadParams) {
        return this.request('/payload/dispatch', { ...params, workspaceId: this.workspaceId, isShielded: true });
    }

    /** Poll payment status. Returns: 'Awaiting_Boardroom' | 'Vaulted' | 'Settled' */
    async getPayloadStatus(payloadId: string) {
        const response = await axios.get(`${this.baseURL}/payload/${payloadId}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        });
        return response.data;
    }
}

// ── Agent Marketplace SDK ─────────────────────────────────

export { PayPolAgent }  from './PayPolAgent';
export { AgentClient }  from './AgentClient';
export { registerAgent } from './register';
export type {
    AgentManifest,
    AgentCategory,
    AgentConfig,
    JobRequest,
    JobResult,
    HireOptions,
    AgentRegistrationPayload,
    AgentRegistrationResponse,
    EscrowParams,
    ReputationScore,
} from './types';

// ── APS-1: Agent Payment Standard ────────────────────────
// Re-export core APS-1 types for convenience.
// For the full APS-1 package (including reference agent/client),
// use: import { ... } from '@paypol-protocol/aps-1';

export type {
    APS1Manifest,
    APS1Category,
    APS1Pricing,
    APS1PaymentMethod,
    APS1TokenConfig,
    APS1Endpoints,
    APS1ExecutionEnvelope,
    APS1Result,
    APS1Transaction,
    APS1Settlement,
    APS1NegotiationMessage,
    APS1EscrowParams,
    APS1Milestone,
} from '@paypol-protocol/aps-1';

export {
    APS1_VERSION,
    APS1_CHAIN_ID,
    APS1_NETWORK,
    APS1_PLATFORM_FEE_BPS,
    APS1_DEFAULT_TOKENS,
    APS1_CONTRACTS,
} from '@paypol-protocol/aps-1';