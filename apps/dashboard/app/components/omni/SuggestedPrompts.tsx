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
        <div className="mt-4 mb-2 animate-in fade-in duration-500">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wider mb-3 ml-0.5">
                Suggested tasks
            </p>
            <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        className="group px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] transition-all duration-150 text-left flex items-center gap-2"
                    >
                        <span className="text-base shrink-0">{prompt.emoji}</span>
                        <span className="text-xs text-slate-500 group-hover:text-indigo-300 transition-colors">{prompt.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default React.memo(SuggestedPrompts);
