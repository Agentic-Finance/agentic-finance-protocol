'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRightIcon, ArrowLeftIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import type { DiscoveredAgent } from '../../hooks/useAgentMarketplace';

interface TaskPromptPanelProps {
    agent: DiscoveredAgent;
    onSubmit: (taskPrompt: string) => void;
    onBack: () => void;
}

function TaskPromptPanel({ agent, onSubmit, onBack }: TaskPromptPanelProps) {
    const [task, setTask] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const a = agent.agent;

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (task.trim().length < 3) return;
        onSubmit(task.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="mt-4 bg-[#0A0E17] border border-indigo-500/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />

            <div className="p-5">
                {/* Agent mini-card */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl shrink-0 w-10 h-10 flex items-center justify-center bg-white/[0.04] rounded-xl">
                        {a.avatarEmoji}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h4 className="text-white font-semibold text-sm">{a.name}</h4>
                            {a.isVerified && <CheckBadgeIcon className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                                <StarIcon className="w-3 h-3 text-amber-400" />
                                {a.avgRating}
                            </span>
                            <span>{a.totalJobs} jobs</span>
                            <span className="text-emerald-400">{a.successRate}%</span>
                            <span className="text-indigo-400 font-semibold">{a.basePrice} ALPHA</span>
                        </div>
                    </div>
                </div>

                {/* Agent description */}
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                    {a.description}
                </p>

                {/* Skills */}
                {a.skills && a.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                        {a.skills.map((skill, i) => (
                            <span key={i} className="text-[9px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.04]">{skill}</span>
                        ))}
                    </div>
                )}

                {/* Task input */}
                <div className="border-t border-white/[0.06] pt-4 mb-1">
                    <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                        What do you need this agent to do?
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`e.g. "${a.skills?.[0] ? `Help me with ${a.skills[0].toLowerCase()}` : 'Describe your task here...'}"`}
                        className="w-full bg-black/30 border border-white/[0.06] rounded-xl p-3 text-white text-sm placeholder:text-slate-600 outline-none focus:border-indigo-500/30 resize-none transition-colors min-h-[80px]"
                        rows={3}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-4 py-2 text-slate-500 hover:text-slate-300 text-[11px] font-semibold transition-all"
                    >
                        <ArrowLeftIcon className="w-3 h-3" /> Back to Catalog
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={task.trim().length < 3}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            task.trim().length >= 3
                                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                : 'bg-white/[0.03] text-slate-600 cursor-not-allowed'
                        }`}
                    >
                        Start Negotiation <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(TaskPromptPanel);
