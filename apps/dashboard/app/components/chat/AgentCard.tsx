'use client';

import React from 'react';

interface AgentCardProps {
    agent: {
        id: string;
        name: string;
        avatarEmoji: string;
        category: string;
        basePrice: number;
        successRate: number;
        avgRating: number;
        totalJobs: number;
        isVerified: boolean;
        nativeAgentId: string | null;
        skills: string;
    };
    isSelected: boolean;
    onClick: () => void;
}

export default function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
    const renderStars = (rating: number) => {
        const full = Math.floor(rating);
        const half = rating - full >= 0.5;
        const stars: React.ReactNode[] = [];
        for (let i = 0; i < 5; i++) {
            if (i < full) {
                stars.push(<span key={i} className="text-amber-400">&#9733;</span>);
            } else if (i === full && half) {
                stars.push(<span key={i} className="text-amber-400/50">&#9733;</span>);
            } else {
                stars.push(<span key={i} className="text-slate-600">&#9733;</span>);
            }
        }
        return stars;
    };

    return (
        <button
            onClick={onClick}
            className={`
                w-full text-left p-3 rounded-xl border transition-all cursor-pointer
                ${isSelected
                    ? 'border-cyan-500/30 bg-cyan-500/5'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                }
            `}
        >
            {/* Row 1: Avatar + Name + Verified */}
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl leading-none">{agent.avatarEmoji}</span>
                <span className="font-bold text-sm text-white truncate flex-1">{agent.name}</span>
                {agent.isVerified && (
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-emerald-400 text-[10px] font-bold leading-none">&#10003;</span>
                    </span>
                )}
            </div>

            {/* Row 2: Category + Rating + Price */}
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-400 truncate">
                    {agent.category}
                </span>
                <span className="flex items-center gap-0.5 text-xs">
                    {renderStars(agent.avgRating)}
                </span>
                <span className="text-emerald-400 text-xs font-medium ml-auto">
                    ${agent.basePrice}
                </span>
            </div>

            {/* Row 3: Stats */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>{agent.totalJobs} jobs</span>
                <span className="text-slate-600">&middot;</span>
                <span>{agent.successRate}% success</span>
            </div>
        </button>
    );
}
