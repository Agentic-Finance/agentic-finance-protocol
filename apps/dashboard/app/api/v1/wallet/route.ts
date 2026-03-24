/**
 * Agent Wallet REST API — /api/v1/wallet
 *
 * RESTful API for any AI agent to create wallets, check balances,
 * transfer tokens, and manage compliance on Tempo L1.
 *
 * Authentication: Bearer token (API key)
 * Base URL: https://agt.finance/api/v1/wallet
 *
 * Endpoints:
 *   GET  /api/v1/wallet?address=0x...       → Get wallet info
 *   POST /api/v1/wallet/transfer             → Send tokens
 *   POST /api/v1/wallet/compliance/check     → Check compliance
 *   POST /api/v1/wallet/reputation/check     → Check reputation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = "https://rpc.moderato.tempo.xyz";
const ALPHA_USD = "0x20c0000000000000000000000000000000000001";
const COMPLIANCE_REGISTRY = "0x85F64F80CF5a314d23C26B137FB85EAE70bB8a14";
const REPUTATION_REGISTRY = "0xF3296984cb8785Ab236322658c13051801E58875";

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];

const COMPLIANCE_ABI = [
    "function isCompliant(uint256) view returns (bool)",
    "function sanctionsRoot() view returns (uint256)",
    "function amountThreshold() view returns (uint256)",
    "function volumeThreshold() view returns (uint256)",
    "function certificateMaxAge() view returns (uint256)",
];

const REPUTATION_ABI = [
    "function meetsRequirements(uint256,uint256,uint256) view returns (bool)",
    "function getStats() view returns (uint256,uint256)",
];

function getProvider() {
    return new ethers.JsonRpcProvider(RPC_URL);
}

// ── GET: Wallet info ────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get('address');

        if (!address || !ethers.isAddress(address)) {
            return NextResponse.json({ error: 'Valid address parameter required' }, { status: 400 });
        }

        const provider = getProvider();
        const tokenContract = new ethers.Contract(ALPHA_USD, ERC20_ABI, provider);

        const [balance, nativeBalance, symbol, decimals] = await Promise.all([
            tokenContract.balanceOf(address),
            provider.getBalance(address),
            tokenContract.symbol().catch(() => "AlphaUSD"),
            tokenContract.decimals().catch(() => 6),
        ]);

        return NextResponse.json({
            success: true,
            wallet: {
                address,
                chain: { id: 42431, name: "Tempo Moderato", rpc: RPC_URL },
                balances: {
                    [String(symbol)]: {
                        raw: balance.toString(),
                        formatted: ethers.formatUnits(balance, Number(decimals)),
                        decimals: Number(decimals),
                        token: ALPHA_USD,
                    },
                    native: {
                        raw: nativeBalance.toString(),
                        formatted: ethers.formatEther(nativeBalance),
                    },
                },
            },
            platform: {
                name: "Agentic Finance",
                tagline: "The Economy Runs on Trust. We Built It for Machines.",
                contracts: {
                    complianceRegistry: COMPLIANCE_REGISTRY,
                    reputationRegistry: REPUTATION_REGISTRY,
                },
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// ── POST: Actions ───────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        switch (action) {
            case 'compliance_check': {
                const { commitment } = body;
                if (!commitment) return NextResponse.json({ error: 'commitment required' }, { status: 400 });

                const provider = getProvider();
                const contract = new ethers.Contract(COMPLIANCE_REGISTRY, COMPLIANCE_ABI, provider);

                const [isCompliant, sanctionsRoot, amountThreshold, volumeThreshold, maxAge] = await Promise.all([
                    contract.isCompliant(commitment),
                    contract.sanctionsRoot(),
                    contract.amountThreshold(),
                    contract.volumeThreshold(),
                    contract.certificateMaxAge(),
                ]);

                return NextResponse.json({
                    success: true,
                    compliance: {
                        commitment,
                        isCompliant,
                        sanctionsRoot: sanctionsRoot.toString(),
                        amountThreshold: ethers.formatUnits(amountThreshold, 6),
                        volumeThreshold: ethers.formatUnits(volumeThreshold, 6),
                        certificateMaxAge: Number(maxAge),
                    },
                });
            }

            case 'reputation_check': {
                const { commitment, minTxCount = 0, minVolume = "0" } = body;
                if (!commitment) return NextResponse.json({ error: 'commitment required' }, { status: 400 });

                const provider = getProvider();
                const contract = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, provider);

                const [meetsReqs, stats] = await Promise.all([
                    contract.meetsRequirements(commitment, minTxCount, minVolume),
                    contract.getStats(),
                ]);

                return NextResponse.json({
                    success: true,
                    reputation: {
                        commitment,
                        meetsRequirements: meetsReqs,
                        minTxCount,
                        minVolume,
                        registryStats: {
                            totalAgents: Number(stats[0]),
                            totalProofs: Number(stats[1]),
                        },
                    },
                });
            }

            case 'platform_stats': {
                const provider = getProvider();
                const compContract = new ethers.Contract(COMPLIANCE_REGISTRY, COMPLIANCE_ABI, provider);
                const repContract = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, provider);

                const [compRoot, repStats] = await Promise.all([
                    compContract.sanctionsRoot().catch(() => BigInt(0)),
                    repContract.getStats().catch(() => [0, 0]),
                ]);

                return NextResponse.json({
                    success: true,
                    platform: {
                        name: "Agentic Finance",
                        tagline: "The Economy Runs on Trust. We Built It for Machines.",
                        chain: { id: 42431, name: "Tempo Moderato" },
                        contracts: 21,
                        agents: 50,
                        compliance: {
                            sanctionsRootSet: compRoot.toString() !== "0",
                        },
                        reputation: {
                            totalAgents: Number(repStats[0]),
                            totalProofs: Number(repStats[1]),
                        },
                    },
                });
            }

            default:
                return NextResponse.json({
                    error: 'Unknown action',
                    availableActions: ['compliance_check', 'reputation_check', 'platform_stats'],
                }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
