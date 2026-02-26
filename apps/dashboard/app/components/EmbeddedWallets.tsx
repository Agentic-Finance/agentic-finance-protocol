'use client';

import React, { useState, useEffect } from 'react';
import {
    WalletIcon,
    PlusIcon,
    CpuChipIcon,
    UserGroupIcon,
    CheckCircleIcon,
    XMarkIcon,
    ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

interface WalletItem {
    id: string;
    label: string;
    ownerType: string;
    ownerId: string | null;
    address: string;
    balance: number;
    isActive: boolean;
    createdAt: string;
    lastUsedAt: string | null;
}

interface WalletSummary {
    totalWallets: number;
    agentWallets: number;
    employeeWallets: number;
    totalBalance: number;
    activeWallets: number;
}

function formatUSD(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
}

function truncateAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function EmbeddedWallets() {
    const [wallets, setWallets] = useState<WalletItem[]>([]);
    const [summary, setSummary] = useState<WalletSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showGenerate, setShowGenerate] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genLabel, setGenLabel] = useState('');
    const [genType, setGenType] = useState<'agent' | 'employee'>('agent');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchWallets();
    }, []);

    async function fetchWallets() {
        try {
            const res = await fetch('/api/wallets');
            const json = await res.json();
            setWallets(json.wallets || []);
            setSummary(json.summary || null);
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate() {
        if (!genLabel.trim()) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/wallets/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: genLabel.trim(), ownerType: genType }),
            });
            const json = await res.json();
            if (json.success) {
                setShowGenerate(false);
                setGenLabel('');
                await fetchWallets();
            }
        } catch {
            // Silent fail
        } finally {
            setGenerating(false);
        }
    }

    function copyAddress(addr: string, id: string) {
        navigator.clipboard.writeText(addr);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="pp-card p-5">
                            <div className="pp-skeleton h-3 w-24 mb-3 rounded" />
                            <div className="pp-skeleton h-8 w-20 mb-1 rounded" />
                            <div className="pp-skeleton h-2.5 w-16 rounded" />
                        </div>
                    ))}
                </div>
                <div className="pp-card p-6">
                    <div className="pp-skeleton h-5 w-48 mb-6 rounded" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="pp-skeleton h-14 w-full rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<WalletIcon className="w-5 h-5" />}
                    label="Total Wallets"
                    value={String(summary?.totalWallets ?? 0)}
                    color="indigo"
                    subtitle={`${summary?.activeWallets ?? 0} active`}
                />
                <StatCard
                    icon={<CpuChipIcon className="w-5 h-5" />}
                    label="Agent Wallets"
                    value={String(summary?.agentWallets ?? 0)}
                    color="emerald"
                    subtitle="Isolated per agent"
                />
                <StatCard
                    icon={<UserGroupIcon className="w-5 h-5" />}
                    label="Employee Wallets"
                    value={String(summary?.employeeWallets ?? 0)}
                    color="amber"
                    subtitle="Payroll recipients"
                />
                <StatCard
                    icon={<WalletIcon className="w-5 h-5" />}
                    label="Total Balance"
                    value={formatUSD(summary?.totalBalance ?? 0)}
                    color="cyan"
                    subtitle="Across all wallets"
                />
            </div>

            {/* Wallet List */}
            <div className="pp-card p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <WalletIcon className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-white font-bold text-lg">Managed Wallets</h3>
                    </div>
                    <button
                        onClick={() => setShowGenerate(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-400 rounded-xl text-xs font-semibold transition-all"
                    >
                        <PlusIcon className="w-3.5 h-3.5" /> Generate Wallet
                    </button>
                </div>

                {/* Generate Modal */}
                {showGenerate && (
                    <div className="mb-5 bg-[#0A0E17] border border-indigo-500/20 rounded-xl p-5 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-semibold text-sm">Generate New Wallet</h4>
                            <button onClick={() => setShowGenerate(false)} className="text-slate-500 hover:text-white">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1">Label</label>
                                <input
                                    type="text"
                                    value={genLabel}
                                    onChange={(e) => setGenLabel(e.target.value)}
                                    placeholder="e.g. Agent: ContractGuard"
                                    className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setGenType('agent')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                                            genType === 'agent'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                                : 'bg-black/20 text-slate-500 border border-white/[0.04]'
                                        }`}
                                    >
                                        Agent
                                    </button>
                                    <button
                                        onClick={() => setGenType('employee')}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                                            genType === 'employee'
                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                                                : 'bg-black/20 text-slate-500 border border-white/[0.04]'
                                        }`}
                                    >
                                        Employee
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={generating || !genLabel.trim()}
                                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    generating || !genLabel.trim()
                                        ? 'bg-white/[0.04] text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                                }`}
                            >
                                {generating ? 'Generating...' : 'Generate & Encrypt'}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-3">
                            Private key encrypted with AES-256-GCM. Never exposed in plaintext.
                        </p>
                    </div>
                )}

                {/* Wallet Table */}
                {wallets.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-sm">
                        No wallets generated yet. Click "Generate Wallet" to create one.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-white/[0.04]">
                                    <th className="text-left py-2 font-medium">Label</th>
                                    <th className="text-left py-2 font-medium">Address</th>
                                    <th className="text-center py-2 font-medium">Type</th>
                                    <th className="text-right py-2 font-medium">Balance</th>
                                    <th className="text-center py-2 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wallets.map((w) => (
                                    <tr key={w.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                                        <td className="py-3">
                                            <span className="text-white font-medium text-sm">{w.label}</span>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-400 font-mono text-xs">{truncateAddress(w.address)}</span>
                                                <button
                                                    onClick={() => copyAddress(w.address, w.id)}
                                                    className="text-slate-600 hover:text-indigo-400 transition-colors"
                                                    title="Copy address"
                                                >
                                                    {copiedId === w.id ? (
                                                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                                                    ) : (
                                                        <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                w.ownerType === 'agent'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {w.ownerType}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-white font-mono font-semibold">{formatUSD(w.balance)}</span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className={`inline-block w-2 h-2 rounded-full ${
                                                w.isActive ? 'bg-emerald-400' : 'bg-slate-600'
                                            }`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Security Info */}
            <div className="pp-card p-5">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold text-sm mb-1">Enterprise-Grade Security</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                            All private keys are encrypted using AES-256-GCM with a derived master key.
                            Keys are never stored in plaintext and can only be decrypted server-side for transaction signing.
                            Each wallet is isolated per agent or employee for complete fund separation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────

function StatCard({ icon, label, value, color, subtitle }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'emerald' | 'indigo' | 'amber' | 'cyan';
    subtitle?: string;
}) {
    const colors = {
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]' },
        indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-400',  glow: 'shadow-[0_0_20px_rgba(99,102,241,0.1)]' },
        amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
        cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.1)]' },
    };
    const c = colors[color];

    return (
        <div className={`${c.bg} border ${c.border} rounded-2xl p-5 ${c.glow}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={c.text}>{icon}</div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`${c.text} font-mono font-black text-3xl`}>{value}</div>
            {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
        </div>
    );
}
