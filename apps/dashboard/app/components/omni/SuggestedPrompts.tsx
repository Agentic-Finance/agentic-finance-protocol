'use client';

import React from 'react';

interface SuggestedPromptsProps {
    onSelect: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
    { text: 'Audit my Solidity contract', emoji: '🛡️' },
    { text: 'Find yield farming opportunities', emoji: '🌾' },
    { text: 'Optimize batch payroll gas', emoji: '⛽' },
    { text: 'Check DAO compliance', emoji: '⚖️' },
];

function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
    return (
        <div className="mt-3 mb-1 animate-in fade-in duration-500">
            <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider mb-2 ml-0.5">
                Suggested tasks
            </p>
            <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        className="group px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] transition-all duration-150 text-left flex items-center gap-1.5"
                    >
                        <span className="text-sm shrink-0">{prompt.emoji}</span>
                        <span className="text-[11px] text-slate-500 group-hover:text-indigo-300 transition-colors">{prompt.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default React.memo(SuggestedPrompts);
