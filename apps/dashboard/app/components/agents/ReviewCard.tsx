'use client';
import React from 'react';
import { Star } from 'lucide-react';

interface ReviewCardProps {
  rating: number;
  comment?: string | null;
  reviewerWallet?: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ReviewCard({ rating, comment, reviewerWallet, createdAt }: ReviewCardProps) {
  const displayWallet = reviewerWallet
    ? `${reviewerWallet.slice(0, 6)}...${reviewerWallet.slice(-4)}`
    : 'Anonymous';

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-600">{timeAgo(createdAt)}</span>
      </div>
      {comment && <p className="text-sm text-slate-300 mb-2">{comment}</p>}
      <p className="text-xs text-slate-500 font-mono">{displayWallet}</p>
    </div>
  );
}

export default ReviewCard;
