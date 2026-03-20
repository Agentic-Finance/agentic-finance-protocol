'use client';

import React from 'react';

interface ActivityItem {
  id: string;
  status: string;
  prompt: string;
  executionTime?: number | null;
  createdAt: string;
  completedAt?: string | null;
  agent: {
    name: string;
    avatarEmoji: string;
  };
}

interface RecentActivityProps {
  activities: ActivityItem[];
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

function timeago(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo}mo ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, idx) => {
        const statusStyle = STATUS_STYLES[activity.status] ?? STATUS_STYLES.CREATED;
        const truncatedPrompt =
          activity.prompt.length > 60
            ? activity.prompt.slice(0, 60) + '...'
            : activity.prompt;

        return (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
            {/* Timeline connector */}
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <span className="text-lg">{activity.agent.avatarEmoji}</span>
              {idx < activities.length - 1 && (
                <div className="w-px h-8 bg-white/[0.06] mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-white truncate">
                  {activity.agent.name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                  {activity.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{truncatedPrompt}</p>
              <div className="flex items-center gap-3 mt-1">
                {activity.executionTime != null && activity.executionTime > 0 && (
                  <span className="text-[10px] text-slate-600">
                    {formatDuration(activity.executionTime)}
                  </span>
                )}
                <span className="text-[10px] text-slate-600">
                  {timeago(activity.createdAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
