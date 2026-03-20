'use client';

import React from 'react';
import { useTheme, type Theme } from '../hooks/useTheme';

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
        value: 'light',
        label: 'Light',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    },
    {
        value: 'dark',
        label: 'Dark',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    },
];

/** Compact toggle for navbar/sidebar */
export function ThemeToggleCompact() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex rounded-lg p-0.5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className="p-1.5 rounded-md transition-all"
                    style={{
                        background: theme === opt.value ? 'var(--pp-surface-2)' : 'transparent',
                        color: theme === opt.value ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                    }}
                    title={opt.label}
                >
                    {opt.icon}
                </button>
            ))}
        </div>
    );
}

/** Full theme selector for onboarding/settings */
export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Appearance</h4>
            <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Choose how Agentic Finance looks to you</p>
            <div className="grid grid-cols-2 gap-4 mt-3">
                {options.map(opt => {
                    const isActive = theme === opt.value;
                    const isLight = opt.value === 'light';
                    return (
                        <button
                            key={opt.value}
                            onClick={() => setTheme(opt.value)}
                            className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:scale-[1.02]"
                            style={{
                                border: `2px solid ${isActive ? 'var(--agt-mint)' : 'var(--pp-border)'}`,
                                background: isActive ? 'color-mix(in srgb, var(--agt-mint) 5%, transparent)' : 'var(--pp-surface-1)',
                                boxShadow: isActive ? '0 0 20px color-mix(in srgb, var(--agt-mint) 15%, transparent)' : 'none',
                            }}
                        >
                            {/* Preview — mini app mockup */}
                            <div className={`w-full h-20 rounded-xl border overflow-hidden ${
                                isLight ? 'bg-white border-gray-200' : 'bg-[#0A0A0F] border-white/10'
                            }`}>
                                {/* Toolbar */}
                                <div className={`h-4 flex items-center px-2 gap-1 ${
                                    isLight ? 'bg-gray-50 border-b border-gray-100' : 'bg-white/5 border-b border-white/5'
                                }`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/70" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
                                </div>
                                {/* Content area */}
                                <div className="flex h-full">
                                    {/* Sidebar */}
                                    <div className={`w-6 h-full ${isLight ? 'bg-gray-50 border-r border-gray-100' : 'bg-white/[0.03] border-r border-white/5'}`}>
                                        <div className={`w-3 h-1 mx-auto mt-1.5 rounded-full ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />
                                        <div className={`w-3 h-1 mx-auto mt-1 rounded-full ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />
                                    </div>
                                    {/* Main */}
                                    <div className="flex-1 p-1.5 space-y-1">
                                        <div className={`h-1.5 w-3/4 rounded-full ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />
                                        <div className={`h-1.5 w-1/2 rounded-full ${isLight ? 'bg-gray-100' : 'bg-white/5'}`} />
                                        <div className="flex gap-1 mt-1">
                                            <div className={`h-3 flex-1 rounded ${isLight ? 'bg-gray-100' : 'bg-white/[0.04]'}`} />
                                            <div className={`h-3 flex-1 rounded ${isLight ? 'bg-gray-100' : 'bg-white/[0.04]'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span style={{ color: isActive ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }}>{opt.icon}</span>
                                <span className="text-sm font-semibold" style={{ color: isActive ? 'var(--agt-mint)' : 'var(--pp-text-muted)' }}>{opt.label}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default ThemeToggleCompact;
