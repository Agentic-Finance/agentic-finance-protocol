'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { REPUTATION_REGISTRY_ADDRESS } from '../lib/constants';

const RPC_URL = 'https://rpc.moderato.tempo.xyz';

const REGISTRY_ABI = [
    'function totalAgents() external view returns (uint256)',
    'function totalProofs() external view returns (uint256)',
    'function getReputation(uint256 agentCommitment) external view returns (tuple(uint256 accumulatorHash, uint256 verifiedTxCount, uint256 verifiedVolume, uint256 lastVerifiedAt, uint256 blockNumber, uint256 proofCount, bool active))',
];

interface ReputationData {
    totalAgents: number;
    totalProofs: number;
}

// Tier calculation based on verified stats
function getTier(txCount: number, volume: number): { name: string; color: string; level: number } {
    if (txCount >= 100 && volume >= 100000_000000) return { name: 'Diamond', color: '#B9F2FF', level: 5 };
    if (txCount >= 50 && volume >= 50000_000000)  return { name: 'Platinum', color: '#E5E4E2', level: 4 };
    if (txCount >= 20 && volume >= 20000_000000)  return { name: 'Gold', color: '#FFD700', level: 3 };
    if (txCount >= 10 && volume >= 5000_000000)   return { name: 'Silver', color: '#C0C0C0', level: 2 };
    if (txCount >= 1)                              return { name: 'Bronze', color: '#CD7F32', level: 1 };
    return { name: 'Unrated', color: 'var(--pp-text-muted)', level: 0 };
}

function AgentReputationPanel() {
    const [data, setData] = useState<ReputationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const registry = new ethers.Contract(REPUTATION_REGISTRY_ADDRESS, REGISTRY_ABI, provider);

            const [totalAgents, totalProofs] = await Promise.all([
                registry.totalAgents(),
                registry.totalProofs(),
            ]);

            setData({
                totalAgents: Number(totalAgents),
                totalProofs: Number(totalProofs),
            });
        } catch (e) {
            console.error('AgentReputation fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Tier thresholds for display
    const tiers = [
        { name: 'Diamond', minTx: 100, minVol: '$100K', color: '#B9F2FF', icon: '◆' },
        { name: 'Platinum', minTx: 50, minVol: '$50K', color: '#E5E4E2', icon: '◆' },
        { name: 'Gold', minTx: 20, minVol: '$20K', color: '#FFD700', icon: '◆' },
        { name: 'Silver', minTx: 10, minVol: '$5K', color: '#C0C0C0', icon: '◆' },
        { name: 'Bronze', minTx: 1, minVol: '$0', color: '#CD7F32', icon: '◆' },
    ];

    return (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:opacity-90 transition-opacity"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 45, 135, 0.12)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Agent Reputation</h3>
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>ZK credit score for AI agents</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && data && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>
                            {data.totalAgents} agents
                        </span>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--pp-border)', borderTopColor: 'var(--agt-pink)' }} />
                        </div>
                    ) : data ? (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Verified Agents</p>
                                    <p className="text-lg font-semibold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{data.totalAgents}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Total Proofs</p>
                                    <p className="text-lg font-semibold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{data.totalProofs}</p>
                                </div>
                            </div>

                            {/* Reputation Tiers */}
                            <div>
                                <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--pp-text-muted)' }}>Reputation Tiers</p>
                                <div className="space-y-1">
                                    {tiers.map((tier) => (
                                        <div key={tier.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                            <div className="flex items-center gap-2">
                                                <span style={{ color: tier.color, fontSize: 12 }}>{tier.icon}</span>
                                                <span className="text-[11px] font-medium" style={{ color: 'var(--pp-text-primary)' }}>{tier.name}</span>
                                            </div>
                                            <span className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                                                {tier.minTx}+ txs / {tier.minVol}+
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Contract link */}
                            <div className="flex justify-between items-center text-[11px] font-mono pt-1">
                                <span style={{ color: 'var(--pp-text-muted)' }}>Contract</span>
                                <a
                                    href={`https://moderato.explorer.tempo.xyz/address/${REPUTATION_REGISTRY_ADDRESS}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                    style={{ color: 'var(--agt-pink)' }}
                                >
                                    {REPUTATION_REGISTRY_ADDRESS.slice(0, 6)}...{REPUTATION_REGISTRY_ADDRESS.slice(-4)}
                                </a>
                            </div>

                            {/* How it works */}
                            <div className="rounded-lg p-3 text-[10px] space-y-1" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>
                                <p className="font-semibold" style={{ color: 'var(--pp-text-secondary)' }}>How ZK Reputation Works</p>
                                <p>Agents prove their transaction history stats (tx count, volume, zero disputes) without revealing any individual transaction. Merchants verify agent reputation before accepting payments.</p>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs py-4 text-center" style={{ color: 'var(--pp-text-muted)' }}>Failed to load reputation data</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(AgentReputationPanel);
