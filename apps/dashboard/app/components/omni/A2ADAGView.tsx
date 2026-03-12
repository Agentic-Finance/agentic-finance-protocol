'use client';

import React, { useMemo } from 'react';
import {
  CheckCircleIcon, XCircleIcon, ArrowPathIcon, ClockIcon,
} from '@/app/components/icons';
import { computeDAGLayout, NODE_WIDTH, NODE_HEIGHT } from '../../lib/dag-layout';
import type { A2ASubTask, A2APlanStep } from '../../hooks/useA2AOrchestration';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

interface A2ADAGViewProps {
  steps: (A2APlanStep | A2ASubTask)[];
  isExecuting?: boolean;
}

// ══════════════════════════════════════
// STATUS COLORS
// ══════════════════════════════════════

function getStatusColor(status: string): { border: string; bg: string; text: string; glow?: string } {
  const s = status?.toUpperCase() || 'PENDING';
  switch (s) {
    case 'COMPLETED':
    case 'DONE':
      return { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', text: 'text-emerald-400' };
    case 'FAILED':
    case 'ERROR':
      return { border: 'border-rose-500/40', bg: 'bg-rose-500/5', text: 'text-rose-400' };
    case 'EXECUTING':
    case 'RUNNING':
      return { border: 'border-indigo-500/40', bg: 'bg-indigo-500/5', text: 'text-indigo-400', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.3)]' };
    case 'CANCELLED':
      return { border: 'border-slate-500/30', bg: 'bg-slate-500/5', text: 'text-slate-500' };
    case 'CANCELLING':
      return { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400' };
    default:
      return { border: 'border-zinc-700/50', bg: 'bg-zinc-800/30', text: 'text-zinc-500' };
  }
}

function getStatusIcon(status: string) {
  const s = status?.toUpperCase() || 'PENDING';
  if (s === 'COMPLETED' || s === 'DONE') return <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />;
  if (s === 'FAILED' || s === 'ERROR') return <XCircleIcon className="w-3.5 h-3.5 text-rose-400" />;
  if (s === 'EXECUTING' || s === 'RUNNING') return <ArrowPathIcon className="w-3.5 h-3.5 text-indigo-400 animate-spin" />;
  if (s === 'CANCELLED') return <XCircleIcon className="w-3.5 h-3.5 text-slate-500" />;
  return <ClockIcon className="w-3.5 h-3.5 text-zinc-500" />;
}

// ══════════════════════════════════════
// EDGE PATH (Bezier curve)
// ══════════════════════════════════════

function EdgePath({ fromX, fromY, toX, toY, fromStatus, toStatus }: {
  fromX: number; fromY: number; toX: number; toY: number;
  fromStatus: string; toStatus: string;
}) {
  const midX = (fromX + toX) / 2;
  const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

  const isFlowing = fromStatus?.toUpperCase() === 'COMPLETED' && (
    toStatus?.toUpperCase() === 'EXECUTING' || toStatus?.toUpperCase() === 'RUNNING'
  );
  const isCompleted = fromStatus?.toUpperCase() === 'COMPLETED' && toStatus?.toUpperCase() === 'COMPLETED';
  const isFailed = toStatus?.toUpperCase() === 'FAILED';

  let strokeColor = '#3f3f46'; // zinc-700
  if (isCompleted) strokeColor = '#10b981'; // emerald
  if (isFlowing) strokeColor = '#6366f1'; // indigo
  if (isFailed) strokeColor = '#f43f5e'; // rose

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeOpacity={0.6}
        markerEnd="url(#arrowhead)"
      />
      {isFlowing && (
        <circle r="3" fill="#6366f1" opacity="0.9">
          <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  );
}

// ══════════════════════════════════════
// DAG NODE
// ══════════════════════════════════════

function DAGNodeCard({ node }: { node: ReturnType<typeof computeDAGLayout>['nodes'][0] }) {
  const colors = getStatusColor(node.status);
  const budget = 'budget' in node ? (node as any).budget ?? (node as any).budgetAllocation : 0;

  return (
    <foreignObject x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT}>
      <div
        className={`h-full rounded-xl border ${colors.border} ${colors.bg} ${colors.glow || ''} px-3 py-2 transition-all duration-300`}
      >
        {/* Header: emoji + name + status */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-base leading-none">{node.agentEmoji || '🤖'}</span>
          <span className="text-[10px] font-bold text-zinc-200 truncate flex-1">
            {node.agentName}
          </span>
          {getStatusIcon(node.status)}
        </div>

        {/* Prompt (truncated) */}
        <p className="text-[9px] text-zinc-500 truncate mb-1.5">
          {node.prompt?.slice(0, 60)}{node.prompt?.length > 60 ? '...' : ''}
        </p>

        {/* Footer: budget + time + proof */}
        <div className="flex items-center gap-2 text-[9px]">
          <span className={`font-mono ${colors.text}`}>
            ${budget.toFixed(2)}
          </span>
          {node.executionTime != null && node.executionTime > 0 && (
            <span className="text-zinc-600">{node.executionTime}s</span>
          )}
          {node.retryCount != null && node.retryCount > 0 && (
            <span className="text-amber-500 font-bold">R{node.retryCount}</span>
          )}
          {node.proofMatched === true && (
            <span className="text-emerald-400" title="Verified on-chain">🔒</span>
          )}
        </div>
      </div>
    </foreignObject>
  );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

export default function A2ADAGView({ steps, isExecuting }: A2ADAGViewProps) {
  const dagLayout = useMemo(() => {
    const normalizedSteps = steps.map(s => ({
      stepIndex: s.stepIndex,
      agentName: s.agentName,
      agentEmoji: s.agentEmoji,
      category: ('category' in s ? (s as any).category : '') || '',
      prompt: s.prompt,
      budget: ('budget' in s ? (s as any).budget : (s as any).budgetAllocation) || 0,
      originalBudget: ('originalBudget' in s ? (s as any).originalBudget : undefined),
      status: ('status' in s ? (s as any).status : 'PENDING') || 'PENDING',
      dependsOn: s.dependsOn || [],
      executionTime: ('executionTime' in s ? (s as any).executionTime : undefined),
      retryCount: ('retryCount' in s ? (s as any).retryCount : undefined),
      proofMatched: ('proofMatched' in s ? (s as any).proofMatched : undefined),
    }));

    return computeDAGLayout(normalizedSteps);
  }, [steps]);

  if (dagLayout.nodes.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-600 text-xs">No steps to visualize</div>
    );
  }

  // Build status lookup for edges
  const statusMap = new Map(dagLayout.nodes.map(n => [n.stepIndex, n.status]));

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
      <svg
        width={Math.max(dagLayout.width, 400)}
        height={Math.max(dagLayout.height, 120)}
        className="min-w-full"
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#52525b" />
          </marker>
        </defs>

        {/* Edges (render behind nodes) */}
        {dagLayout.edges.map((edge, i) => (
          <EdgePath
            key={`edge-${i}`}
            fromX={edge.fromX}
            fromY={edge.fromY}
            toX={edge.toX}
            toY={edge.toY}
            fromStatus={statusMap.get(edge.from) || 'PENDING'}
            toStatus={statusMap.get(edge.to) || 'PENDING'}
          />
        ))}

        {/* Nodes */}
        {dagLayout.nodes.map(node => (
          <DAGNodeCard key={`node-${node.stepIndex}`} node={node} />
        ))}
      </svg>
    </div>
  );
}
