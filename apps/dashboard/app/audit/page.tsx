"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Terminal, CheckCircle2, Search, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/history");
        const json = await res.json();
        if (json.success) {
          setLogs(json.data);
          setError(false);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    log.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.txHash?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-300 font-mono p-4 sm:p-6 lg:p-8 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit Ledger</h1>
              <p className="text-xs text-slate-500">Immutable ZK-Rollup Payout Records</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search address or txHash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all text-slate-200 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="pp-card overflow-hidden">
          <div className="overflow-x-auto cyber-scroll-x">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5">Status</th>
                  <th className="px-4 sm:px-6 py-3.5">Timestamp</th>
                  <th className="px-4 sm:px-6 py-3.5">Recipient</th>
                  <th className="px-4 sm:px-6 py-3.5">Amount</th>
                  <th className="px-4 sm:px-6 py-3.5">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 sm:px-6 py-4"><div className="pp-skeleton h-5 w-16 rounded" /></td>
                      <td className="px-4 sm:px-6 py-4"><div className="pp-skeleton h-4 w-32 rounded" /></td>
                      <td className="px-4 sm:px-6 py-4"><div className="pp-skeleton h-4 w-28 rounded" /></td>
                      <td className="px-4 sm:px-6 py-4"><div className="pp-skeleton h-4 w-20 rounded" /></td>
                      <td className="px-4 sm:px-6 py-4"><div className="pp-skeleton h-4 w-36 rounded" /></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-rose-400">
                      Failed to load audit data. Please try again.
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      {searchTerm ? 'No matching records found.' : 'No audit records yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-lg border border-emerald-400/20 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Settled
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-slate-400 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className="font-medium text-slate-300">
                          {log.recipient.slice(0, 6)}...{log.recipient.slice(-4)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <span className="text-indigo-400 font-bold">{log.amount} aUSD</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <a
                          href={`https://explore.tempo.xyz/tx/${log.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-400 transition-colors"
                        >
                          {log.txHash.slice(0, 10)}...{log.txHash.slice(-8)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 justify-end">
          <ShieldAlert className="w-3.5 h-3.5" />
          Data cryptographically synced with Prisma
        </div>
      </div>
    </div>
  );
}
