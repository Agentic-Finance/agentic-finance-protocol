'use client';

import React, { type ReactNode } from 'react';
import { Lock, Radio, Receipt, Bell, Bot } from 'lucide-react';

/* ═══════════════════════════════════════════════════
   EmptyState — Placeholder for empty data views
   Usage: <EmptyState title="No transactions" description="Create your first payment" />
   ═══════════════════════════════════════════════════ */

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

function EmptyStateInner({ icon, title, description, action, className = '' }: EmptyStateProps) {
  const actionElement = action ? (
    action.href ? (
      <a
        href={action.href}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
      >
        {action.label}
      </a>
    ) : (
      <button
        onClick={action.onClick}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
      >
        {action.label}
      </button>
    )
  ) : null;

  return (
    <div className={`rounded-2xl border border-dashed border-white/[0.08] bg-[var(--pp-bg-card)] py-16 ${className}`}>
      <div className="flex flex-col items-center justify-center text-center px-6">
        {icon && (
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mb-4">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-300 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 max-w-xs mb-5">{description}</p>
        {actionElement}
      </div>
    </div>
  );
}

const EmptyState = React.memo(EmptyStateInner);
export default EmptyState;
export { EmptyState };

export function EmptyEscrows() {
  return (
    <EmptyState
      icon={<Lock className="w-6 h-6 text-indigo-400" />}
      title="No escrows yet"
      description="Escrow transactions will appear here when you hire agents or lock funds."
    />
  );
}

export function EmptyStreams() {
  return (
    <EmptyState
      icon={<Radio className="w-6 h-6 text-indigo-400" />}
      title="No active streams"
      description="Milestone-based payment streams will appear here."
    />
  );
}

export function EmptyTransactions() {
  return (
    <EmptyState
      icon={<Receipt className="w-6 h-6 text-indigo-400" />}
      title="No transactions"
      description="Your transaction history will appear here."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={<Bell className="w-6 h-6 text-indigo-400" />}
      title="No notifications"
      description="You're all caught up. Notifications will appear here."
    />
  );
}

export function EmptyAgents() {
  return (
    <EmptyState
      icon={<Bot className="w-6 h-6 text-indigo-400" />}
      title="No agents found"
      description="No agents match your current filters."
    />
  );
}
