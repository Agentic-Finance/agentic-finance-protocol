'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    ClipboardDocumentIcon,
    BanknotesIcon,
    ChartBarIcon,
    FireIcon,
    InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface RevenueData {
    tvl: { total: number; byContract: Record<string, number>; byToken: Record<string, number> };
    fees: { today: number; week: number; month: number; allTime: number };
    volume: { today: number; week: number; month: number };
    topAgents: { name: string; emoji: string; revenue: number; jobs: number }[];
    recentSettlements: { agent: string; emoji: string; amount: number; fee: number; txHash: string; timestamp: string; status: string }[];
    summary: { activeStreams: number; totalJobs: number };
}

interface StatsData {
    totalShieldedVolume: number;
    totalExecutions: number;
    averageAgentPayout: number;
    active24h: number;
    networkIntegrity: number;
}

interface AuditEvent {
    id: string;
    timestamp: string;
    severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category: string;
    message: string;
    actor?: string;
    metadata?: Record<string, any>;
}

interface ChartPoint {
    label: string;
    volume: number;
    fees: number;
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

function fmtUsd(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [txFilter, setTxFilter] = useState<string>('all');
    const [txSearch, setTxSearch] = useState('');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [agentStats, setAgentStats] = useState<{ total: number; totalJobs: number }>({ total: 0, totalJobs: 0 });

    // NEW: Revenue, Stats, Audit, Chart data
    const [revenue, setRevenue] = useState<RevenueData | null>(null);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
    const [auditSeverityCounts, setAuditSeverityCounts] = useState<Record<string, number>>({});
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');
    const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; ruleId: string; ruleName: string } | null>(null);

    const [healthChecks, setHealthChecks] = useState<{
        tempo: { status: 'online' | 'error'; latency: number; blockNumber: string };
        aiEngine: { status: 'online' | 'error'; latency: number };
        daemon: { status: 'online' | 'error' | 'idle'; detail: string };
        lastChecked: Date | null;
    }>({
        tempo: { status: 'online', latency: 0, blockNumber: '—' },
        aiEngine: { status: 'online', latency: 0 },
        daemon: { status: 'idle', detail: 'Checking...' },
        lastChecked: null,
    });

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
            if (data.success) {
                const all = [...(data.pending || []), ...(data.vaulted || [])];
                const seen = new Set<string>();
                const unique = all.filter((item: any) => {
                    if (seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                });
                const mapped: Transaction[] = unique.map((item: any) => ({
                    id: item.id,
                    recipientName: item.name || 'Unknown',
                    recipientAddress: item.wallet_address || '',
                    amount: String(item.amount || 0),
                    token: item.token || 'AlphaUSD',
                    status: item.status || 'Draft',
                    note: item.note || '',
                    createdAt: item.createdAt || new Date().toISOString(),
                }));
                setTransactions(mapped);
            }
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

    const fetchAgentStats = useCallback(async () => {
        try {
            const res = await fetch('/api/marketplace/agents');
            const data = await res.json();
            if (data.agents) {
                setAgentStats({
                    total: data.agents.length,
                    totalJobs: data.agents.reduce((s: number, a: any) => s + (a.totalJobs || 0), 0),
                });
            }
        } catch { /* silent */ }
    }, []);

    // NEW: Revenue fetcher
    const fetchRevenue = useCallback(async () => {
        try {
            const res = await fetch('/api/revenue');
            const data = await res.json();
            if (data.tvl) setRevenue(data);
        } catch { /* silent */ }
    }, []);

    // NEW: Stats fetcher
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            if (data.totalExecutions !== undefined) setStats(data);
        } catch { /* silent */ }
    }, []);

    // NEW: Audit timeline fetcher
    const fetchAudit = useCallback(async () => {
        try {
            const res = await fetch('/api/audit/timeline?limit=10');
            const data = await res.json();
            if (data.events) {
                setAuditEvents(data.events);
                setAuditSeverityCounts(data.severityCounts || {});
            }
        } catch { /* silent */ }
    }, []);

    // NEW: Revenue chart fetcher
    const fetchRevenueChart = useCallback(async (period: string) => {
        try {
            const res = await fetch(`/api/revenue/chart?period=${period}`);
            const data = await res.json();
            if (data.labels) {
                const points: ChartPoint[] = data.labels.map((label: string, i: number) => ({
                    label,
                    volume: data.volume?.[i] || 0,
                    fees: data.fees?.[i] || 0,
                }));
                setChartData(points);
            }
        } catch { /* silent */ }
    }, []);

    const runHealthChecks = useCallback(async () => {
        // 1. Tempo RPC health — fetch latest block number + latency
        const tempoStart = performance.now();
        try {
            const res = await fetch('https://rpc.moderato.tempo.xyz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
            });
            const data = await res.json();
            const latency = Math.round(performance.now() - tempoStart);
            const blockNum = parseInt(data.result, 16);
            setHealthChecks(prev => ({
                ...prev,
                tempo: { status: 'online', latency, blockNumber: blockNum.toLocaleString() },
                lastChecked: new Date(),
            }));
        } catch {
            setHealthChecks(prev => ({
                ...prev,
                tempo: { status: 'error', latency: 0, blockNumber: '—' },
                lastChecked: new Date(),
            }));
        }

        // 2. AI Engine health — ping the parse endpoint
        const aiStart = performance.now();
        try {
            const res = await fetch('/api/ai-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'health check', dryRun: true }),
            });
            const latency = Math.round(performance.now() - aiStart);
            setHealthChecks(prev => ({
                ...prev,
                aiEngine: { status: res.ok ? 'online' : 'error', latency },
            }));
        } catch {
            setHealthChecks(prev => ({
                ...prev,
                aiEngine: { status: 'error', latency: 0 },
            }));
        }

        // 3. Daemon health — check conditional rules last triggered time
        try {
            const res = await fetch('/api/conditional-payroll');
            const data = await res.json();
            const activeRules = (data.rules || []).filter((r: any) => r.status === 'Watching');
            const lastTriggered = (data.rules || [])
                .filter((r: any) => r.triggeredAt)
                .sort((a: any, b: any) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())[0];
            const detail = activeRules.length > 0
                ? `${activeRules.length} rules monitored · 60s cycle`
                : 'No active rules';
            setHealthChecks(prev => ({
                ...prev,
                daemon: {
                    status: activeRules.length > 0 ? 'online' : 'idle',
                    detail: lastTriggered ? `${detail} · Last trigger: ${timeAgo(lastTriggered.triggeredAt)}` : detail,
                },
            }));
        } catch {
            setHealthChecks(prev => ({
                ...prev,
                daemon: { status: 'error', detail: 'Cannot reach daemon' },
            }));
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([
            fetchRules(), fetchTransactions(), fetchEscrows(), fetchWorkspaces(),
            fetchAgentStats(), fetchRevenue(), fetchStats(), fetchAudit(),
        ]);
        setLastUpdated(new Date());
        setIsRefreshing(false);
        setInitialLoading(false);
    }, [fetchRules, fetchTransactions, fetchEscrows, fetchWorkspaces, fetchAgentStats, fetchRevenue, fetchStats, fetchAudit]);

    useEffect(() => {
        refreshAll();
        runHealthChecks();
        fetchRevenueChart(chartPeriod);
        const interval = setInterval(() => { if (!document.hidden) refreshAll(); }, 15000);
        const healthInterval = setInterval(() => { if (!document.hidden) runHealthChecks(); }, 60000);
        return () => { clearInterval(interval); clearInterval(healthInterval); };
    }, [refreshAll, runHealthChecks, fetchRevenueChart, chartPeriod]);

    // Chart period change handler
    const handleChartPeriod = (p: '7d' | '30d' | '90d') => {
        setChartPeriod(p);
        fetchRevenueChart(p);
    };

    // Copy to clipboard
    const handleCopy = (addr: string) => {
        navigator.clipboard.writeText(addr);
        setCopiedAddr(addr);
        setTimeout(() => setCopiedAddr(null), 2000);
    };

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
        setConfirmDialog(null);
        fetchRules();
    };

    // ── Computed stats ──
    const watchingRules = rules.filter(r => r.status === 'Watching').length;
    const triggeredRules = rules.filter(r => r.status === 'Triggered').length;
    const totalTxValue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const pendingTx = transactions.filter(t => t.status === 'Draft' || t.status === 'PENDING').length;
    const completedTx = transactions.filter(t => t.status === 'COMPLETED').length;

    // Alert: any ERROR/CRITICAL audit events?
    const criticalAlerts = useMemo(() =>
        auditEvents.filter(e => e.severity === 'ERROR' || e.severity === 'CRITICAL'),
    [auditEvents]);

    // ── Current date ──
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Filtered transactions
    const filteredTransactions = transactions.filter(tx => {
        const matchesFilter = txFilter === 'all' || tx.status === txFilter;
        const matchesSearch = !txSearch || tx.recipientName?.toLowerCase().includes(txSearch.toLowerCase())
            || tx.recipientAddress?.toLowerCase().includes(txSearch.toLowerCase())
            || tx.note?.toLowerCase().includes(txSearch.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#111B2E] text-slate-200 font-sans flex">
            {/* Mobile sidebar overlay */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-[55] md:hidden" onClick={() => setMobileSidebarOpen(false)} />
            )}

            {/* ════════ CONFIRMATION DIALOG ════════ */}
            {confirmDialog?.open && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#141924] border border-white/[0.08] rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
                            <ExclamationTriangleIcon className="w-7 h-7 text-rose-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">Delete Rule?</h3>
                        <p className="text-sm text-slate-400 text-center mb-6">
                            Are you sure you want to delete <span className="text-white font-semibold">{confirmDialog.ruleName}</span>? This action cannot be undone.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-slate-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRuleAction(confirmDialog.ruleId, 'delete')}
                                className="flex-1 px-5 py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl text-sm font-bold text-rose-400 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* SIDEBAR                                      */}
            {/* ════════════════════════════════════════════ */}
            <aside className={`fixed top-0 left-0 h-screen bg-[#141924] border-r border-white/[0.06] z-[60] flex flex-col transition-all duration-300
                ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
                ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
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
                                onClick={() => { setActiveSection(item.id); setMobileSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative ${
                                    sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3'
                                } ${
                                    isActive
                                        ? 'bg-gradient-to-r from-indigo-500/[0.08] to-fuchsia-500/[0.04] text-white shadow-[inset_0_0_0_1px_rgba(129,140,248,0.12),0_0_20px_rgba(99,102,241,0.06)]'
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
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'}`}>
                {/* Top Bar */}
                <header className="h-20 border-b border-white/[0.06] bg-[#111B2E]/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                                {activeSection === 'overview' && 'Command Center'}
                                {activeSection === 'conditional' && 'Conditional Rules'}
                                {activeSection === 'arbitration' && 'Arbitration Node'}
                                {activeSection === 'transactions' && 'Transaction Ledger'}
                                {activeSection === 'system' && 'System Health'}
                            </h1>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {dateStr}
                                {lastUpdated && <span className="ml-2 text-slate-600">· Updated {timeAgo(lastUpdated.toISOString())}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                            healthChecks.tempo.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${healthChecks.tempo.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            {healthChecks.tempo.status === 'online' ? `Tempo · ${healthChecks.tempo.latency}ms` : 'Tempo Offline'}
                        </span>
                        <button onClick={refreshAll} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white" title="Refresh all data">
                            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-4 md:p-8">
                    {/* ─── OVERVIEW ─── */}
                    {activeSection === 'overview' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            {/* Alert Banner */}
                            {criticalAlerts.length > 0 && (
                                <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-rose-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-rose-300">
                                            {criticalAlerts.length} Alert{criticalAlerts.length !== 1 ? 's' : ''} Detected
                                        </p>
                                        <p className="text-xs text-rose-400/70 truncate">{criticalAlerts[0]?.message}</p>
                                    </div>
                                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse shrink-0"></span>
                                </div>
                            )}

                            {/* ── Loading Skeleton ── */}
                            {initialLoading ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className="bg-[#141924] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="h-3 w-20 bg-slate-700/50 rounded"></div>
                                                    <div className="w-9 h-9 bg-slate-700/30 rounded-xl"></div>
                                                </div>
                                                <div className="h-7 w-28 bg-slate-700/50 rounded mb-2"></div>
                                                <div className="h-3 w-36 bg-slate-700/30 rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6 animate-pulse">
                                        <div className="h-4 w-32 bg-slate-700/50 rounded mb-6"></div>
                                        <div className="h-[260px] bg-slate-700/20 rounded-xl"></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* ── Premium KPI Cards ── */}
                                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                                        <KpiCard
                                            title="Total Value Locked"
                                            value={revenue ? fmtUsd(revenue.tvl.total) : '$—'}
                                            subtitle="Across all vaults"
                                            icon={<BanknotesIcon className="w-5 h-5" />}
                                            color="indigo"
                                        />
                                        <KpiCard
                                            title="Volume (Month)"
                                            value={revenue ? fmtUsd(revenue.volume.month) : '$—'}
                                            subtitle={revenue ? `Today: ${fmtUsd(revenue.volume.today)}` : 'Loading...'}
                                            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
                                            color="fuchsia"
                                        />
                                        <KpiCard
                                            title="Fees Earned"
                                            value={revenue ? fmtUsd(revenue.fees.month) : '$—'}
                                            subtitle={revenue ? `All-time: ${fmtUsd(revenue.fees.allTime)}` : 'Loading...'}
                                            icon={<ChartBarIcon className="w-5 h-5" />}
                                            color="emerald"
                                        />
                                        <KpiCard
                                            title="Active (24h)"
                                            value={stats ? String(stats.active24h) : '—'}
                                            subtitle="Unique wallets"
                                            icon={<UsersIcon className="w-5 h-5" />}
                                            color="amber"
                                            pulse
                                        />
                                        <KpiCard
                                            title="Network Integrity"
                                            value={stats ? `${stats.networkIntegrity}%` : '—'}
                                            subtitle="ZK proof validation rate"
                                            icon={<ShieldCheckIcon className="w-5 h-5" />}
                                            color="cyan"
                                            fillBar={stats?.networkIntegrity}
                                        />
                                        <KpiCard
                                            title="Total Jobs"
                                            value={revenue ? String(revenue.summary.totalJobs) : String(agentStats.totalJobs)}
                                            subtitle={`${agentStats.total} agents · ${revenue?.summary.activeStreams || 0} streams`}
                                            icon={<CpuChipIcon className="w-5 h-5" />}
                                            color="purple"
                                        />
                                    </div>

                                    {/* ── Secondary KPI Row (operational) ── */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <MiniKpiCard label="Conditional Rules" value={String(rules.length)} detail={`${watchingRules} watching`} color="amber" />
                                        <MiniKpiCard label="Active Escrows" value={String(escrowCount)} detail="Pending arbitration" color="rose" />
                                        <MiniKpiCard label="Transactions" value={String(transactions.length)} detail={`${pendingTx} pending`} color="indigo" />
                                    </div>

                                    {/* ── Revenue Chart ── */}
                                    <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <ChartBarIcon className="w-4 h-4 text-fuchsia-400" />
                                                Revenue Overview
                                            </h3>
                                            <div className="flex items-center gap-1 bg-[#111B2E] border border-white/[0.06] rounded-lg p-0.5">
                                                {(['7d', '30d', '90d'] as const).map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handleChartPeriod(p)}
                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                            chartPeriod === p
                                                                ? 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/25'
                                                                : 'text-slate-500 hover:text-white'
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {chartData.length === 0 ? (
                                            <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm font-mono">
                                                No chart data available
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={260}>
                                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id="gVolume" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} />
                                                            <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="gFees" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                                                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#141924', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px' }}
                                                        labelStyle={{ color: '#94a3b8' }}
                                                        formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'volume' ? 'Volume' : 'Fees']}
                                                    />
                                                    <Area type="monotone" dataKey="volume" stroke="#d946ef" fill="url(#gVolume)" strokeWidth={2} />
                                                    <Area type="monotone" dataKey="fees" stroke="#818cf8" fill="url(#gFees)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.04]">
                                            <span className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <span className="w-3 h-0.5 bg-fuchsia-400 rounded"></span>
                                                Volume
                                            </span>
                                            <span className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <span className="w-3 h-0.5 bg-indigo-400 rounded"></span>
                                                Fees
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Settlements + Top Agents ── */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                        {/* Recent Settlements */}
                                        <div className="lg:col-span-2 bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                            <div className="flex items-center justify-between mb-5">
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                    <BanknotesIcon className="w-4 h-4 text-emerald-400" />
                                                    Recent Settlements
                                                </h3>
                                                <button onClick={() => setActiveSection('transactions')} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider transition-colors">
                                                    View All →
                                                </button>
                                            </div>
                                            {(!revenue || revenue.recentSettlements.length === 0) ? (
                                                <EmptyState icon={<BanknotesIcon className="w-10 h-10" />} title="No Settlements" description="Settlements will appear here after on-chain execution." />
                                            ) : (
                                                <div className="space-y-2">
                                                    {revenue.recentSettlements.slice(0, 6).map((s, idx) => (
                                                        <div key={idx} className={`flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors border-l-2 ${
                                                            s.status === 'completed' ? 'border-l-emerald-500' : s.status === 'pending' ? 'border-l-amber-500' : 'border-l-slate-600'
                                                        }`}>
                                                            <span className="text-lg shrink-0">{s.emoji || '🤖'}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{s.agent}</p>
                                                                <p className="text-[10px] text-slate-500 font-mono truncate">
                                                                    {s.txHash ? `${s.txHash.slice(0, 10)}...${s.txHash.slice(-6)}` : 'pending'}
                                                                    {s.timestamp && ` · ${timeAgo(s.timestamp)}`}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-sm font-bold text-white tabular-nums">{fmtUsd(s.amount)}</p>
                                                                <p className="text-[10px] text-emerald-400/70">fee: {fmtUsd(s.fee)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Top Agents Leaderboard */}
                                        <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                                                <FireIcon className="w-4 h-4 text-amber-400" />
                                                Top Agents
                                            </h3>
                                            {(!revenue || revenue.topAgents.length === 0) ? (
                                                <EmptyState icon={<CpuChipIcon className="w-10 h-10" />} title="No Agents" description="Agent rankings will appear here." />
                                            ) : (
                                                <div className="space-y-3">
                                                    {revenue.topAgents.slice(0, 5).map((agent, idx) => {
                                                        const maxRevenue = revenue.topAgents[0]?.revenue || 1;
                                                        const pct = Math.round((agent.revenue / maxRevenue) * 100);
                                                        return (
                                                            <div key={idx} className="group">
                                                                <div className="flex items-center gap-3 mb-1.5">
                                                                    <span className="text-sm w-5 text-center font-bold text-slate-600">#{idx + 1}</span>
                                                                    <span className="text-base">{agent.emoji || '🤖'}</span>
                                                                    <span className="text-xs font-medium text-white flex-1 truncate">{agent.name}</span>
                                                                    <span className="text-xs font-bold text-fuchsia-400 tabular-nums">{fmtUsd(agent.revenue)}</span>
                                                                </div>
                                                                <div className="ml-[52px] h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full transition-all duration-700"
                                                                        style={{ width: `${pct}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Audit Trail ── */}
                                    <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <DocumentTextIcon className="w-4 h-4 text-indigo-400" />
                                                Audit Trail
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {Object.entries(auditSeverityCounts).map(([sev, count]) => (
                                                    count > 0 && (
                                                        <span key={sev} className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                                            sev === 'ERROR' || sev === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400'
                                                            : sev === 'WARNING' ? 'bg-amber-500/10 text-amber-400'
                                                            : sev === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                            {sev}: {count}
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                        {auditEvents.length === 0 ? (
                                            <EmptyState icon={<DocumentTextIcon className="w-10 h-10" />} title="No Audit Events" description="System events will be logged here." />
                                        ) : (
                                            <div className="space-y-2">
                                                {auditEvents.map((event, idx) => (
                                                    <div key={event.id || idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                                                        <SeverityBadge severity={event.severity} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-white font-medium">{event.message}</p>
                                                            <p className="text-[10px] text-slate-600 mt-0.5">
                                                                {event.category}
                                                                {event.actor && ` · ${event.actor}`}
                                                                {event.timestamp && ` · ${timeAgo(event.timestamp)}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Workspace Info */}
                                    <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                                            <UsersIcon className="w-4 h-4 text-fuchsia-400" />
                                            Registered Workspaces
                                        </h3>
                                        {workspaces.length === 0 ? (
                                            <EmptyState icon={<UsersIcon className="w-10 h-10" />} title="No Workspaces" description="No workspaces found." />
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
                                </>
                            )}
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
                                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                                        Create If-This-Then-Pay automation rules from the Cortex terminal.
                                        The daemon checks conditions every 60 seconds.
                                    </p>
                                    <a href="/cortex" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-sm font-bold transition-all">
                                        <BoltIcon className="w-4 h-4" /> Create Rule in Cortex
                                    </a>
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
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111B2E] border border-white/[0.08] rounded-lg text-xs text-slate-300 font-mono">
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
                                                <button
                                                    onClick={() => setConfirmDialog({ open: true, ruleId: rule.id, ruleName: rule.name })}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400/70 hover:text-rose-400 rounded-lg text-xs font-bold transition-all ml-auto"
                                                >
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

                            {/* Search & Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <EyeIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, address, or note..."
                                        value={txSearch}
                                        onChange={e => setTxSearch(e.target.value)}
                                        className="w-full bg-[#141924] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-colors"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 bg-[#141924] border border-white/[0.08] rounded-xl p-1">
                                    {['all', 'Draft', 'PENDING', 'PROCESSING', 'COMPLETED'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setTxFilter(f)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                txFilter === f ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-white'
                                            }`}
                                        >
                                            {f === 'all' ? 'All' : f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {filteredTransactions.length === 0 ? (
                                <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-12 text-center">
                                    <ClockIcon className="w-12 h-12 text-indigo-500/30 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-white mb-2">{transactions.length === 0 ? 'No Transactions' : 'No Matching Transactions'}</h3>
                                    <p className="text-sm text-slate-500 mb-6">
                                        {transactions.length === 0
                                            ? 'Submit payrolls from the Cortex terminal to see them here.'
                                            : 'Try adjusting your search or filter.'}
                                    </p>
                                    {transactions.length === 0 && (
                                        <a href="/cortex" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-bold transition-all">
                                            <DocumentTextIcon className="w-4 h-4" /> Go to Cortex
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-[#141924] border border-white/[0.06] rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Status</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Recipient</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5 hidden md:table-cell">Address</th>
                                                <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Amount</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5">Token</th>
                                                <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 px-5 hidden lg:table-cell">Note</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTransactions.map(tx => (
                                                <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-3.5 px-5">
                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                                            tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400'
                                                            : tx.status === 'FAILED' ? 'bg-red-500/10 text-red-400'
                                                            : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-slate-500/10 text-slate-400'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                tx.status === 'COMPLETED' ? 'bg-emerald-400' : tx.status === 'FAILED' ? 'bg-red-400' : tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                                                            }`}></span>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5 font-medium text-white">{tx.recipientName || '-'}</td>
                                                    <td className="py-3.5 px-5 font-mono text-xs text-slate-400 hidden md:table-cell">{tx.recipientAddress ? `${tx.recipientAddress.slice(0, 8)}...${tx.recipientAddress.slice(-6)}` : '-'}</td>
                                                    <td className="py-3.5 px-5 text-right font-mono font-bold text-white tabular-nums">{parseFloat(tx.amount).toFixed(2)}</td>
                                                    <td className="py-3.5 px-5 text-xs text-slate-400">{tx.token}</td>
                                                    <td className="py-3.5 px-5 text-xs text-slate-500 truncate max-w-[200px] hidden lg:table-cell">{tx.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                    {/* Table footer with count */}
                                    <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            Showing {filteredTransactions.length} of {transactions.length} transactions
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            Total: ${filteredTransactions.reduce((s, t) => s + parseFloat(t.amount || '0'), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── SYSTEM HEALTH ─── */}
                    {activeSection === 'system' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            {/* Health Check Header */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500">
                                    Live system health checks.
                                    {healthChecks.lastChecked && <span className="ml-1">Last checked {timeAgo(healthChecks.lastChecked.toISOString())}.</span>}
                                </p>
                                <button onClick={runHealthChecks} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all">
                                    <ArrowPathIcon className="w-4 h-4" />
                                    Re-check
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                <SystemCard
                                    title="Tempo Network"
                                    status={healthChecks.tempo.status}
                                    detail={healthChecks.tempo.status === 'online'
                                        ? `Block #${healthChecks.tempo.blockNumber} · ${healthChecks.tempo.latency}ms latency`
                                        : 'Cannot reach Tempo RPC'}
                                    icon={<CubeTransparentIcon className="w-5 h-5" />}
                                    latencyMs={healthChecks.tempo.latency}
                                    maxLatency={500}
                                />
                                <SystemCard
                                    title="AI Parsing Engine"
                                    status={healthChecks.aiEngine.status}
                                    detail={healthChecks.aiEngine.status === 'online'
                                        ? `GPT-4o-mini · ${healthChecks.aiEngine.latency}ms response`
                                        : 'AI endpoint unreachable'}
                                    icon={<CpuChipIcon className="w-5 h-5" />}
                                    latencyMs={healthChecks.aiEngine.latency}
                                    maxLatency={2000}
                                />
                                <SystemCard
                                    title="Condition Monitor"
                                    status={healthChecks.daemon.status}
                                    detail={healthChecks.daemon.detail}
                                    icon={<BoltIcon className="w-5 h-5" />}
                                />
                                <SystemCard title="Boardroom Queue" status={pendingTx > 0 ? 'online' : 'idle'} detail={`${pendingTx} payloads pending · ${completedTx} completed`} icon={<DocumentTextIcon className="w-5 h-5" />} />
                                <SystemCard title="Escrow Vault" status={escrowCount > 0 ? 'active' : 'idle'} detail={`${escrowCount} active escrows on NexusV2`} icon={<ScaleIcon className="w-5 h-5" />} />
                                <SystemCard title="ZK Privacy Shield" status="standby" detail="PlonkVerifierV2 · Circom V2 + Poseidon" icon={<ShieldCheckIcon className="w-5 h-5" />} />
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
                                        { method: 'POST', path: '/api/marketplace/settle', desc: 'Settle agent jobs on-chain' },
                                        { method: 'GET', path: '/api/live/tvl', desc: 'Live TVL from ShieldVaultV2' },
                                        { method: 'GET', path: '/api/proof/stats', desc: 'AI proof statistics' },
                                        { method: 'POST', path: '/api/workspace', desc: 'Workspace management' },
                                        { method: 'GET', path: '/api/notifications', desc: 'User notification feed' },
                                        { method: 'GET', path: '/api/revenue', desc: 'Revenue analytics & TVL' },
                                        { method: 'GET', path: '/api/revenue/chart', desc: 'Revenue time-series chart data' },
                                        { method: 'GET', path: '/api/audit/timeline', desc: 'Audit event timeline' },
                                        { method: 'GET', path: '/api/stats', desc: 'Platform statistics' },
                                        { method: 'GET', path: '/api/health', desc: 'System health check' },
                                    ].map((ep, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${
                                                ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400'
                                                : ep.method === 'POST' ? 'bg-blue-500/10 text-blue-400'
                                                : 'bg-fuchsia-500/10 text-fuchsia-400'
                                            }`}>
                                                {ep.method}
                                            </span>
                                            <span className="text-slate-300 sm:min-w-[250px]">{ep.path}</span>
                                            <span className="text-slate-600 text-[11px]">{ep.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Smart Contract Addresses */}
                            <div className="bg-[#141924] border border-white/[0.06] rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                                    <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
                                    Deployed Contracts (Tempo L1 · Chain 42431)
                                </h3>
                                <div className="space-y-2 font-mono text-xs">
                                    {[
                                        { name: 'NexusV2', addr: '0x6A467Cd4156093bB528e448C04366586a1052Fab' },
                                        { name: 'ShieldVaultV2', addr: '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055' },
                                        { name: 'PlonkVerifierV2', addr: '0x9FB90e9FbdB80B7ED715D98D9dd8d9786805450B' },
                                        { name: 'AIProofRegistry', addr: '0x8fDB8E871c9eaF2955009566F41490Bbb128a014' },
                                        { name: 'StreamV1', addr: '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C' },
                                        { name: 'MultisendV2', addr: '0x25f4d3f12C579002681a52821F3a6251c46D4575' },
                                    ].map((c, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
                                            <span className="text-emerald-400 font-bold sm:min-w-[160px]">{c.name}</span>
                                            <a href={`https://explore.tempo.xyz/address/${c.addr}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors truncate flex-1">
                                                {c.addr}
                                            </a>
                                            <button
                                                onClick={() => handleCopy(c.addr)}
                                                className="p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-600 hover:text-white shrink-0"
                                                title="Copy address"
                                            >
                                                {copiedAddr === c.addr ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <ClipboardDocumentIcon className="w-4 h-4" />
                                                )}
                                            </button>
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

type CardColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'fuchsia' | 'cyan' | 'purple';

const COLOR_MAP: Record<CardColor, { gradient: string; text: string; iconBg: string; iconBorder: string; glow: string; fill: string }> = {
    indigo: { gradient: 'from-indigo-500/8', text: 'text-indigo-400', iconBg: 'bg-indigo-500/10', iconBorder: 'border-indigo-500/20', glow: 'shadow-[0_0_25px_rgba(99,102,241,0.08)]', fill: 'bg-indigo-500' },
    emerald: { gradient: 'from-emerald-500/8', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/20', glow: 'shadow-[0_0_25px_rgba(16,185,129,0.08)]', fill: 'bg-emerald-500' },
    amber: { gradient: 'from-amber-500/8', text: 'text-amber-400', iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20', glow: 'shadow-[0_0_25px_rgba(245,158,11,0.08)]', fill: 'bg-amber-500' },
    rose: { gradient: 'from-rose-500/8', text: 'text-rose-400', iconBg: 'bg-rose-500/10', iconBorder: 'border-rose-500/20', glow: 'shadow-[0_0_25px_rgba(225,29,72,0.08)]', fill: 'bg-rose-500' },
    fuchsia: { gradient: 'from-fuchsia-500/8', text: 'text-fuchsia-400', iconBg: 'bg-fuchsia-500/10', iconBorder: 'border-fuchsia-500/20', glow: 'shadow-[0_0_25px_rgba(217,70,239,0.08)]', fill: 'bg-fuchsia-500' },
    cyan: { gradient: 'from-cyan-500/8', text: 'text-cyan-400', iconBg: 'bg-cyan-500/10', iconBorder: 'border-cyan-500/20', glow: 'shadow-[0_0_25px_rgba(6,182,212,0.08)]', fill: 'bg-cyan-500' },
    purple: { gradient: 'from-purple-500/8', text: 'text-purple-400', iconBg: 'bg-purple-500/10', iconBorder: 'border-purple-500/20', glow: 'shadow-[0_0_25px_rgba(168,85,247,0.08)]', fill: 'bg-purple-500' },
};

function KpiCard({ title, value, subtitle, icon, color, pulse, fillBar }: {
    title: string; value: string; subtitle: string; icon: React.ReactNode;
    color: CardColor; pulse?: boolean; fillBar?: number;
}) {
    const c = COLOR_MAP[color];
    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${c.gradient} to-transparent bg-[#141924] border border-white/[0.06] rounded-2xl p-5 ${c.glow} hover:border-white/[0.1] transition-all group`}>
            {/* Decorative icon watermark */}
            <div className={`absolute top-4 right-4 opacity-[0.07] ${c.text}`}>
                <div className="w-16 h-16">{icon}</div>
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
                    {pulse && <span className={`w-1.5 h-1.5 rounded-full ${c.fill} animate-pulse`}></span>}
                </div>
                <p className={`text-2xl font-black ${c.text} mb-1 tabular-nums`}>{value}</p>
                <p className="text-[11px] text-slate-500">{subtitle}</p>
                {fillBar !== undefined && (
                    <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div className={`h-full ${c.fill} rounded-full transition-all duration-1000`} style={{ width: `${Math.min(fillBar, 100)}%` }}></div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniKpiCard({ label, value, detail, color }: { label: string; value: string; detail: string; color: CardColor }) {
    const c = COLOR_MAP[color];
    return (
        <div className={`bg-[#141924] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-all`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-lg font-black ${c.text} tabular-nums`}>{value}</p>
            <p className="text-[10px] text-slate-600">{detail}</p>
        </div>
    );
}

function SystemCard({ title, status, detail, icon, latencyMs, maxLatency }: {
    title: string; status: 'online' | 'active' | 'idle' | 'standby' | 'error';
    detail: string; icon: React.ReactNode;
    latencyMs?: number; maxLatency?: number;
}) {
    const statusConfig = {
        online: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400 animate-pulse', label: 'ONLINE', gradient: 'from-emerald-500/8' },
        active: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400 animate-pulse', label: 'ACTIVE', gradient: 'from-amber-500/8' },
        idle: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-500', label: 'IDLE', gradient: 'from-slate-500/5' },
        standby: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', dot: 'bg-indigo-400', label: 'STANDBY', gradient: 'from-indigo-500/8' },
        error: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400 animate-pulse', label: 'ERROR', gradient: 'from-rose-500/8' },
    };
    const s = statusConfig[status];
    const latencyPct = (latencyMs && maxLatency) ? Math.min((latencyMs / maxLatency) * 100, 100) : null;
    const latencyColor = latencyMs && latencyMs < 200 ? 'bg-emerald-500' : latencyMs && latencyMs < 500 ? 'bg-amber-500' : 'bg-rose-500';

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${s.gradient} to-transparent bg-[#141924] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all`}>
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
            {latencyPct !== null && (
                <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className={`h-full ${latencyColor} rounded-full transition-all duration-500`} style={{ width: `${latencyPct}%` }}></div>
                </div>
            )}
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<string, string> = {
        INFO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        ERROR: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        CRITICAL: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    };
    return (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${config[severity] || config.INFO}`}>
            {severity}
        </span>
    );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="text-slate-700 mb-3">{icon}</div>
            <p className="text-sm font-bold text-slate-500 mb-1">{title}</p>
            <p className="text-xs text-slate-600">{description}</p>
        </div>
    );
}
