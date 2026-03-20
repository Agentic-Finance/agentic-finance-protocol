'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ThreatItem, AuditEvent } from '../../lib/warroom-types';

const ThreatRadar = dynamic(() => import('../warroom/ThreatRadar'), { ssr: false });

interface Props {
  threats: ThreatItem[];
  auditEvents: AuditEvent[];
  walletAddress: string | null;
  onActionComplete?: () => void;
}

type ActionType = 'flag' | 'pause_vote' | 'slash_vote';

const ACTION_CONFIG: Record<ActionType, { label: string; icon: string; color: string; confirmMsg: string }> = {
  flag:       { label: 'Flag', icon: '🚩', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20', confirmMsg: 'Flag this agent for suspicious activity?' },
  pause_vote: { label: 'Vote Pause', icon: '⏸️', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20', confirmMsg: 'Vote to pause this agent?' },
  slash_vote: { label: 'Vote Slash', icon: '⚡', color: 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20', confirmMsg: 'Vote to slash this agent\'s deposit? This is a serious action.' },
};

export default function RiskConsole({ threats, auditEvents, walletAddress, onActionComplete }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, string>>({});

  const handleAction = async (type: ActionType, threat: ThreatItem) => {
    if (!walletAddress) return alert('Connect wallet to take actions');
    if (!confirm(ACTION_CONFIG[type].confirmMsg)) return;

    const key = `${threat.id}-${type}`;
    setActionLoading(key);

    try {
      const res = await fetch('/api/sentinel/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: type,
          targetWallet: threat.agentName ?? 'unknown',
          reason: `${threat.type}: ${threat.title}`,
          senderWallet: walletAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResults((prev) => ({ ...prev, [key]: 'Submitted ✓' }));
        onActionComplete?.();
      } else {
        setActionResults((prev) => ({ ...prev, [key]: 'Failed' }));
      }
    } catch {
      setActionResults((prev) => ({ ...prev, [key]: 'Error' }));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Threat Radar */}
      <div className="lg:col-span-5">
        <ThreatRadar threats={threats} auditEvents={auditEvents} />
      </div>

      {/* Actionable Threat List */}
      <div className="lg:col-span-7">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🚨</span>
            <h3 className="text-white font-bold">Active Threats</h3>
            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold border border-red-500/20">
              {threats.length}
            </span>
          </div>

          {threats.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🟢</div>
              <h4 className="text-white font-bold mb-1">All Clear</h4>
              <p className="text-slate-500 text-sm">No active threats detected.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto cyber-scroll-y">
              {threats.map((threat) => (
                <div
                  key={threat.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                          threat.severity === 'ERROR'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {threat.severity}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                          {threat.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{threat.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{threat.detail}</p>
                      {threat.agentName && (
                        <span className="text-[10px] text-slate-500 mt-1 inline-block">
                          Agent: <span className="text-slate-300">{threat.agentName}</span>
                        </span>
                      )}
                    </div>
                    {threat.amount && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-red-400">${threat.amount.toLocaleString()}</div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                    {(Object.entries(ACTION_CONFIG) as [ActionType, typeof ACTION_CONFIG[ActionType]][]).map(([type, config]) => {
                      const key = `${threat.id}-${type}`;
                      const result = actionResults[key];

                      if (result) {
                        return (
                          <span key={type} className="text-[10px] text-slate-500 px-2 py-1">
                            {result}
                          </span>
                        );
                      }

                      return (
                        <button
                          key={type}
                          onClick={() => handleAction(type, threat)}
                          disabled={actionLoading === key}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${config.color} disabled:opacity-40`}
                        >
                          {actionLoading === key ? '...' : `${config.icon} ${config.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
