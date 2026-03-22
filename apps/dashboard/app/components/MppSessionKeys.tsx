'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * MPP Session Keys — "OAuth for Money"
 *
 * Session keys allow AI agents to spend funds autonomously within constraints:
 *   - Maximum token amount
 *   - Specific token only
 *   - Expiration timestamp
 *   - Bound to specific agent or service
 *
 * Similar to Tempo's session key concept but with ZK compliance integration.
 * Human creates session key → Agent uses it for micropayments → Batch settles on-chain.
 */

interface SessionKey {
    id: string;
    label: string;
    token: string;
    maxAmount: string;
    spent: string;
    expiresAt: number;
    boundTo: string; // Agent address or service URL
    status: 'active' | 'expired' | 'exhausted' | 'revoked';
    createdAt: number;
    txCount: number;
}

const STORAGE_KEY = 'agtfi_session_keys';

function loadKeys(): SessionKey[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
}

function saveKeys(keys: SessionKey[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

function MppSessionKeys({ walletAddress }: { walletAddress: string | null }) {
    const [keys, setKeys] = useState<SessionKey[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Form
    const [label, setLabel] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [boundTo, setBoundTo] = useState('');
    const [duration, setDuration] = useState('3600'); // 1 hour default

    useEffect(() => {
        const loaded = loadKeys();
        // Auto-expire
        const now = Date.now();
        const updated = loaded.map(k => {
            if (k.status === 'active' && now > k.expiresAt) return { ...k, status: 'expired' as const };
            return k;
        });
        setKeys(updated);
        saveKeys(updated);
    }, []);

    const createKey = useCallback(() => {
        if (!label || !maxAmount || !boundTo) return;

        const newKey: SessionKey = {
            id: `sk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            label,
            token: 'alphaUSD',
            maxAmount,
            spent: '0',
            expiresAt: Date.now() + parseInt(duration) * 1000,
            boundTo,
            status: 'active',
            createdAt: Date.now(),
            txCount: 0,
        };

        const updated = [newKey, ...keys];
        setKeys(updated);
        saveKeys(updated);
        setShowCreate(false);
        setLabel('');
        setMaxAmount('');
        setBoundTo('');
    }, [label, maxAmount, boundTo, duration, keys]);

    const revokeKey = useCallback((id: string) => {
        const updated = keys.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k);
        setKeys(updated);
        saveKeys(updated);
    }, [keys]);

    const activeKeys = keys.filter(k => k.status === 'active');
    const inactiveKeys = keys.filter(k => k.status !== 'active');

    const statusColor = (s: string) => {
        switch (s) {
            case 'active': return 'var(--agt-mint)';
            case 'expired': return 'var(--pp-text-muted)';
            case 'exhausted': return 'var(--agt-orange)';
            case 'revoked': return 'var(--pp-danger)';
            default: return 'var(--pp-text-muted)';
        }
    };

    const formatTime = (ms: number) => {
        const diff = ms - Date.now();
        if (diff <= 0) return 'Expired';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m left`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h left`;
        return `${Math.floor(hours / 24)}d left`;
    };

    if (!walletAddress) return null;

    return (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:opacity-90 transition-opacity"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(27, 191, 236, 0.12)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>MPP Session Keys</h3>
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>OAuth for agent payments</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeKeys.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(62, 221, 185, 0.1)', color: 'var(--agt-mint)' }}>
                            {activeKeys.length} active
                        </span>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {/* Create button */}
                    {!showCreate ? (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="w-full text-xs font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
                            style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)', border: '1px solid var(--pp-border)' }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Create Session Key
                        </button>
                    ) : (
                        <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                            <input
                                value={label} onChange={e => setLabel(e.target.value)}
                                placeholder="Label (e.g. GPT-4 API Agent)"
                                className="w-full text-xs rounded-lg px-3 py-2 outline-none" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                            />
                            <input
                                value={boundTo} onChange={e => setBoundTo(e.target.value)}
                                placeholder="Agent address or service URL"
                                className="w-full text-xs font-mono rounded-lg px-3 py-2 outline-none" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                            />
                            <div className="flex gap-2">
                                <input
                                    value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
                                    placeholder="Max amount (aUSD)"
                                    type="number" min="0" step="0.01"
                                    className="flex-1 text-xs font-mono rounded-lg px-3 py-2 outline-none" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                />
                                <select
                                    value={duration} onChange={e => setDuration(e.target.value)}
                                    className="text-xs rounded-lg px-3 py-2 outline-none" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                >
                                    <option value="900">15 min</option>
                                    <option value="3600">1 hour</option>
                                    <option value="86400">24 hours</option>
                                    <option value="604800">7 days</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={createKey} className="flex-1 text-xs font-semibold py-2 rounded-lg text-white" style={{ background: 'var(--agt-blue)' }}>Create Key</button>
                                <button onClick={() => setShowCreate(false)} className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--pp-text-muted)' }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Active keys */}
                    {activeKeys.length > 0 && (
                        <div className="space-y-1.5">
                            {activeKeys.map(key => (
                                <div key={key.id} className="rounded-lg p-3" style={{ background: 'var(--pp-surface-1)' }}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-medium" style={{ color: 'var(--pp-text-primary)' }}>{key.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono" style={{ color: statusColor(key.status) }}>{formatTime(key.expiresAt)}</span>
                                            <button onClick={() => revokeKey(key.id)} className="text-[9px] px-1.5 py-0.5 rounded hover:opacity-80" style={{ color: 'var(--pp-danger)', background: 'rgba(239,68,68,0.1)' }}>Revoke</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                                        <span>{key.spent}/{key.maxAmount} aUSD</span>
                                        <span>{key.txCount} txs</span>
                                    </div>
                                    {/* Spending progress bar */}
                                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--pp-bg-card)' }}>
                                        <div className="h-full rounded-full transition-all" style={{
                                            width: `${Math.min(100, (parseFloat(key.spent) / parseFloat(key.maxAmount)) * 100)}%`,
                                            background: 'var(--agt-blue)',
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {keys.length === 0 && !showCreate && (
                        <div className="text-center py-4">
                            <p className="text-[11px]" style={{ color: 'var(--pp-text-muted)' }}>No session keys yet. Create one to let AI agents spend within limits.</p>
                        </div>
                    )}

                    {/* Inactive keys (collapsed) */}
                    {inactiveKeys.length > 0 && (
                        <details className="text-[10px]">
                            <summary className="cursor-pointer py-1" style={{ color: 'var(--pp-text-muted)' }}>{inactiveKeys.length} inactive keys</summary>
                            <div className="mt-1 space-y-1">
                                {inactiveKeys.slice(0, 5).map(key => (
                                    <div key={key.id} className="flex items-center justify-between py-1 px-2 rounded" style={{ background: 'var(--pp-surface-1)' }}>
                                        <span className="font-mono" style={{ color: 'var(--pp-text-muted)' }}>{key.label}</span>
                                        <span style={{ color: statusColor(key.status) }}>{key.status}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    {/* How it works */}
                    <div className="rounded-lg p-3 text-[10px] space-y-1" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>
                        <p className="font-semibold" style={{ color: 'var(--pp-text-secondary)' }}>How Session Keys Work</p>
                        <p>Create scoped payment credentials for AI agents. Each key has a spending limit, expiry, and is bound to a specific service. Agents use session keys for micropayments without needing your private key.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(MppSessionKeys);
