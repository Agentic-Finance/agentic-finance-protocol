'use client';
import React from 'react';
import { Star } from 'lucide-react';

interface AgentPerformance {
  id: string;
  name: string;
  avatarEmoji: string;
  category: string;
  jobs: number;
  earnings: number;
  rating: number;
  successRate: number;
}

export function AgentPerformanceTable({ agents }: { agents: AgentPerformance[] }) {
  if (agents.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Top Performing Agents</h3>
        <p className="text-sm text-slate-500 text-center py-8">No agents registered yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">Top Performing Agents</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-3 px-5 text-xs font-medium text-slate-500 uppercase tracking-wider">Agent</th>
              <th className="text-right py-3 px-5 text-xs font-medium text-slate-500 uppercase tracking-wider">Jobs</th>
              <th className="text-right py-3 px-5 text-xs font-medium text-slate-500 uppercase tracking-wider">Earnings</th>
              <th className="text-right py-3 px-5 text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
              <th className="text-right py-3 px-5 text-xs font-medium text-slate-500 uppercase tracking-wider">Success</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id} className="border-b border-white/[0.03] pp-row-hover">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{agent.avatarEmoji}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{agent.category}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-5 text-right font-mono text-white">{agent.jobs}</td>
                <td className="py-3 px-5 text-right font-mono text-white">
                  ${agent.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm text-white">{agent.rating.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className={`text-sm font-mono ${agent.successRate >= 90 ? 'text-emerald-400' : agent.successRate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                    {agent.successRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AgentPerformanceTable;
