'use client';

import React, { useMemo } from 'react';

interface SuggestedPromptsProps {
    onSelect: (prompt: string) => void;
    variant?: 'agent' | 'payroll';
    /** Pass true for brand-new users who haven't transacted yet */
    isNewUser?: boolean;
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

/** Contextual first-time prompts — guide new users step by step */
const NEW_USER_PROMPTS = [
    { text: 'Pay Alice 10 AlphaUSD', emoji: '👋', hint: 'Try your first transfer' },
    { text: 'How does ZK Shield work?', emoji: '🔐', hint: 'Learn about privacy' },
    { text: 'Send 50 AlphaUSD to 0x33F7...0793', emoji: '📤', hint: 'Pay a wallet address' },
    { text: 'Upload payroll CSV file', emoji: '📋', hint: 'Bulk import recipients' },
];

function SuggestedPrompts({ onSelect, variant = 'agent', isNewUser = false }: SuggestedPromptsProps) {
    const prompts = variant === 'payroll' ? PAYROLL_PROMPTS : AGENT_PROMPTS;

    // Random rotate: pick 4 from the pool, stable per mount
    const displayed = useMemo(() => {
        if (isNewUser && variant === 'payroll') return NEW_USER_PROMPTS;
        const shuffled = [...prompts].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 4);
    }, [isNewUser]); // eslint-disable-line react-hooks/exhaustive-deps

    const isPayroll = variant === 'payroll';

    return (
        <div className="mt-4 mb-2 animate-in fade-in duration-500">
            <p className="text-xs font-medium uppercase tracking-wider mb-3 ml-0.5" style={{ color: 'var(--pp-text-muted)' }}>
                {isNewUser ? 'Get started — try one of these' : (variant === 'payroll' ? 'Quick actions' : 'Suggested tasks')}
            </p>
            <div className="flex flex-wrap gap-2">
                {displayed.map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        className="group px-4 py-2.5 rounded-xl transition-all duration-150 text-left flex items-center gap-2"
                        style={{
                            background: isNewUser ? 'var(--pp-surface-2)' : 'var(--pp-surface-1)',
                            border: `1px solid ${isNewUser ? 'var(--agt-blue)' : 'var(--pp-border)'}`,
                            borderColor: isNewUser ? 'rgba(27,191,236,0.25)' : 'var(--pp-border)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = isPayroll ? 'var(--agt-mint)' : 'var(--agt-blue)'; e.currentTarget.style.background = 'var(--pp-surface-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = isNewUser ? 'rgba(27,191,236,0.25)' : 'var(--pp-border)'; e.currentTarget.style.background = isNewUser ? 'var(--pp-surface-2)' : 'var(--pp-surface-1)'; }}
                    >
                        <span className="text-base shrink-0">{prompt.emoji}</span>
                        <div>
                            <span className="text-xs transition-colors" style={{ color: 'var(--pp-text-secondary)' }}>{prompt.text}</span>
                            {'hint' in prompt && prompt.hint && (
                                <span className="block text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{prompt.hint}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default React.memo(SuggestedPrompts);
