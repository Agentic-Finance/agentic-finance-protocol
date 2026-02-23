"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, Activity, ShieldCheck, Cpu, 
  BrainCircuit, Globe, Zap, Users, Factory, 
  ShoppingCart, HeartPulse, Coins, Briefcase 
} from "lucide-react";

export default function FinancialOSDashboard() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; txHash?: string; error?: string } | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Use Case Data for the Agentic Economy
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

  // Fetch performance metrics from Prisma via API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (err) {
        console.error("Failed to sync stats", err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
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
    } catch (error) {
      setResult({ success: false, error: "Connection to ZK-Node failed." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">PAYPOL OS</h1>
            <p className="text-slate-500 font-medium italic">The Financial OS for the Agentic Economy • Powered by Tempo & OpenClaw</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold ring-1 ring-indigo-200 uppercase tracking-widest animate-pulse">
            <Activity className="w-4 h-4" /> System Live
          </div>
        </div>

        {/* 1. System Performance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Shielded Volume" value={`${stats?.totalShieldedVolume || "0"} αUSD`} icon={<TrendingUp className="text-green-500" />} />
          <StatCard title="Agent Executions" value={stats?.totalExecutions || "0"} icon={<Cpu className="text-indigo-500" />} />
          <StatCard title="Network Integrity" value={stats?.networkIntegrity || "100%"} icon={<ShieldCheck className="text-blue-500" />} />
          <StatCard title="Agent Velocity" value={`${stats?.active24h || "0"} tx/day`} icon={<Activity className="text-orange-500" />} />
        </div>

        {/* Main Grid: Use Cases vs Execution Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
          
          {/* Use Cases Gallery */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">Protocol Use Cases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {useCases.map((uc, i) => (
                <div key={i} className="p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all hover:shadow-md group">
                  <div className="mb-3 p-2 bg-slate-50 w-fit rounded-lg group-hover:bg-indigo-50 transition-colors">{uc.icon}</div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{uc.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Shielded Execution Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 ring-4 ring-indigo-50/50">
              <h2 className="text-lg font-black text-slate-900 mb-6 uppercase">Shielded Execution</h2>
              <form onSubmit={handlePayout} className="space-y-4">
                <InputGroup label="Recipient Address" placeholder="0x..." value={recipient} onChange={setRecipient} />
                <InputGroup label="Amount (AlphaUSD)" placeholder="150" type="number" value={amount} onChange={setAmount} />
                <InputGroup label="Admin Secret" placeholder="********" value={adminSecret} onChange={setAdminSecret} />
                
                <button 
                  disabled={isLoading}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:bg-slate-300"
                >
                  {isLoading ? "Broadcasting ZK-Proof..." : "Execute Shielded Payout"}
                </button>
              </form>

              {result && (
                <div className={`mt-6 p-4 rounded-xl border text-[10px] break-all ${result.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <strong>{result.success ? "✓ SUCCESS" : "✗ FAILED"}:</strong> {result.success ? result.txHash : result.error}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-components for clean code
function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Tempo-L1</span>
      </div>
      <h3 className="text-xl font-black text-slate-900">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{title}</p>
    </div>
  );
}

function InputGroup({ label, placeholder, value, onChange, type = "text" }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{label}</label>
      <input
        type={type} required
        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}