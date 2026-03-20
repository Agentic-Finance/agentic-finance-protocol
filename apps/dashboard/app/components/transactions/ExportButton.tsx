'use client';
import React, { useState } from 'react';
import { Download, FileText, Table2 } from 'lucide-react';

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

function exportCSV(transactions: Transaction[]) {
  const headers = ['Date', 'Type', 'Amount', 'Token', 'Status', 'Counterparty', 'TX Hash'];
  const rows = transactions.map(tx => [
    new Date(tx.date).toISOString(),
    tx.type,
    tx.amount.toString(),
    tx.token,
    tx.status,
    tx.counterparty,
    tx.txHash || '',
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(transactions: Transaction[]) {
  // Simple print-based PDF export
  const content = `
    <html>
      <head><title>Transaction History</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { font-weight: bold; background: #f5f5f5; }
        h1 { font-size: 18px; }
      </style></head>
      <body>
        <h1>Transaction History - Agentic Finance</h1>
        <p>Exported: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>Counterparty</th></tr></thead>
          <tbody>
            ${transactions.map(tx => `<tr>
              <td>${new Date(tx.date).toLocaleDateString()}</td>
              <td>${tx.type}</td>
              <td>${tx.amount} ${tx.token}</td>
              <td>${tx.status}</td>
              <td>${tx.counterparty}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(content);
    w.document.close();
    w.print();
  }
}

export function ExportButton({ transactions }: { transactions: Transaction[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-[#111118] border border-white/[0.06] rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <button
            onClick={() => { exportCSV(transactions); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04] transition-colors"
          >
            <Table2 className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => { exportPDF(transactions); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.04] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
