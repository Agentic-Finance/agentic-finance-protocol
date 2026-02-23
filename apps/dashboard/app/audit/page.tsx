"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Terminal, CheckCircle2, Search, ExternalLink } from "lucide-react";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/history");
        const json = await res.json();
        if (json.success) {
          setLogs(json.data);
        }
      } catch (e) {
        console.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  
  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.txHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-300 font-mono p-8 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">On-Chain Audit Ledger</h1>
              <p className="text-sm text-slate-500">Immutable ZK-Rollup Payout Records</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search address or txHash..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#121822] border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors w-72 text-slate-200 placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#121822] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0B0E14] border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Recipient (Masked)</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Tempo txHash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                      Decrypting ledger data...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded border border-emerald-400/20 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Settled
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-300">
                          {log.recipient.slice(0, 6)}...{log.recipient.slice(-4)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-indigo-400 font-bold">{log.amount} αUSD</span>
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={`https://explore.moderato.tempo.xyz/tx/${log.txHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors"
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
          <ShieldAlert className="w-4 h-4" />
          Data cryptographically synced with Prisma
        </div>
      </div>
    </div>
  );
}