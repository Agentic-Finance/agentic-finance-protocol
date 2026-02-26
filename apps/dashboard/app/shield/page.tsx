"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, Activity, ShieldCheck, Cpu,
  BrainCircuit, Globe, Zap, Users, Factory,
  ShoppingCart, HeartPulse, Coins, Briefcase
} from "lucide-react";
import Link from "next/link";
import SubPageNav from "../components/SubPageNav";

export default function ShieldPage() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState(false);

  const useCases = [
    { title: "Autonomous Freelancers", desc: "OpenClaw agents verify GitHub commits & trigger payouts.", icon: <BrainCircuit className="w-5 h-5" /> },
    { title: "Shielded Payroll", desc: "Pay 10,000+ staff without exposing individual salaries.", icon: <ShieldCheck className="w-5 h-5" /> },
    { title: "DAO Performance Grants", desc: "Funds released only when AI verifies specific KPIs.", icon: <Users className="w-5 h-5" /> },
    { title: "Supply Chain Settlement", desc: "IoT sensors trigger private vendor payments on arrival.", icon: <Factory className="w-5 h-5" /> },
    { title: "Private Bug Bounties", desc: "Rewards for whitehats via ZK-proofs, keeping identity secret.", icon: <Zap className="w-5 h-5" /> },
    { title: "A2A Micropayments", desc: "High-frequency API settlements between AI models.", icon: <Coins className="w-5 h-5" /> },
    { title: "Shielded Royalties", desc: "Automatic ad-revenue distribution to private creators.", icon: <ShoppingCart className="w-5 h-5" /> },
    { title: "Disaster Relief", desc: "AI triggers instant shielded funds based on weather data.", icon: <HeartPulse className="w-5 h-5" /> },
    { title: "Global Remittances", desc: "Move capital across borders without exposing net worth.", icon: <Globe className="w-5 h-5" /> },
    { title: "Autonomous VC", desc: "Shielded dividend payments to LPs based on private data.", icon: <Briefcase className="w-5 h-5" /> },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setStatsError(false);
        }
      } catch {
        setStatsError(true);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientAddress: recipient, amount, adminSecret }),
      });
      const data = await response.json();
      setResult(data.success ? { success: true, txHash: data.txHash } : { success: false, error: data.error });
    } catch {
      setResult({ success: false, error: "Connection to ZK-Node failed." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120]">
      <SubPageNav />
      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">SHIELD</h1>
              <p className="text-sm text-slate-400 font-medium">ZK-Privacy Layer for the Agentic Economy</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5" />
            <span>System Live</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Shielded Volume" value={stats ? `${stats.totalShieldedVolume || '0'} aUSD` : null} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} error={statsError} />
          <StatCard title="Executions" value={stats ? `${stats.totalExecutions || '0'}` : null} icon={<Cpu className="w-4 h-4 text-indigo-400" />} error={statsError} />
          <StatCard title="Integrity" value={stats ? `${stats.networkIntegrity || '100%'}` : null} icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />} error={statsError} />
          <StatCard title="Velocity" value={stats ? `${stats.active24h || '0'} tx/d` : null} icon={<Activity className="w-4 h-4 text-amber-400" />} error={statsError} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* Use Cases */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-slate-200 uppercase tracking-wide">Protocol Use Cases</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {useCases.map((uc, i) => (
                <div key={i} className="pp-card p-4 hover:bg-white/[0.02] group transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white/[0.04] rounded-lg text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-all flex-shrink-0">
                      {uc.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white mb-0.5">{uc.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{uc.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Form */}
          <div className="lg:col-span-1">
            <div className="pp-card p-6 border-indigo-500/20 bg-[#141B2D]">
              <h2 className="text-base font-bold text-white mb-5 uppercase tracking-wide">Shielded Execution</h2>
              <form onSubmit={handlePayout} className="space-y-4">
                <InputField label="Recipient Address" placeholder="0x..." value={recipient} onChange={setRecipient} />
                <InputField label="Amount (AlphaUSD)" placeholder="150" type="number" value={amount} onChange={setAmount} />
                <InputField label="Admin Secret" placeholder="********" value={adminSecret} onChange={setAdminSecret} type="password" />

                <button
                  disabled={isLoading || !recipient || !amount}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.35)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Broadcasting ZK-Proof...
                    </span>
                  ) : "Execute Shielded Payout"}
                </button>
              </form>

              {result && (
                <div className={`mt-4 p-3 rounded-xl border text-xs break-all ${
                  result.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}>
                  <strong>{result.success ? "SUCCESS" : "FAILED"}:</strong>{' '}
                  {result.success ? result.txHash : result.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ title, value, icon, error }: { title: string; value: string | null; icon: React.ReactNode; error: boolean }) {
  return (
    <div className="pp-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="p-1.5 bg-white/[0.04] rounded-lg">{icon}</div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tempo-L1</span>
      </div>
      {value === null && !error ? (
        <div className="space-y-2">
          <div className="pp-skeleton h-6 w-20 rounded" />
          <div className="pp-skeleton h-3 w-16 rounded" />
        </div>
      ) : error ? (
        <p className="text-xs text-rose-400">Failed to load</p>
      ) : (
        <>
          <h3 className="text-lg sm:text-xl font-black text-white">{value}</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{title}</p>
        </>
      )}
    </div>
  );
}

function InputField({ label, placeholder, value, onChange, type = "text" }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        required
        className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
