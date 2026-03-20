'use client';

import React from 'react';

interface MilestoneData {
  id: string;
  index: number;
  amount: number;
  status: string;
}

interface StreamData {
  id: string;
  agentName?: string | null;
  totalBudget: number;
  releasedAmount: number;
  status: string;
  createdAt: string;
  milestones: MilestoneData[];
}

interface MyStreamsProps {
  streams: {
    active: StreamData[];
    completed: StreamData[];
    counts: { total: number; active: number; completed: number };
  };
}

const STREAM_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

function StreamCard({ stream }: { stream: StreamData }) {
  const statusStyle = STREAM_STATUS_STYLES[stream.status] ?? STREAM_STATUS_STYLES.ACTIVE;
  const approvedCount = stream.milestones.filter((m) => m.status === 'APPROVED').length;
  const totalMilestones = stream.milestones.length;
  const progressPercent = totalMilestones > 0 ? (approvedCount / totalMilestones) * 100 : 0;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-white truncate">
          {stream.agentName ?? 'Unknown Agent'}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
          {stream.status}
        </span>
      </div>

      <p className="text-lg font-black text-white tabular-nums font-mono mb-3">
        <span className="text-slate-500">$</span>
        {stream.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>

      {/* Milestone progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-bold">Milestones</span>
          <span className="text-slate-500">
            {approvedCount}/{totalMilestones} approved
          </span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-600 mt-2">
        Released: ${stream.releasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export default function MyStreams({ streams }: MyStreamsProps) {
  return (
    <div className="space-y-4">
      {/* Count badges */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
          {streams.counts.active} Active
        </span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          {streams.counts.completed} Completed
        </span>
      </div>

      {/* Stream cards */}
      {streams.active.length > 0 || streams.completed.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.active.map((s) => (
            <StreamCard key={s.id} stream={s} />
          ))}
          {streams.completed.map((s) => (
            <StreamCard key={s.id} stream={s} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No streams found
        </div>
      )}
    </div>
  );
}
