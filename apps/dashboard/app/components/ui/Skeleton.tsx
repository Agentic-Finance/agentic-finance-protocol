'use client';
import React from 'react';

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: 'var(--pp-bg-card)' }}>
      <div className="w-20 h-3 mb-3 pp-skeleton" />
      <div className="w-28 h-6 mb-2 pp-skeleton" />
      <div className="w-16 h-3 pp-skeleton" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 pp-skeleton ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-16 h-16' };
  return <div className={`${sizeMap[size]} rounded-full pp-skeleton`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2 border-b border-white/[0.06]">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-3 pp-skeleton" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="flex-1 h-4 pp-skeleton" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] p-4 bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg pp-skeleton" />
        <div className="flex-1 space-y-1.5">
          <div className="w-16 h-3 pp-skeleton" />
          <div className="w-24 h-5 pp-skeleton" />
        </div>
      </div>
    </div>
  );
}
