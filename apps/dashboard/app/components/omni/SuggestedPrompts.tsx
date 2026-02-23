'use client';

import React from 'react';

interface SuggestedPromptsProps {
    onSelect: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
    { text: 'Audit my Solidity contract for vulnerabilities', emoji: '🛡️', category: 'security' },
    { text: 'Find the best yield farming opportunities', emoji: '🌾', category: 'defi' },
    { text: 'Optimize my batch payroll gas costs', emoji: '📊', category: 'payroll' },
    { text: 'Predict gas prices for next 24 hours', emoji: '⛽', category: 'analytics' },
    { text: 'Check regulatory compliance for my DAO', emoji: '⚖️', category: 'compliance' },
    { text: 'Find arbitrage opportunities across DEXs', emoji: '⚡', category: 'defi' },
];

function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
    return (
        <div className="mt-3 mb-1 animate-in fade-in duration-500">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <span className="text-indigo-400/60">💡</span> Try one of these
            </p>
            <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        className="group px-3 py-2 rounded-xl bg-[#0B0F19]/60 border border-white/[0.04] hover:border-indigo-500/25 hover:bg-indigo-500/[0.04] transition-all duration-200 text-left flex items-center gap-2"
                    >
                        <span className="text-base shrink-0">{prompt.emoji}</span>
                        <span className="text-[11px] text-slate-400 group-hover:text-indigo-300 transition-colors leading-tight">{prompt.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default React.memo(SuggestedPrompts);
