'use client';

import React, { useMemo } from 'react';

interface SuggestedPromptsProps {
    onSelect: (prompt: string) => void;
    variant?: 'agent' | 'payroll';
}

const AGENT_PROMPTS = [
    { text: 'Audit my Solidity contract for reentrancy', emoji: '🛡️' },
    { text: 'Find yield farming opportunities on DeFi', emoji: '🌾' },
    { text: 'Optimize batch payroll gas costs', emoji: '⛽' },
    { text: 'Check DAO governance compliance', emoji: '⚖️' },
    { text: 'Deploy and verify a smart contract', emoji: '🚀' },
    { text: 'Track wallet analytics and portfolio', emoji: '📊' },
    { text: 'Generate quarterly tax report', emoji: '🧾' },
    { text: 'Monitor security threats in real-time', emoji: '🔒' },
    { text: 'Analyze NFT collection floor price', emoji: '🖼️' },
    { text: 'Automate recurring token transfers', emoji: '🔄' },
];

const PAYROLL_PROMPTS = [
    { text: 'Pay Alice 500 AlphaUSD', emoji: '💸' },
    { text: 'Pay all employees their monthly salary', emoji: '👥' },
    { text: 'Send 100 AlphaUSD to 0x33F7...0793', emoji: '📤' },
    { text: 'Schedule monthly payroll on the 1st', emoji: '📅' },
    { text: 'Pay Alice 100 and Bob 200 AlphaUSD', emoji: '💰' },
    { text: 'Upload payroll CSV file', emoji: '📋' },
    { text: 'Pay team bonus when token price hits $1.05', emoji: '🎯' },
    { text: 'How do I set up ZK shielded payroll?', emoji: '🔐' },
];

function SuggestedPrompts({ onSelect, variant = 'agent' }: SuggestedPromptsProps) {
    const prompts = variant === 'payroll' ? PAYROLL_PROMPTS : AGENT_PROMPTS;

    // Random rotate: pick 4 from the pool, stable per mount
    const displayed = useMemo(() => {
        const shuffled = [...prompts].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 4);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const accentColor = variant === 'payroll' ? 'emerald' : 'indigo';

    return (
        <div className="mt-4 mb-2 animate-in fade-in duration-500">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wider mb-3 ml-0.5">
                {variant === 'payroll' ? 'Quick actions' : 'Suggested tasks'}
            </p>
            <div className="flex flex-wrap gap-2">
                {displayed.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        className={`group px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-${accentColor}-500/20 hover:bg-${accentColor}-500/[0.03] transition-all duration-150 text-left flex items-center gap-2`}
                    >
                        <span className="text-base shrink-0">{prompt.emoji}</span>
                        <span className={`text-xs text-slate-500 group-hover:text-${accentColor}-300 transition-colors`}>{prompt.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default React.memo(SuggestedPrompts);
