"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, Activity, ShieldCheck, Cpu,
  BrainCircuit, Globe, Zap, Users, Factory,
  ShoppingCart, HeartPulse, Coins, Briefcase, Lock, ArrowRight, ExternalLink
} from "@/app/components/icons";

// ── Use Cases ───────────────────────────────────────────────

const useCases = [
  { title: "Autonomous Freelancers", desc: "OpenClaw agents verify GitHub commits & trigger payouts.", icon: <BrainCircuit className="w-4 h-4" />, color: '#818cf8' },
  { title: "Shielded Payroll", desc: "Pay 10,000+ staff without exposing individual salaries.", icon: <ShieldCheck className="w-4 h-4" />, color: '#10b981' },
  { title: "DAO Performance Grants", desc: "Funds released only when AI verifies specific KPIs.", icon: <Users className="w-4 h-4" />, color: '#f59e0b' },
  { title: "Supply Chain Settlement", desc: "IoT sensors trigger private vendor payments on arrival.", icon: <Factory className="w-4 h-4" />, color: '#3b82f6' },
  { title: "Private Bug Bounties", desc: "Rewards for whitehats via ZK-proofs, keeping identity secret.", icon: <Zap className="w-4 h-4" />, color: '#d946ef' },
  { title: "A2A Micropayments", desc: "High-frequency API settlements between AI models.", icon: <Coins className="w-4 h-4" />, color: '#06b6d4' },
  { title: "Shielded Royalties", desc: "Automatic ad-revenue distribution to private creators.", icon: <ShoppingCart className="w-4 h-4" />, color: '#f43f5e' },
  { title: "Disaster Relief", desc: "AI triggers instant shielded funds based on weather data.", icon: <HeartPulse className="w-4 h-4" />, color: '#10b981' },
  { title: "Global Remittances", desc: "Move capital across borders without exposing net worth.", icon: <Globe className="w-4 h-4" />, color: '#8b5cf6' },
  { title: "Autonomous VC", desc: "Shielded dividend payments to LPs based on private data.", icon: <Briefcase className="w-4 h-4" />, color: '#f59e0b' },
];

// ── ZK Flow Visualization ───────────────────────────────────

function ZKFlowDiagram() {
  const steps = [
    { label: 'Sender', icon: '\u{1F464}', desc: 'Initiates payment', color: '#818cf8' },
    { label: 'Poseidon Hash', icon: '\u{1F510}', desc: 'Generate commitment', color: '#d946ef' },
    { label: 'PLONK Proof', icon: '\u{1F6E1}\uFE0F', desc: 'ZK-SNARK verification', color: '#06b6d4' },
    { label: 'On-Chain', icon: '\u26D3\uFE0F', desc: 'Tempo L1 execution', color: '#10b981' },
    { label: 'Recipient', icon: '\u2705', desc: 'Funds received', color: '#10b981' },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] p-5 sm:p-6 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), transparent 60%)' }}>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-indigo-400" />
        How Shielded Payments Work
      </h3>

      {/* Desktop: horizontal flow */}
      <div className="hidden sm:flex items-start justify-between gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg border-2 mb-2 transition-all"
                style={{ borderColor: step.color, background: `${step.color}12`, boxShadow: `0 0 12px ${step.color}15` }}>
                {step.icon}
              </div>
              <p className="text-[10px] font-bold text-white leading-tight">{step.label}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-600 mx-1 shrink-0 mt-1" />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical flow */}
      <div className="flex sm:hidden flex-col gap-3">
        {steps.map((step, i) => (
          <div key={i} className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base border shrink-0"
              style={{ borderColor: `${step.color}40`, background: `${step.color}12` }}>
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white">{step.label}</p>
              <p className="text-[9px] text-slate-500">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="w-[2px] h-4 rounded-full absolute left-[18px] bottom-0 translate-y-full" style={{ background: step.color }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export default function ShieldPanel({ walletAddress }: { walletAddress?: string | null }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; txHash?: string; depositTxHash?: string; payoutTxHash?: string; error?: string; status?: string } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) { setStats(data.stats); setStatsError(false); }
        else setStatsError(true);
      } catch { setStatsError(true); }
    };
    fetchStats();
    const interval = setInterval(() => { if (!document.hidden) fetchStats(); }, 15000);
    // Re-fetch immediately when tab becomes visible again
    const handleVisibility = () => { if (!document.hidden) fetchStats(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setResult({ success: false, error: "Cancelled by user." });
  };

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    try {
      const commitRes = await fetch("/api/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress || "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793" },
        body: JSON.stringify({ action: "generate_commitment", amount, recipient }),
        signal,
      });
      const commitData = await commitRes.json();
      if (!commitData.success) {
        setResult({ success: false, error: commitData.error || "Failed to generate commitment" });
        return;
      }

      const vaultRes = await fetch("/api/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Wallet-Address": walletAddress || "0x33F7E5da060A7FEE31AB4C7a5B27F4cC3B020793" },
        body: JSON.stringify({ salary: amount, recipientWallet: recipient, shieldEnabled: true }),
        signal,
      });
      const vaultData = await vaultRes.json();
      if (!vaultData.success) {
        setResult({ success: false, error: vaultData.error || "Vault creation failed" });
        return;
      }

      const vaultId = vaultData.data?.id;
      if (!vaultId) {
        setResult({ success: true, status: "PENDING", txHash: commitData.commitment?.slice(0, 20) + "..." });
        return;
      }

      setResult({ success: true, status: "PENDING", txHash: "Waiting for daemon..." });

      for (let i = 0; i < 30; i++) {
        if (signal.aborted) return;
        await new Promise((r) => setTimeout(r, 3000));
        if (signal.aborted) return;
        try {
          const pollRes = await fetch(`/api/shield/vault?id=${vaultId}`, { signal });
          const pollData = await pollRes.json();
          if (pollData.success && pollData.vault) {
            const vault = pollData.vault;
            if (vault.status === "COMPLETED") {
              let depositTx = "", payoutTx = "";
              try { const p = JSON.parse(vault.zkProof || "{}"); depositTx = p.depositTxHash || ""; payoutTx = p.payoutTxHash || ""; } catch {}
              setResult({ success: true, status: "COMPLETED", depositTxHash: depositTx, payoutTxHash: payoutTx, txHash: payoutTx || depositTx || vault.zkCommitment?.slice(0, 20) + "..." });
              setIsLoading(false);
              return;
            }
            if (vault.status === "FAILED") {
              setResult({ success: false, error: "On-chain execution failed. Check daemon logs." });
              setIsLoading(false);
              return;
            }
            setResult({ success: true, status: vault.status, txHash: `Processing... (${vault.status})` });
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      setResult({ success: true, status: "PENDING", txHash: `Vault created (${vaultId.slice(0, 8)}...). Daemon is processing.` });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setResult({ success: false, error: "Connection to ZK-Node failed." });
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  // Stats data
  const statItems = [
    { label: 'Shielded Volume', value: stats ? `${stats.totalShieldedVolume || '0'} AlphaUSD` : null, icon: <TrendingUp className="w-4 h-4" />, color: '#10b981' },
    { label: 'Executions', value: stats ? `${stats.totalExecutions || '0'}` : null, icon: <Cpu className="w-4 h-4" />, color: '#818cf8' },
    { label: 'Integrity', value: stats ? `${stats.networkIntegrity || '100%'}` : null, icon: <ShieldCheck className="w-4 h-4" />, color: '#06b6d4' },
    { label: 'Velocity', value: stats ? `${stats.active24h || '0'} tx/d` : null, icon: <Activity className="w-4 h-4" />, color: '#f59e0b' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Stats Cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statItems.map((s) => (
          <div key={s.label} className="relative rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${s.color}08, transparent 60%)` }}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
                <div className="p-1.5 rounded-lg" style={{ color: s.color, background: `${s.color}12` }}>{s.icon}</div>
              </div>
              {s.value === null && !statsError ? (
                <div className="space-y-2">
                  <div className="pp-skeleton h-6 w-24 rounded" />
                  <div className="pp-skeleton h-3 w-16 rounded" />
                </div>
              ) : statsError ? (
                <p className="text-xs text-rose-400">Failed to load</p>
              ) : (
                <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{s.value}</p>
              )}
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1">Tempo-L1</p>
            </div>
          </div>
        ))}
      </div>

      {/* ZK Flow Diagram */}
      <ZKFlowDiagram />

      {/* Main Grid: Use Cases + Execution Form */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Use Cases */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Protocol Use Cases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {useCases.map((uc, i) => (
              <div key={i} className="group rounded-xl border border-white/[0.05] hover:border-white/[0.12] p-3.5 transition-all duration-200"
                style={{ borderLeftWidth: '3px', borderLeftColor: `${uc.color}40` }}>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg shrink-0 transition-all" style={{ color: uc.color, background: `${uc.color}12` }}>
                    {uc.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[13px] text-white mb-0.5 group-hover:text-indigo-300 transition-colors">{uc.title}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{uc.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Form */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-indigo-500/20 overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.06), var(--pp-bg-card) 70%)' }}>
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
                <Lock className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Shielded Execution</h2>
                <p className="text-[10px] text-slate-500">ZK-SNARK private payout</p>
              </div>
            </div>

            <form onSubmit={handlePayout} className="p-6 space-y-4">
              {/* Recipient */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Recipient Address</label>
                <input
                  type="text" required
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount (AlphaUSD)</label>
                <input
                  type="number" required
                  className="w-full px-3.5 py-2.5 bg-black/30 border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  placeholder="150"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Submit */}
              <button
                disabled={isLoading || !recipient || !amount}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Broadcasting ZK-Proof...
                  </span>
                ) : "Execute Shielded Payout"}
              </button>
              {isLoading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-2.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
            </form>

            {/* Result */}
            {result && (
              <div className={`mx-6 mb-6 p-4 rounded-xl border text-xs break-all ${
                result.success
                  ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/[0.06] border-rose-500/20 text-rose-300'
              }`}>
                <div className="font-bold mb-1.5 flex items-center gap-1.5">
                  {result.success ? (result.status === "COMPLETED" ? '\u2713 COMPLETED' : `\u23F3 ${result.status || "PENDING"}`) : '\u2717 FAILED'}
                </div>
                {!result.success && <p>{result.error}</p>}
                {result.success && result.status === "COMPLETED" && (
                  <div className="space-y-2 mt-2">
                    {result.depositTxHash && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 shrink-0">Deposit:</span>
                        <a href={`https://explore.moderato.tempo.xyz/tx/${result.depositTxHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 truncate">
                          {result.depositTxHash.slice(0, 14)}...{result.depositTxHash.slice(-6)}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                    {result.payoutTxHash && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 shrink-0">Payout:</span>
                        <a href={`https://explore.moderato.tempo.xyz/tx/${result.payoutTxHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 truncate">
                          {result.payoutTxHash.slice(0, 14)}...{result.payoutTxHash.slice(-6)}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                    {!result.depositTxHash && !result.payoutTxHash && <span>{result.txHash}</span>}
                  </div>
                )}
                {result.success && result.status !== "COMPLETED" && <p className="mt-1">{result.txHash}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
