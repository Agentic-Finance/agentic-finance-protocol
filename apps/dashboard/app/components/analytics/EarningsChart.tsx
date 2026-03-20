'use client';
import React from 'react';

interface ChartData {
  month: string;
  amount: number;
}

export function EarningsChart({ data }: { data: ChartData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Earnings by Month</h3>
        <p className="text-sm text-slate-500 text-center py-8">No data yet</p>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Earnings by Month</h3>
      <div className="flex items-end gap-2 h-40">
        {data.slice(-12).map(d => {
          const height = (d.amount / maxAmount) * 100;
          const monthLabel = d.month.split('-')[1];
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 font-mono">
                {d.amount > 0 ? `$${d.amount.toFixed(0)}` : ''}
              </span>
              <div className="w-full flex items-end" style={{ height: '120px' }}>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(height, 2)}%`,
                    background: 'linear-gradient(to top, #06b6d4, #6366f1)',
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-600">{monthLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default EarningsChart;
