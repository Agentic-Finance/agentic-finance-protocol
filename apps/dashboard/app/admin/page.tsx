'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import JudgeDashboard from '../components/JudgeDashboard';
import {
    ShieldCheckIcon,
    HomeIcon,
    BoltIcon,
    ScaleIcon,
    ClockIcon,
    CubeTransparentIcon,
    ServerStackIcon,
    ArrowTrendingUpIcon,
    UsersIcon,
    DocumentTextIcon,
    CpuChipIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    EyeIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────
interface ConditionalRule {
    id: string;
    name: string;
    recipients: any[];
    conditions: any[];
    conditionLogic: string;
    status: string;
    triggerCount: number;
    maxTriggers: number;
    note: string | null;
    createdAt: string;
    triggeredAt: string | null;
}

interface WorkspaceInfo {
    id: number;
    name: string;
    type: string;
    admin_wallet: string;
    created_at: string;
}

interface Transaction {
    id: string;
    recipientName: string;
    recipientAddress: string;
    amount: string;
    token: string;
    status: string;
    note: string;
    createdAt: string;
}

type NavSection = 'overview' | 'conditional' | 'arbitration' | 'transactions' | 'system';

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof HomeIcon; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: HomeIcon },
    { id: 'conditional', label: 'Conditional Rules', icon: BoltIcon },
    { id: 'arbitration', label: 'Arbitration', icon: ScaleIcon },
    { id: 'transactions', label: 'Transactions', icon: ClockIcon },
    { id: 'system', label: 'System Health', icon: ServerStackIcon },
];

// ──────────────────────────────────────────────────────
// Helper: Format relative time
// ──────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ──────────────────────────────────────────────────────
// Main Admin Page
// ──────────────────────────────────────────────────────
export default function PayPolAdminPage() {
    const [activeSection, setActiveSection] = useState<NavSection>('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Data states
    const [rules, setRules] = useState<ConditionalRule[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
    const [escrowCount, setEscrowCount] = useState(0);
    const [isLoadingRules, setIsLoadingRules] = useState(false);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

    // ── Fetchers ──
    const fetchRules = useCallback(async () => {
        setIsLoadingRules(true);
        try {
            const res = await fetch('/api/conditional-payroll');
            const data = await res.json();
            if (data.success) setRules(data.rules || []);
        } catch { /* silent */ }
        setIsLoadingRules(false);
    }, []);

    const fetchTransactions = useCallback(async () => {
        setIsLoadingTx(true);
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            if (data.success) setTransactions(data.employees || []);
        } catch { /* silent */ }
        setIsLoadingTx(false);
    }, []);

    const fetchEscrows = useCallback(async () => {
        try {
            const res = await fetch('/api/escrow');
            const data = await res.json();
            if (data.success) setEscrowCount(data.escrows?.length || 0);
        } catch { /* silent */ }
    }, []);

    const fetchWorkspaces = useCallback(async () => {
        try {
            const res = await fetch('/api/workspace');
            const data = await res.json();
            if (data.workspace) setWorkspaces([data.workspace]);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchRules();
        fetchTransactions();
        fetchEscrows();
        fetchWorkspaces();
    }, [fetchRules, fetchTransactions, fetchEscrows, fetchWorkspaces]);

    // ── Rule Actions ──
    const handleRuleAction = async (id: string, action: 'pause' | 'resume' | 'trigger' | 'delete') => {
        if (action === 'delete') {
            await fetch(`/api/conditional-payroll?id=${id}`, { method: 'DELETE' });
        } else {
            await fetch('/api/conditional-payroll', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
        }
        fetchRules();
    };

    // ── Computed stats ──
    const watchingRules = rules.filter(r => r.status === 'Watching').length;
    const triggeredRules = rules.filter(r => r.status === 'Triggered').length;
    const totalTxValue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const pendingTx = transactions.filter(t => t.status === 'Draft' || t.status === 'PENDING').length;
    const completedTx = transactions.filter(t => t.status === 'COMPLETED').length;

    // ── Current date ──
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans flex">
            {/* ════════════════════════════════════════════ */}
            {/* SIDEBAR                                      */}
            {/* ════════════════════════════════════════════ */}
            <aside className={`fixed top-0 left-0 h-screen bg-[#141924] border-r border-white/[0.06] z-50 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
                {/* Logo */}
                <div className={`h-20 flex items-center border-b border-white/[0.06] px-5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    {sidebarCollapsed ? (
                        <button onClick={() => setSidebarCollapsed(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <Image src="/logo.png" alt="PayPol" width={32} height={32} className="w-8 h-8 object-contain" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <Image src="/logo.png" alt="PayPol" width={120} height={30} className="h-8 w-auto object-contain" />
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                                <button onClick={() => setSidebarCollapsed(true)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white">
                                    <ChevronRightIcon className="w-3.5 h-3.5 rotate-180" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => {
                        const isActive = activeSection === item.id;
                        const Icon = item.icon;
                        // Dynamic badges
                        let badge: string | null = null;
                        if (item.id === 'conditional' && watchingRules > 0) badge = String(watchingRules);
                        if (item.id === 'arbitration' && escrowCount > 0) badge = String(escrowCount);
                        if (item.id === 'transactions' && pendingTx > 0) badge = String(pendingTx);

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                                    sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3'
                                } ${
                                    isActive
                                        ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]'
                                }`}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="text-sm font-semibold flex-1 text-left">{item.label}</span>
                                        {badge && (
                                            <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                                                {badge}
                                            </span>
                                        )}
                                    </>
                                )}
                                {sidebarCollapsed && badge && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-400 rounded-full"></span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom: Back to Dashboard */}
                <div className="p-3 border-t border-white/[0.06]">
                    <a
                        href="/"
                        className={`w-full flex items-center gap-3 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.03] transition-all ${
                            sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3'
                        }`}
                    >
                        <ArrowTopRightOnSquareIcon className="w-5 h-5 shrink-0" />
                        {!sidebarCollapsed && <span className="text-sm font-semibold">Back to Dashboard</span>}
                    </a>
                </div>
            </aside>

            {/* ════════════════════════════════════════════ */}
            {/* MAIN CONTENT                                 */}
            {/* ════════════════════════════════════════════ */}
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
                {/* Top Bar */}
                <header className="h-20 border-b border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-8">
                    <div>
                        <h1 className="text-lg font-bold text-white">
                            {activeSection === 'overview' && 'Command Center'}
                            {activeSection === 'conditional' && 'Conditional Rules'}
                            {activeSection === 'arbitration' && 'Arbitration Node'}
                            {activeSection === 'transactions' && 'Transaction Ledger'}
                            {activeSection === 'system' && 'System Health'}
                        </h1>
                        <p className="text-[11px] text-slate-500 mt-0.5">{dateStr}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            All Systems Nominal
                        </span>
                        <span className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            Tempo Network
                        </span>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8">
                    {/* ─── OVERVIEW ─── */}
                    {activeSection === 'overview' && (
                        <div className="animate-in fade-in duration-300 space-y-8">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                                <KpiCard
                                    title="Total Transactions"
                                    value={String(transactions.length)}
                                    subtitle={`${pendingTx} pending · ${completedTx} completed`}
                                    icon={<ClockIcon className="w-5 h-5" />}
                                    accent="indigo"
                                />
                                <KpiCard
                                    title="Transaction Volume"
                                    value={`$${totalTxValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    subtitle="Across all payloads"
                                    icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
                                    accent="emerald"
                                />
                                <KpiCard
                                    title="Conditional Rules"
                                    value={String(rules.length)}
                                    subtitle={`${watchingRules} watching · ${triggeredRules} triggered`}
                                    icon={<BoltIcon className="w-5 h-5" />}
                                    accent="amber"
                                />
                                <KpiCard
                                    title="Active Escrows"
                                    value={String(escrowCount)}
                                    subtitle="Pending arbitration"
                                    icon={<ScaleIcon className="w-5 h-5" />}
                                    accent="rose"
                                />
                            </div>

                            {/* Quick Actions Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                {/* Recent Activity */}
                                <div className="lg:col-span-2 bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <ClockIcon className="w-4 h-4 text-indigo-400" />
                                            Recent Transactions
                                        </h3>
                                        <button onClick={() => setActiveSection('transactions')} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider transition-colors">
                                            View All →
                                        </button>
                                    </div>
                                    {transactions.length === 0 ? (
                                        <div className="text-center py-10 text-slate-600 text-sm font-mono">
                                            No transactions yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {transactions.slice(0, 6).map(tx => (
                                                <div key={tx.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400'
                                                        : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-500/10 text-amber-400'
                                                        : 'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                        {tx.status === 'COMPLETED' ? <CheckCircleIcon className="w-4 h-4" />
                                                        : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                        : <DocumentTextIcon className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{tx.recipientName || 'Unknown'}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono truncate">{tx.recipientAddress}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-white tabular-nums">{parseFloat(tx.amount).toFixed(2)}</p>
                                                        <p className="text-[10px] text-slate-500">{tx.token}</p>
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 ${
                                                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400'
                                                        : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-500/10 text-amber-400'
                                                        : 'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Conditional Rules Summary */}
                                <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <BoltIcon className="w-4 h-4 text-amber-400" />
                                            Active Rules
                                        </h3>
                                        <button onClick={() => setActiveSection('conditional')} className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider transition-colors">
                                            Manage →
                                        </button>
                                    </div>
                                    {rules.length === 0 ? (
                                        <div className="text-center py-10 text-slate-600 text-sm font-mono">
                                            No rules configured
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {rules.slice(0, 5).map(rule => (
                                                <div key={rule.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-amber-500/15 transition-all">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                        rule.status === 'Watching' ? 'bg-amber-400 animate-pulse'
                                                        : rule.status === 'Triggered' ? 'bg-emerald-400'
                                                        : rule.status === 'Paused' ? 'bg-slate-500'
                                                        : 'bg-rose-400'
                                                    }`}></span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-white truncate">{rule.name}</p>
                                                        <p className="text-[10px] text-slate-600">{rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''} · {rule.conditionLogic}</p>
                                                    </div>
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                                        rule.status === 'Watching' ? 'text-amber-400' : rule.status === 'Triggered' ? 'text-emerald-400' : 'text-slate-500'
                                                    }`}>
                                                        {rule.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Workspace Info */}
                            <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                                    <UsersIcon className="w-4 h-4 text-fuchsia-400" />
                                    Registered Workspaces
                                </h3>
                                {workspaces.length === 0 ? (
                                    <div className="text-center py-8 text-slate-600 text-sm font-mono">
                                        No workspaces found
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/[0.06]">
                                                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 px-3">Name</th>
                                                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 px-3">Type</th>
                                                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 px-3">Admin Wallet</th>
                                                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 px-3">Created</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {workspaces.map((ws, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-3 px-3 font-medium text-white">{ws.name}</td>
                                                        <td className="py-3 px-3">
                                                            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                                                                {ws.type}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 font-mono text-xs text-slate-400">{ws.admin_wallet ? `${ws.admin_wallet.slice(0, 10)}...${ws.admin_wallet.slice(-6)}` : '-'}</td>
                                                        <td className="py-3 px-3 text-xs text-slate-500">{ws.created_at ? new Date(ws.created_at).toLocaleDateString() : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── CONDITIONAL RULES ─── */}
                    {activeSection === 'conditional' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            {/* Header actions */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    Manage your If-This-Then-Pay automation rules. Agent monitors conditions every 60s.
                                </p>
                                <button onClick={fetchRules} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all">
                                    <ArrowPathIcon className={`w-4 h-4 ${isLoadingRules ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>

                            {/* Rules Table */}
                            {rules.length === 0 ? (
                                <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-12 text-center">
                                    <BoltIcon className="w-12 h-12 text-amber-500/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">No Conditional Rules Yet</h3>
                                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                                        Create rules from the OmniTerminal by clicking the Conditional button.
                                        Rules will appear here once deployed.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {rules.map(rule => (
                                        <div key={rule.id} className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6 hover:border-amber-500/15 transition-all">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                        rule.status === 'Watching' ? 'bg-amber-500/10 border border-amber-500/20'
                                                        : rule.status === 'Triggered' ? 'bg-emerald-500/10 border border-emerald-500/20'
                                                        : rule.status === 'Paused' ? 'bg-slate-500/10 border border-slate-500/20'
                                                        : 'bg-rose-500/10 border border-rose-500/20'
                                                    }`}>
                                                        <BoltIcon className={`w-5 h-5 ${
                                                            rule.status === 'Watching' ? 'text-amber-400'
                                                            : rule.status === 'Triggered' ? 'text-emerald-400'
                                                            : rule.status === 'Paused' ? 'text-slate-400'
                                                            : 'text-rose-400'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-bold text-white">{rule.name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                            ID: {rule.id.slice(0, 8)}... · Created {timeAgo(rule.createdAt)}
                                                            {rule.triggeredAt && ` · Triggered ${timeAgo(rule.triggeredAt)}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider border ${
                                                        rule.status === 'Watching' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        : rule.status === 'Triggered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : rule.status === 'Paused' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    }`}>
                                                        {rule.status === 'Watching' && '● '}
                                                        {rule.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Conditions */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {rule.conditions.map((cond: any, idx: number) => (
                                                    <React.Fragment key={idx}>
                                                        {idx > 0 && (
                                                            <span className="text-[9px] font-black text-amber-500/50 self-center px-1">{rule.conditionLogic}</span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1120] border border-white/[0.08] rounded-lg text-xs text-slate-300 font-mono">
                                                            <span className="text-amber-400/70">{cond.type}</span>
                                                            <span className="text-slate-600">|</span>
                                                            {cond.param && <span>{cond.param}</span>}
                                                            <span className="text-amber-400 font-bold">{cond.operator}</span>
                                                            <span className="text-white font-medium">{cond.value}</span>
                                                        </span>
                                                    </React.Fragment>
                                                ))}
                                            </div>

                                            {/* Recipients preview */}
                                            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider shrink-0">Recipients:</span>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {rule.recipients.slice(0, 3).map((r: any, idx: number) => (
                                                        <span key={idx} className="text-xs text-slate-300 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded-md">
                                                            {r.name || r.wallet?.slice(0, 8) + '...'} - {r.amount} {r.token}
                                                        </span>
                                                    ))}
                                                    {rule.recipients.length > 3 && (
                                                        <span className="text-[10px] text-slate-500">+{rule.recipients.length - 3} more</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats row */}
                                            <div className="flex items-center gap-6 text-[10px] text-slate-500 font-mono mb-4">
                                                <span>Triggers: {rule.triggerCount} / {rule.maxTriggers === 1 ? 'Once' : rule.maxTriggers}</span>
                                                {rule.note && <span>Note: {rule.note}</span>}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-4 border-t border-white/[0.04]">
                                                {rule.status === 'Watching' && (
                                                    <>
                                                        <button onClick={() => handleRuleAction(rule.id, 'trigger')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-all">
                                                            <PlayIcon className="w-3.5 h-3.5" /> Trigger Now
                                                        </button>
                                                        <button onClick={() => handleRuleAction(rule.id, 'pause')} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold transition-all">
                                                            <PauseIcon className="w-3.5 h-3.5" /> Pause
                                                        </button>
                                                    </>
                                                )}
                                                {rule.status === 'Paused' && (
                                                    <button onClick={() => handleRuleAction(rule.id, 'resume')} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-bold transition-all">
                                                        <PlayIcon className="w-3.5 h-3.5" /> Resume
                                                    </button>
                                                )}
                                                <button onClick={() => handleRuleAction(rule.id, 'delete')} className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400/70 hover:text-rose-400 rounded-lg text-xs font-bold transition-all ml-auto">
                                                    <TrashIcon className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── ARBITRATION ─── */}
                    {activeSection === 'arbitration' && (
                        <div className="animate-in fade-in duration-300">
                            <JudgeDashboard isPaypolArbitrator={true} />
                        </div>
                    )}

                    {/* ─── TRANSACTIONS ─── */}
                    {activeSection === 'transactions' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    All transactions submitted to the Boardroom queue.
                                </p>
                                <button onClick={fetchTransactions} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all">
                                    <ArrowPathIcon className={`w-4 h-4 ${isLoadingTx ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-12 text-center">
                                    <ClockIcon className="w-12 h-12 text-indigo-500/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">No Transactions</h3>
                                    <p className="text-sm text-slate-500">Transactions will appear here once payrolls are deployed.</p>
                                </div>
                            ) : (
                                <div className="bg-[#141924] border border-white/[0.06] rounded-2xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Status</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Recipient</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Address</th>
                                                <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Amount</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Token</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Note</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => (
                                                <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-3.5 px-5">
                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                            tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400'
                                                            : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-slate-500/10 text-slate-400'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                tx.status === 'COMPLETED' ? 'bg-emerald-400' : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                                                            }`}></span>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5 font-medium text-white">{tx.recipientName || '-'}</td>
                                                    <td className="py-3.5 px-5 font-mono text-xs text-slate-400">{tx.recipientAddress ? `${tx.recipientAddress.slice(0, 8)}...${tx.recipientAddress.slice(-6)}` : '-'}</td>
                                                    <td className="py-3.5 px-5 text-right font-mono font-bold text-white tabular-nums">{parseFloat(tx.amount).toFixed(2)}</td>
                                                    <td className="py-3.5 px-5 text-xs text-slate-400">{tx.token}</td>
                                                    <td className="py-3.5 px-5 text-xs text-slate-500 truncate max-w-[200px]">{tx.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── SYSTEM HEALTH ─── */}
                    {activeSection === 'system' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                <SystemCard title="Tempo Network" status="online" detail="Block latency: ~2.1s" icon={<CubeTransparentIcon className="w-5 h-5" />} />
                                <SystemCard title="AI Parsing Engine" status="online" detail="GPT-4o-mini · Avg 1.2s response" icon={<CpuChipIcon className="w-5 h-5" />} />
                                <SystemCard title="Condition Monitor" status={watchingRules > 0 ? 'online' : 'idle'} detail={`${watchingRules} rules actively watched`} icon={<BoltIcon className="w-5 h-5" />} />
                                <SystemCard title="Boardroom Queue" status={pendingTx > 0 ? 'online' : 'idle'} detail={`${pendingTx} payloads pending`} icon={<DocumentTextIcon className="w-5 h-5" />} />
                                <SystemCard title="Escrow Vault" status={escrowCount > 0 ? 'active' : 'idle'} detail={`${escrowCount} active escrows`} icon={<ScaleIcon className="w-5 h-5" />} />
                                <SystemCard title="ZK Privacy Shield" status="standby" detail="Ready for shielded execution" icon={<ShieldCheckIcon className="w-5 h-5" />} />
                            </div>

                            {/* API Endpoints */}
                            <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                                    <ServerStackIcon className="w-4 h-4 text-indigo-400" />
                                    API Endpoints
                                </h3>
                                <div className="space-y-2 font-mono text-xs">
                                    {[
                                        { method: 'POST', path: '/api/ai-parse', desc: 'Natural language → PayPol intents' },
                                        { method: 'POST', path: '/api/invoice-parse', desc: 'Invoice → Payment extraction' },
                                        { method: 'GET', path: '/api/employees', desc: 'Boardroom transaction queue' },
                                        { method: 'POST', path: '/api/employees', desc: 'Submit payroll to Boardroom' },
                                        { method: 'CRUD', path: '/api/conditional-payroll', desc: 'Conditional rules management' },
                                        { method: 'CRUD', path: '/api/escrow', desc: 'Escrow & arbitration' },
                                        { method: 'CRUD', path: '/api/autopilot', desc: 'Recurring payroll automation' },
                                        { method: 'GET', path: '/api/marketplace/agents', desc: 'A2A Agent discovery' },
                                        { method: 'POST', path: '/api/workspace', desc: 'Workspace management' },
                                    ].map((ep, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400'
                                                : ep.method === 'POST' ? 'bg-blue-500/10 text-blue-400'
                                                : 'bg-fuchsia-500/10 text-fuchsia-400'
                                            }`}>
                                                {ep.method}
                                            </span>
                                            <span className="text-slate-300 min-w-[250px]">{ep.path}</span>
                                            <span className="text-slate-600 text-[11px]">{ep.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// ──────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, accent }: {
    title: string; value: string; subtitle: string; icon: React.ReactNode;
    accent: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
    const colors = {
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.08)]' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]' },
        rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'shadow-[0_0_20px_rgba(225,29,72,0.08)]' },
    };
    const c = colors[accent];
    return (
        <div className={`bg-[#141924] border border-white/[0.06] rounded-2xl p-5 ${c.glow} hover:border-white/[0.1] transition-all`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
                <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text}`}>
                    {icon}
                </div>
            </div>
            <p className="text-2xl font-black text-white mb-1 tabular-nums">{value}</p>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
    );
}

function SystemCard({ title, status, detail, icon }: {
    title: string; status: 'online' | 'active' | 'idle' | 'standby' | 'error';
    detail: string; icon: React.ReactNode;
}) {
    const statusConfig = {
        online: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400 animate-pulse', label: 'ONLINE' },
        active: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400 animate-pulse', label: 'ACTIVE' },
        idle: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500', label: 'IDLE' },
        standby: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', dot: 'bg-indigo-400', label: 'STANDBY' },
        error: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400 animate-pulse', label: 'ERROR' },
    };
    const s = statusConfig[status];
    return (
        <div className={`bg-[#141924] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center ${s.color}`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-white">{title}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest ${s.bg} ${s.color} border ${s.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                    {s.label}
                </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">{detail}</p>
        </div>
    );
}
