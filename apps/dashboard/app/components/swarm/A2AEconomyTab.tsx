'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface TransferData {
    id: string;
    senderWallet: string;
    receiverWallet: string;
    senderAgentId: string | null;
    receiverAgentId: string | null;
    amount: number;
    token: string;
    reason: string | null;
    txHash: string | null;
    status: string;
    createdAt: string;
}

interface EconomyData {
    totalVolume: number;
    totalTransfers: number;
    recentVolume: number;
    recentTransfers: number;
    avgTransfer: number;
    activeAgents: number;
    topAgents: { wallet: string; totalVolume: number; totalSent: number; totalReceived: number; connections: number }[];
    flowEdges: { from: string; to: string; volume: number }[];
}

export default function A2AEconomyTab() {
    const [economy, setEconomy] = useState<EconomyData | null>(null);
    const [transfers, setTransfers] = useState<TransferData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [ecoRes, txRes] = await Promise.all([
                fetch('/api/a2a/economy'),
                fetch('/api/a2a/transfer?limit=20'),
            ]);
            const ecoData = await ecoRes.json();
            const txData = await txRes.json();
            if (ecoData.success) setEconomy(ecoData);
            if (txData.success) setTransfers(txData.transfers);
        } catch (err) {
            console.error('Fetch A2A data error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-white/[0.03]" />)}
                </div>
                <div className="h-64 rounded-2xl bg-white/[0.03]" />
            </div>
        );
    }

    const stats = [
        { label: 'Total Volume', value: `$${(economy?.totalVolume || 0).toLocaleString()}`, icon: '💰', color: '#f59e0b' },
        { label: '24h Volume', value: `$${(economy?.recentVolume || 0).toLocaleString()}`, icon: '📈', color: '#3b82f6' },
        { label: 'Active Agents', value: economy?.activeAgents ?? 0, icon: '🤖', color: '#10b981' },
        { label: 'Avg Transfer', value: `$${(economy?.avgTransfer || 0).toFixed(2)}`, icon: '⚡', color: '#8b5cf6' },
    ];

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map((s, i) => (
                    <div key={i} className="rounded-2xl border border-white/[0.06] p-4"
                        style={{ background: `linear-gradient(135deg, ${s.color}08 0%, transparent 60%)` }}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{s.icon}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</span>
                        </div>
                        <div className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Flow Visualization */}
            {economy && economy.flowEdges.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] p-6"
                    style={{ background: 'rgba(59,130,246,0.03)' }}>
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span>⚡</span> Agent Flow Network
                    </h3>
                    <svg viewBox="0 0 800 300" className="w-full h-auto" style={{ minHeight: '200px' }}>
                        {/* Render agent nodes in a circle */}
                        {economy.topAgents.slice(0, 8).map((agent, i) => {
                            const angle = (i / Math.min(economy.topAgents.length, 8)) * Math.PI * 2 - Math.PI / 2;
                            const cx = 400 + Math.cos(angle) * 120;
                            const cy = 150 + Math.sin(angle) * 100;
                            const maxVol = Math.max(...economy.topAgents.map(a => a.totalVolume), 1);
                            const radius = 15 + (agent.totalVolume / maxVol) * 20;

                            return (
                                <g key={agent.wallet}>
                                    {/* Glow */}
                                    <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.2" />
                                    {/* Node */}
                                    <circle cx={cx} cy={cy} r={radius} fill="#3b82f620" stroke="#3b82f6" strokeWidth="1.5" />
                                    {/* Label */}
                                    <text x={cx} y={cy - radius - 8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                                        {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
                                    </text>
                                    <text x={cx} y={cy + 4} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">
                                        ${agent.totalVolume.toFixed(0)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Render flow edges */}
                        {economy.flowEdges.slice(0, 15).map((edge, i) => {
                            const fromIdx = economy.topAgents.findIndex(a => a.wallet === edge.from);
                            const toIdx = economy.topAgents.findIndex(a => a.wallet === edge.to);
                            if (fromIdx === -1 || toIdx === -1 || fromIdx >= 8 || toIdx >= 8) return null;

                            const fromAngle = (fromIdx / Math.min(economy.topAgents.length, 8)) * Math.PI * 2 - Math.PI / 2;
                            const toAngle = (toIdx / Math.min(economy.topAgents.length, 8)) * Math.PI * 2 - Math.PI / 2;
                            const x1 = 400 + Math.cos(fromAngle) * 120;
                            const y1 = 150 + Math.sin(fromAngle) * 100;
                            const x2 = 400 + Math.cos(toAngle) * 120;
                            const y2 = 150 + Math.sin(toAngle) * 100;
                            const maxEdge = Math.max(...economy.flowEdges.map(e => e.volume), 1);
                            const strokeWidth = 0.5 + (edge.volume / maxEdge) * 3;

                            return (
                                <line
                                    key={i}
                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke="#3b82f6"
                                    strokeWidth={strokeWidth}
                                    opacity={0.3}
                                    strokeDasharray="4 2"
                                />
                            );
                        })}
                    </svg>
                </div>
            )}

            {/* Transfer History */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                <div className="p-4 border-b border-white/[0.06]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>📋</span> Recent Transfers
                    </h3>
                </div>
                {transfers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No A2A transfers yet</div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {transfers.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-sm">⚡</div>
                                    <div>
                                        <div className="text-xs font-bold text-white">
                                            {tx.senderWallet.slice(0, 6)}...{tx.senderWallet.slice(-4)} → {tx.receiverWallet.slice(0, 6)}...{tx.receiverWallet.slice(-4)}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {tx.reason || 'Agent micropayment'} • {new Date(tx.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black tabular-nums text-blue-400">${tx.amount.toLocaleString()}</div>
                                    <div className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                        style={{
                                            background: tx.status === 'CONFIRMED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: tx.status === 'CONFIRMED' ? '#10b981' : '#f59e0b',
                                        }}>
                                        {tx.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
