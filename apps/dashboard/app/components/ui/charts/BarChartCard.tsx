'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartTooltipContent } from './ChartTooltip';

/* ═══════════════════════════════════════════════════
   BarChartCard — Multi-series bar chart in a pp-card
   Usage: <BarChartCard title="Revenue" data={data} dataKeys={[{ key: 'value', color: '#818cf8' }]} />
   ═══════════════════════════════════════════════════ */

export interface BarDataKey {
  key: string;
  color: string;
  label?: string;
}

export interface BarChartCardProps {
  title: string;
  data: any[];
  dataKeys: BarDataKey[];
  xAxisKey?: string;
  height?: number;
  subtitle?: string;
  className?: string;
}

function BarChartCardInner({
  title,
  data,
  dataKeys,
  xAxisKey = 'name',
  height = 240,
  subtitle,
  className = '',
}: BarChartCardProps) {
  return (
    <div className={`pp-card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="agt-heading-section">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          {dataKeys.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {dataKeys.map((dk) => (
            <Bar
              key={dk.key}
              dataKey={dk.key}
              name={dk.label || dk.key}
              fill={dk.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const BarChartCard = React.memo(BarChartCardInner);
export default BarChartCard;
export { BarChartCard };
