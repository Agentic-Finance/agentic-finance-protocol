'use client';
import React from 'react';
import { Star, BadgeCheck } from 'lucide-react';

interface AgentProfileProps {
  name: string;
  avatarEmoji: string;
  avatarUrl?: string | null;
  category: string;
  isVerified: boolean;
  avgRating: number;
  ratingCount: number;
}

export function AgentProfile({ name, avatarEmoji, avatarUrl, category, isVerified, avgRating, ratingCount }: AgentProfileProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Avatar with glow */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            avatarEmoji
          )}
        </div>
        <div className="absolute -inset-1 bg-cyan-500/10 rounded-2xl blur-md -z-10" />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">{name}</h1>
          {isVerified && (
            <BadgeCheck className="w-5 h-5 text-cyan-400" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize">
            {category}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-medium text-white">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-slate-500">({ratingCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentProfile;
