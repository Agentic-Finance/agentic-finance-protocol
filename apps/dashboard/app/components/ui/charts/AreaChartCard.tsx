'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltipContent } from './ChartTooltip';

/* ═══════════════════════════════════════════════════
   AreaChartCard — Area chart wrapped in a pp-card
   Usage: <AreaChartCard title="Volume" data={data} dataKey="value" />
   ═══════════════════════════════════════════════════ */

export interface AreaChartCardProps {
  title: string;
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  gradientId?: string;
  height?: number;
  subtitle?: string;
  className?: string;
}

function AreaChartCardInner({
  title,
  data,
  dataKey,
  xAxisKey = 'name',
  color = '#818cf8',
  gradientId,
  height = 240,
  subtitle,
  className = '',
}: AreaChartCardProps) {
  const gId = gradientId || `area-grad-${dataKey}`;

  return (
    <div className={`pp-card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="agt-heading-section">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#0A0A0F', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const AreaChartCard = React.memo(AreaChartCardInner);
export default AreaChartCard;
export { AreaChartCard };
