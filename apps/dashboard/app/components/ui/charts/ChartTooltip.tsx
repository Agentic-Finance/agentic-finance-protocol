'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════
   ChartTooltip — Shared dark tooltip for recharts
   Usage: <Tooltip content={<ChartTooltipContent />} />
   ═══════════════════════════════════════════════════ */

export interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => string;
}

function ChartTooltipContentInner({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#11141D] border border-white/10 rounded-xl p-3 shadow-xl min-w-[120px]">
      {label != null && (
        <p className="text-[10px] text-slate-400 mb-1">{label}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || '#818cf8' }}
            />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="text-white font-semibold ml-auto tabular-nums">
              {formatter ? formatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ChartTooltipContent = React.memo(ChartTooltipContentInner);
export default ChartTooltipContent;
