'use client';

import React, { useState } from 'react';

interface EscrowJob {
  id: string;
  status: string;
  budget: number;
  prompt: string;
  deadline?: string | null;
  createdAt: string;
  agent: {
    name: string;
    avatarEmoji: string;
  };
}

interface MyEscrowsProps {
  escrows: {
    active: EscrowJob[];
    completed: EscrowJob[];
    counts: { total: number; active: number; completed: number };
  };
}

const STATUS_STYLES: Record<string, string> = {
  CREATED: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  MATCHED: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  NEGOTIATING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  ESCROW_LOCKED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  EXECUTING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  SETTLED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
  DISPUTED: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  REFUNDED: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function EscrowItem({ job }: { job: EscrowJob }) {
  const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.CREATED;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-all">
      <span className="text-2xl flex-shrink-0">{job.agent.avatarEmoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-white truncate">{job.agent.name}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
            {job.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">{job.prompt}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black text-white tabular-nums font-mono">
          ${job.budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        {job.deadline && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            Due {relativeTime(job.deadline)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MyEscrows({ escrows }: MyEscrowsProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="space-y-4">
      {/* Count badges */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
          {escrows.counts.active} Active
        </span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
          {escrows.counts.completed} Completed
        </span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">
          {escrows.counts.total} Total
        </span>
      </div>

      {/* Active escrows */}
      {escrows.active.length > 0 ? (
        <div className="space-y-2">
          {escrows.active.map((job) => (
            <EscrowItem key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No active escrows
        </div>
      )}

      {/* Completed (collapsible) */}
      {escrows.completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-2"
          >
            <span className="transform transition-transform" style={{ display: 'inline-block', transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
            Completed ({escrows.completed.length})
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {escrows.completed.map((job) => (
                <EscrowItem key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
