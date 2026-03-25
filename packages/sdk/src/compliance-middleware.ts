/**
 * @agtfi/compliance-middleware — "Cloudflare for Agent Payment Compliance"
 *
 * Drop-in middleware that adds ZK compliance to any x402/MPP server.
 * Server adds one header → agents must prove compliance before payment.
 *
 * Usage for Express/Node.js:
 *
 *   import { complianceMiddleware } from '@agtfi/sdk';
 *
 *   app.use('/api', complianceMiddleware({
 *     registryAddress: '0x85F6...',
 *     rpcUrl: 'https://rpc.moderato.tempo.xyz',
 *     requireReputation: true,
 *     minTxCount: 10,
 *     minVolume: 50000_000000,
 *   }));
 *
 * How it works:
 *   1. Client sends request with `Authorization: Payment credential=...`
 *   2. Middleware checks `X-Compliance-Commitment` header
 *   3. If present → verifies on-chain via ComplianceRegistry.isCompliant()
 *   4. If not present → returns 402 with X-Compliance-Required: true
 *   5. If verified → passes to next handler
 *
 * For x402 servers:
 *   The middleware intercepts the 402 response and adds compliance headers.
 *
 * For MPP servers:
 *   The middleware validates compliance before creating sessions.
 */

import { ethers } from 'ethers';

// --- TYPES ---

export interface ComplianceMiddlewareConfig {
    /** ComplianceRegistry contract address */
    registryAddress: string;
    /** RPC URL for verification */
    rpcUrl: string;
    /** Also require reputation? (default: false) */
    requireReputation?: boolean;
    /** AgentReputationRegistry address (required if requireReputation) */
    reputationRegistryAddress?: string;
    /** Minimum tx count for reputation (default: 0) */
    minTxCount?: number;
    /** Minimum volume for reputation (default: 0) */
    minVolume?: bigint | number;
    /** Chain ID (default: 42431) */
    chainId?: number;
    /** Cache TTL in seconds (default: 300 = 5 min) */
    cacheTtl?: number;
    /** Skip compliance for these paths */
    skipPaths?: string[];
}

interface ComplianceCacheEntry {
    isCompliant: boolean;
    checkedAt: number;
}

// --- ABI ---

const COMPLIANCE_ABI = [
    'function isCompliant(uint256 commitment) view returns (bool)',
];

const REPUTATION_ABI = [
    'function meetsRequirements(uint256 commitment, uint256 txCount, uint256 volume) view returns (bool)',
];

// --- MIDDLEWARE ---

/**
 * Create Express-compatible compliance middleware
 */
export function complianceMiddleware(config: ComplianceMiddlewareConfig) {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const complianceContract = new ethers.Contract(
        config.registryAddress, COMPLIANCE_ABI, provider
    );

    let reputationContract: ethers.Contract | null = null;
    if (config.requireReputation && config.reputationRegistryAddress) {
        reputationContract = new ethers.Contract(
            config.reputationRegistryAddress, REPUTATION_ABI, provider
        );
    }

    const cacheTtl = (config.cacheTtl || 300) * 1000; // ms
    const cache = new Map<string, ComplianceCacheEntry>();
    const chainId = config.chainId || 42431;
    const skipPaths = config.skipPaths || [];

    return async function middleware(req: any, res: any, next: any) {
        // Skip specified paths
        if (skipPaths.some(p => req.path?.startsWith(p))) {
            return next();
        }

        // Extract compliance commitment from header
        const complianceCommitment = req.headers['x-compliance-commitment'];
        const reputationCommitment = req.headers['x-reputation-commitment'];

        // No commitment → return 402 with compliance requirements
        if (!complianceCommitment) {
            res.setHeader('X-Compliance-Required', 'true');
            res.setHeader('X-Compliance-Registry', config.registryAddress);
            res.setHeader('X-Compliance-Chain', chainId.toString());

            if (config.requireReputation) {
                res.setHeader('X-Reputation-Required', 'true');
                res.setHeader('X-Reputation-Registry', config.reputationRegistryAddress || '');
                res.setHeader('X-Reputation-Min-Tx', (config.minTxCount || 0).toString());
                res.setHeader('X-Reputation-Min-Volume', (config.minVolume || 0).toString());
            }

            return res.status(402).json({
                error: 'compliance_required',
                message: 'ZK compliance proof required. Submit proof to ComplianceRegistry first.',
                registry: config.registryAddress,
                chain: chainId,
                reputationRequired: !!config.requireReputation,
            });
        }

        // Check cache
        const cacheKey = `compliance:${complianceCommitment}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.checkedAt < cacheTtl) {
            if (cached.isCompliant) {
                req.agentCompliance = {
                    commitment: complianceCommitment,
                    verified: true,
                    cachedAt: cached.checkedAt,
                };
                return next();
            }
            return res.status(403).json({
                error: 'compliance_failed',
                message: 'Compliance certificate invalid or expired.',
            });
        }

        // Verify on-chain
        try {
            const isCompliant = await complianceContract.isCompliant(complianceCommitment);

            if (!isCompliant) {
                cache.set(cacheKey, { isCompliant: false, checkedAt: Date.now() });
                return res.status(403).json({
                    error: 'compliance_failed',
                    message: 'Compliance certificate invalid or expired. Generate a new ZK proof.',
                });
            }

            // Check reputation if required
            if (config.requireReputation && reputationContract && reputationCommitment) {
                const meetsReqs = await reputationContract.meetsRequirements(
                    reputationCommitment,
                    config.minTxCount || 0,
                    config.minVolume || 0,
                );

                if (!meetsReqs) {
                    return res.status(403).json({
                        error: 'reputation_insufficient',
                        message: `Agent does not meet minimum reputation requirements (${config.minTxCount} txs, ${config.minVolume} volume).`,
                    });
                }
            }

            // Cache and proceed
            cache.set(cacheKey, { isCompliant: true, checkedAt: Date.now() });

            req.agentCompliance = {
                commitment: complianceCommitment,
                reputationCommitment: reputationCommitment || null,
                verified: true,
                verifiedAt: Date.now(),
            };

            return next();
        } catch (error: any) {
            console.error('[ComplianceMiddleware] Verification error:', error.message);
            return res.status(500).json({
                error: 'verification_error',
                message: 'Failed to verify compliance on-chain.',
            });
        }
    };
}

/**
 * Create compliance headers for x402 challenge response
 * Use this to add compliance requirements to existing 402 responses
 */
export function addComplianceHeaders(
    headers: Record<string, string>,
    config: {
        registryAddress: string;
        chainId?: number;
        requireReputation?: boolean;
        reputationRegistryAddress?: string;
        minTxCount?: number;
        minVolume?: number;
    }
): Record<string, string> {
    return {
        ...headers,
        'X-Compliance-Required': 'true',
        'X-Compliance-Registry': config.registryAddress,
        'X-Compliance-Chain': (config.chainId || 42431).toString(),
        ...(config.requireReputation ? {
            'X-Reputation-Required': 'true',
            'X-Reputation-Registry': config.reputationRegistryAddress || '',
            'X-Reputation-Min-Tx': (config.minTxCount || 0).toString(),
            'X-Reputation-Min-Volume': (config.minVolume || 0).toString(),
        } : {}),
    };
}

export default complianceMiddleware;
