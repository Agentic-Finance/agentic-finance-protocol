/**
 * White-label Compliance API — /api/v1/compliance
 *
 * "Cloudflare for Agent Payment Compliance"
 *
 * Any x402/MPP server can call this API to verify agent compliance
 * without running their own ZK infrastructure.
 *
 * Endpoints:
 *   GET  /api/v1/compliance?commitment=xxx  → Check compliance status
 *   POST /api/v1/compliance                 → Batch check multiple commitments
 *
 * Headers required by servers:
 *   X-Compliance-Required: true
 *   X-Compliance-Registry: 0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14
 *   X-Compliance-Chain: 42431
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const COMPLIANCE_REGISTRY = "0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14";
const REPUTATION_REGISTRY = "0xF3296984cb8785Ab236322658c13051801E58875";

const COMPLIANCE_ABI = [
    "function isCompliant(uint256) view returns (bool)",
    "function sanctionsRoot() view returns (uint256)",
    "function amountThreshold() view returns (uint256)",
    "function volumeThreshold() view returns (uint256)",
    "function certificateMaxAge() view returns (uint256)",
    "function totalCertificates() view returns (uint256)",
    "function totalVerified() view returns (uint256)",
];

const REPUTATION_ABI = [
    "function meetsRequirements(uint256,uint256,uint256) view returns (bool)",
    "function getStats() view returns (uint256,uint256)",
];

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getProvider() {
    return new ethers.JsonRpcProvider(RPC_URL);
}

// ── GET: Single compliance check ─────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const commitment = searchParams.get('commitment');
    const reputationCommitment = searchParams.get('reputation');
    const minTx = searchParams.get('minTx');
    const minVol = searchParams.get('minVolume');

    // No params → return API documentation
    if (!commitment) {
        return NextResponse.json({
            api: "Agentic Finance Compliance API",
            version: "1.0",
            tagline: "The Economy Runs on Trust. We Built It for Machines.",
            endpoints: {
                "GET /api/v1/compliance?commitment=xxx": "Check single compliance status",
                "GET /api/v1/compliance?commitment=xxx&reputation=yyy&minTx=10&minVolume=50000000000": "Check compliance + reputation",
                "POST /api/v1/compliance": "Batch check multiple commitments",
            },
            integration: {
                description: "Add these headers to your 402 response to require ZK compliance:",
                headers: {
                    "X-Compliance-Required": "true",
                    "X-Compliance-Registry": COMPLIANCE_REGISTRY,
                    "X-Compliance-Chain": "42431",
                },
            },
            contracts: {
                complianceRegistry: COMPLIANCE_REGISTRY,
                reputationRegistry: REPUTATION_REGISTRY,
                chain: "Tempo Moderato (42431)",
            },
        });
    }

    try {
        // Check cache
        const cached = cache.get(commitment);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({
                commitment,
                isCompliant: cached.result,
                cached: true,
                chain: 42431,
            });
        }

        const provider = getProvider();
        const compContract = new ethers.Contract(COMPLIANCE_REGISTRY, COMPLIANCE_ABI, provider);

        const isCompliant = await compContract.isCompliant(commitment);
        cache.set(commitment, { result: isCompliant, timestamp: Date.now() });

        const response: Record<string, unknown> = {
            commitment,
            isCompliant,
            cached: false,
            chain: 42431,
            registry: COMPLIANCE_REGISTRY,
        };

        // Optional reputation check
        if (reputationCommitment) {
            const repContract = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, provider);
            const meetsReqs = await repContract.meetsRequirements(
                reputationCommitment,
                parseInt(minTx || '0'),
                minVol || '0'
            );
            response.reputation = {
                commitment: reputationCommitment,
                meetsRequirements: meetsReqs,
                minTxCount: parseInt(minTx || '0'),
                minVolume: minVol || '0',
            };
        }

        return NextResponse.json(response);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// ── POST: Batch compliance check ─────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { commitments } = body;

        if (!Array.isArray(commitments) || commitments.length === 0) {
            return NextResponse.json({ error: 'commitments array required' }, { status: 400 });
        }

        if (commitments.length > 100) {
            return NextResponse.json({ error: 'Max 100 commitments per batch' }, { status: 400 });
        }

        const provider = getProvider();
        const contract = new ethers.Contract(COMPLIANCE_REGISTRY, COMPLIANCE_ABI, provider);

        const results = await Promise.all(
            commitments.map(async (commitment: string) => {
                const cached = cache.get(commitment);
                if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                    return { commitment, isCompliant: cached.result, cached: true };
                }

                const isCompliant = await contract.isCompliant(commitment);
                cache.set(commitment, { result: isCompliant, timestamp: Date.now() });
                return { commitment, isCompliant, cached: false };
            })
        );

        const stats = await Promise.all([
            contract.totalCertificates().catch(() => 0),
            contract.totalVerified().catch(() => 0),
        ]);

        return NextResponse.json({
            results,
            total: results.length,
            compliant: results.filter(r => r.isCompliant).length,
            nonCompliant: results.filter(r => !r.isCompliant).length,
            registryStats: {
                totalCertificates: Number(stats[0]),
                totalVerified: Number(stats[1]),
            },
            chain: 42431,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
