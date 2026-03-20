'use client';
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  token: string;
  status: string;
  counterparty: string;
  txHash: string | null;
  date: string;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-emerald-400 bg-emerald-500/10',
  SETTLED: 'text-emerald-400 bg-emerald-500/10',
  ACTIVE: 'text-cyan-400 bg-cyan-500/10',
  PENDING: 'text-amber-400 bg-amber-500/10',
  CREATED: 'text-amber-400 bg-amber-500/10',
  EXECUTING: 'text-blue-400 bg-blue-500/10',
  FAILED: 'text-red-400 bg-red-500/10',
  DISPUTED: 'text-red-400 bg-red-500/10',
  CANCELLED: 'text-slate-400 bg-slate-500/10',
};

const TYPE_LABELS: Record<string, string> = {
  escrow: 'Escrow',
  stream: 'Stream',
  shield: 'Shield',
  payout: 'Payout',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Counterparty</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">TX Hash</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-white/[0.03] pp-row-hover">
                <td className="py-3 px-4 text-slate-300">{formatDate(tx.date)}</td>
                <td className="py-3 px-4">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/[0.04] text-slate-300">
                    {TYPE_LABELS[tx.type] || tx.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono text-white">
                  {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.token}
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] || 'text-slate-400 bg-white/[0.04]'}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400 truncate max-w-[180px]">{tx.counterparty}</td>
                <td className="py-3 px-4">
                  {tx.txHash ? (
                    <a
                      href={`https://explore.moderato.tempo.xyz/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                    >
                      {tx.txHash.slice(0, 8)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/[0.04] text-slate-300">
                {TYPE_LABELS[tx.type] || tx.type}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[tx.status] || 'text-slate-400 bg-white/[0.04]'}`}>
                {tx.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-mono font-medium">
                {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.token}
              </span>
              <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>
            </div>
            <div className="text-xs text-slate-400 truncate">{tx.counterparty}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export default TransactionTable;
