'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltipContent } from './ChartTooltip';

/* ═══════════════════════════════════════════════════
   DonutChartCard — Donut (ring) chart in a pp-card
   Usage: <DonutChartCard title="Distribution" data={slices} centerLabel="Total" centerValue="$42K" />
   ═══════════════════════════════════════════════════ */

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartCardProps {
  title: string;
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  className?: string;
}

function DonutChartCardInner({
  title,
  data,
  centerLabel,
  centerValue,
  height = 240,
  className = '',
}: DonutChartCardProps) {
  const chartSize = height;
  const outerRadius = Math.round(chartSize * 0.85 * 0.5);
  const innerRadius = Math.round(outerRadius * 0.6);

  return (
    <div className={`pp-card p-5 ${className}`}>
      <h3 className="agt-heading-section mb-4">{title}</h3>

      {/* Chart with center label */}
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              dataKey="value"
              stroke="none"
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <span className="text-xl font-black text-white tabular-nums font-mono">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-400">{entry.name}</span>
            <span className="text-white font-semibold tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DonutChartCard = React.memo(DonutChartCardInner);
export default DonutChartCard;
export { DonutChartCard };
