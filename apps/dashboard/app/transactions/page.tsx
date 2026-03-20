'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/ui/AppShell';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { ExportButton } from '../components/transactions/ExportButton';
import { EmptyTransactions } from '../components/ui/EmptyState';
import { PageLoading } from '../components/ui/LoadingSpinner';
import { useWallet } from '../hooks/useWallet';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'stream', label: 'Stream' },
  { value: 'shield', label: 'Shield' },
  { value: 'payout', label: 'Payout' },
];

export default function TransactionsPage() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/transactions?wallet=${address}&type=${typeFilter}&limit=${limit}&offset=${offset}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setTransactions(data.transactions || []);
          setTotal(data.total || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, typeFilter, offset]);

  const filtered = search
    ? transactions.filter(tx =>
        tx.counterparty.toLowerCase().includes(search.toLowerCase()) ||
        tx.txHash?.toLowerCase().includes(search.toLowerCase()) ||
        tx.type.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Transaction History</h1>
            <p className="text-sm text-slate-400 mt-1">{total} total transactions</p>
          </div>
          <ExportButton transactions={transactions} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/30 appearance-none cursor-pointer"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#111118] text-white">{opt.label}</option>
            ))}
          </select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/30"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <PageLoading text="Loading transactions..." />
        ) : filtered.length === 0 ? (
          <EmptyTransactions />
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <TransactionTable transactions={filtered} />
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
