'use client';

import React, { type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════
   StatCard — Unified stat card for the entire dashboard
   Usage: <StatCard label="TRANSACTIONS" value={204} color="emerald" icon={<ClockIcon />} />
   ═══════════════════════════════════════════════════ */

const COLOR_MAP = {
  emerald:  { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'rgba(16,185,129,0.2)',  hex: '#10b981', gradient: 'from-emerald-500/40 to-teal-500/10' },
  cyan:     { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    glow: 'rgba(6,182,212,0.2)',   hex: '#06b6d4', gradient: 'from-cyan-500/40 to-blue-500/10' },
  indigo:   { text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  glow: 'rgba(99,102,241,0.2)',  hex: '#818cf8', gradient: 'from-indigo-500/40 to-violet-500/10' },
  amber:    { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   glow: 'rgba(245,158,11,0.2)', hex: '#f59e0b', gradient: 'from-amber-500/40 to-orange-500/10' },
  violet:   { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  glow: 'rgba(139,92,246,0.2)', hex: '#8b5cf6', gradient: 'from-violet-500/40 to-purple-500/10' },
  pink:     { text: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20',    glow: 'rgba(236,72,153,0.2)', hex: '#ec4899', gradient: 'from-pink-500/40 to-rose-500/10' },
  fuchsia:  { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', glow: 'rgba(217,70,239,0.2)', hex: '#d946ef', gradient: 'from-fuchsia-500/40 to-purple-500/10' },
  blue:     { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glow: 'rgba(59,130,246,0.2)', hex: '#3b82f6', gradient: 'from-blue-500/40 to-sky-500/10' },
  red:      { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     glow: 'rgba(239,68,68,0.2)',  hex: '#ef4444', gradient: 'from-red-500/40 to-rose-500/10' },
  rose:     { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    glow: 'rgba(244,63,94,0.2)',  hex: '#f43f5e', gradient: 'from-rose-500/40 to-red-500/10' },
} as const;

export type StatCardColor = keyof typeof COLOR_MAP;

export interface TrendData {
  value: number;            // e.g. 26 means 26%
  direction: 'up' | 'down' | 'flat';
  label?: string;           // e.g. "vs last month"
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color: StatCardColor;
  subtitle?: string;
  trend?: TrendData;
  badge?: string;
  suffix?: string;          // e.g. "αUSD", "Bots"
  variant?: 'default' | 'compact' | 'gradient-border';
  pulse?: boolean;
  className?: string;
  children?: ReactNode;     // For custom content like fund input
}

/* ── Trend Badge ── */
export function TrendBadge({ trend }: { trend: TrendData }) {
  if (trend.direction === 'flat') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <span>→</span> {trend.value}%
        {trend.label && <span className="text-slate-500 font-normal">{trend.label}</span>}
      </span>
    );
  }

  const isUp = trend.direction === 'up';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] ${isUp ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
        {isUp ? '↑' : '↓'}
      </span>
      {trend.value}%
      {trend.label && <span className="text-slate-500 font-normal ml-0.5">{trend.label}</span>}
    </span>
  );
}

/* ── Main Component ── */
function StatCardInner({
  label, value, icon, color, subtitle, trend, badge, suffix,
  variant = 'default', pulse, className = '', children,
}: StatCardProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  /* ─── Gradient-border variant (used by TopStatsCards) ─── */
  if (variant === 'gradient-border') {
    return (
      <div className={`relative z-20 group ${className}`}>
        {/* Outer glow */}
        <div className={`absolute -inset-[1px] bg-gradient-to-r ${c.gradient} rounded-[1.4rem] opacity-70 blur-[2px] pointer-events-none group-hover:opacity-100 transition-opacity`} />
        {/* Corner borders */}
        <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 ${c.border.replace('border-', 'border-').replace('/20', '/80')} rounded-tl-lg z-10 pointer-events-none`} style={{ borderColor: `${c.hex}cc` }} />
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 rounded-br-lg z-10 pointer-events-none`} style={{ borderColor: `${c.hex}cc` }} />
        {/* Card body */}
        <div className="p-4 sm:p-6 flex flex-col border border-[var(--pp-border)] rounded-2xl relative z-10 shadow-inner h-full stat-card-bg">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${c.bg} flex items-center justify-center ${c.text} ${c.border} border text-sm sm:text-base`} style={{ boxShadow: `0 0 10px ${c.glow}` }}>
              {icon}
            </div>
            {badge && (
              <span className={`text-[9px] sm:text-[10px] font-mono ${c.text} ${c.bg} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${c.border} border tracking-widest ${pulse ? 'animate-pulse' : ''}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="agt-label mb-1">{label}</p>
          <h3 className="agt-value-lg">
            {value}
            {suffix && <span className="text-xs sm:text-sm text-slate-500 font-sans font-bold ml-1">{suffix}</span>}
          </h3>
          {trend && <div className="mt-2"><TrendBadge trend={trend} /></div>}
          {subtitle && <p className="agt-subtitle mt-1">{subtitle}</p>}
          {children}
        </div>
      </div>
    );
  }

  /* ─── Compact variant (used by Sentinel) ─── */
  if (variant === 'compact') {
    return (
      <div className={`rounded-xl border border-[var(--pp-border)] p-3 hover:border-[var(--pp-border-hover)] transition-all stat-card-bg ${className}`}>
        <div className="flex items-center gap-1.5 mb-1.5">
          {icon && <span className={`${c.text} text-xs`}>{icon}</span>}
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-lg font-black ${c.text} tabular-nums`}>{value}{suffix && <span className="text-xs text-slate-500 ml-1">{suffix}</span>}</div>
        {trend && <div className="mt-1"><TrendBadge trend={trend} /></div>}
        {subtitle && <p className="text-[9px] text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
    );
  }

  /* ─── Default variant ─── */
  return (
    <div className={`rounded-2xl border border-[var(--pp-border)] p-4 sm:p-5 hover:border-[var(--pp-border-hover)] transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] stat-card-bg ${className}`}>
      <div className="flex justify-between items-start mb-3">
        {icon && (
          <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center ${c.text} text-sm`} style={{ boxShadow: `0 0 10px ${c.glow}` }}>
            {icon}
          </div>
        )}
        {badge && (
          <span className={`text-[9px] sm:text-[10px] font-mono ${c.text} ${c.bg} px-1.5 py-0.5 rounded ${c.border} border tracking-widest ${pulse ? 'animate-pulse' : ''}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="agt-label mb-1">{label}</p>
      <h3 className="text-xl sm:text-2xl font-black text-[var(--pp-text-primary)] tabular-nums font-mono">
        {value}
        {suffix && <span className="text-xs sm:text-sm text-slate-500 font-sans font-bold ml-1">{suffix}</span>}
      </h3>
      {trend && <div className="mt-2"><TrendBadge trend={trend} /></div>}
      {subtitle && <p className="agt-subtitle mt-1">{subtitle}</p>}
      {children}
    </div>
  );
}

const StatCard = React.memo(StatCardInner);
export default StatCard;
export { StatCard, COLOR_MAP };
