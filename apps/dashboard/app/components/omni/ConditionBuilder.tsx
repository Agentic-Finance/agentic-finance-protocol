'use client';

import React, { useCallback, useState } from 'react';
import { XMarkIcon, PlusIcon, ChevronRightIcon } from '@/app/components/icons';

export interface Condition {
    id: string;
    type: 'price_feed' | 'tvl_threshold' | 'date_time' | 'wallet_balance' | 'webhook';
    param: string;
    operator: '>=' | '<=' | '==' | '>' | '<';
    value: string;
}

interface ConditionBuilderProps {
    conditions: Condition[];
    setConditions: React.Dispatch<React.SetStateAction<Condition[]>>;
    conditionLogic: 'AND' | 'OR';
    setConditionLogic: React.Dispatch<React.SetStateAction<'AND' | 'OR'>>;
    recurringMode: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    setRecurringMode: React.Dispatch<React.SetStateAction<'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>>;
    onClose: () => void;
}

const CONDITION_TYPES = [
    { value: 'date_time', label: 'Schedule', desc: 'Run on a specific date', color: 'var(--agt-blue)' },
    { value: 'wallet_balance', label: 'Balance', desc: 'When wallet has funds', color: 'var(--agt-mint)' },
    { value: 'price_feed', label: 'Price', desc: 'When token hits target', color: 'var(--agt-orange)' },
    { value: 'webhook', label: 'Webhook', desc: 'External API trigger', color: 'var(--agt-pink)' },
];

const OPERATORS: { value: string; label: string }[] = [
    { value: '>=', label: 'at least' },
    { value: '<=', label: 'at most' },
    { value: '==', label: 'exactly' },
    { value: '>', label: 'above' },
    { value: '<', label: 'below' },
];

const PRESETS = [
    {
        title: 'Monthly payroll',
        desc: '1st of every month',
        conditions: [{ type: 'date_time' as const, param: '1st of month', operator: '>=' as const, value: '2026-04-01' }],
        recurring: 'monthly' as const,
        color: 'var(--agt-blue)',
    },
    {
        title: 'Price trigger',
        desc: 'When AlphaUSD >= $1.05',
        conditions: [{ type: 'price_feed' as const, param: 'AlphaUSD', operator: '>=' as const, value: '$1.05' }],
        recurring: 'once' as const,
        color: 'var(--agt-orange)',
    },
    {
        title: 'Treasury check',
        desc: 'When balance >= $50K',
        conditions: [{ type: 'wallet_balance' as const, param: '0xTreasury', operator: '>=' as const, value: '$50,000' }],
        recurring: 'once' as const,
        color: 'var(--agt-mint)',
    },
    {
        title: 'Weekly payroll',
        desc: 'Every Friday',
        conditions: [{ type: 'date_time' as const, param: 'Every Friday', operator: '>=' as const, value: '2026-03-28' }],
        recurring: 'weekly' as const,
        color: '#a78bfa',
    },
];

const FREQUENCIES = [
    { value: 'once', label: 'Once', desc: 'Single trigger' },
    { value: 'daily', label: 'Daily', desc: 'Every day' },
    { value: 'weekly', label: 'Weekly', desc: 'Every 7 days' },
    { value: 'biweekly', label: 'Bi-weekly', desc: 'Every 14 days' },
    { value: 'monthly', label: 'Monthly', desc: 'Every 30 days' },
] as const;

function ConditionBuilder({ conditions, setConditions, conditionLogic, setConditionLogic, recurringMode, setRecurringMode, onClose }: ConditionBuilderProps) {
    const [showPresets, setShowPresets] = useState(true);

    const addCondition = useCallback((type?: string) => {
        setConditions(prev => [...prev, {
            id: crypto.randomUUID(),
            type: (type || 'date_time') as Condition['type'],
            param: '',
            operator: '>=',
            value: '',
        }]);
        setShowPresets(false);
    }, [setConditions]);

    const removeCondition = useCallback((id: string) => {
        setConditions(prev => prev.filter(c => c.id !== id));
    }, [setConditions]);

    const updateCondition = useCallback((id: string, field: keyof Condition, value: string) => {
        setConditions(prev => prev.map(c => c.id !== id ? c : { ...c, [field]: value }));
    }, [setConditions]);

    const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
        setConditions(preset.conditions.map(c => ({ id: crypto.randomUUID(), ...c })));
        setRecurringMode(preset.recurring);
        setShowPresets(false);
    }, [setConditions, setRecurringMode]);

    const hasFilledConditions = conditions.some(c => c.param || c.value);

    return (
        <div className="mt-4 mb-2 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>

                {/* Header */}
                <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Automation Rules</h3>
                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Set conditions &bull; Auto-trigger when matched</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}>
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Presets (if no conditions yet) */}
                {showPresets && !hasFilledConditions && (
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>Quick Start</p>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESETS.map((preset, i) => (
                                <button key={i} onClick={() => applyPreset(preset)}
                                    className="text-left p-3 rounded-xl border transition-all group hover:scale-[1.01]"
                                    style={{ borderColor: 'var(--pp-border)', background: 'var(--pp-bg-elevated)' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = preset.color}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--pp-border)'}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[12px] font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{preset.title}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{preset.desc}</p>
                                        </div>
                                        <ChevronRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: preset.color }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Conditions */}
                <div className="px-5 py-4">
                    {conditions.length > 0 && (
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--pp-text-muted)' }}>
                            When {conditionLogic === 'AND' ? 'ALL' : 'ANY'} of these are true:
                        </p>
                    )}
                    <div className="space-y-2">
                        {conditions.map((cond, idx) => {
                            const typeInfo = CONDITION_TYPES.find(t => t.value === cond.type);
                            return (
                                <div key={cond.id}>
                                    {/* Logic connector */}
                                    {idx > 0 && (
                                        <div className="flex justify-center py-1">
                                            <button onClick={() => setConditionLogic(prev => prev === 'AND' ? 'OR' : 'AND')}
                                                className="px-4 py-1 text-[10px] font-bold rounded-full transition-all hover:scale-105"
                                                style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)', border: '1px solid var(--pp-border)' }}
                                            >{conditionLogic}</button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 p-3 rounded-xl border transition-all"
                                        style={{ background: 'var(--pp-bg-elevated)', borderColor: 'var(--pp-border)' }}
                                    >
                                        {/* Type indicator */}
                                        <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: typeInfo?.color || 'var(--pp-text-muted)' }} />

                                        {/* Type select */}
                                        <select value={cond.type} onChange={e => updateCondition(cond.id, 'type', e.target.value)}
                                            className="text-[12px] font-semibold rounded-lg px-2.5 py-2 outline-none cursor-pointer min-w-[100px]"
                                            style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: typeInfo?.color || 'var(--pp-text-primary)' }}
                                        >
                                            {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>

                                        {/* Param */}
                                        <input type="text" value={cond.param} onChange={e => updateCondition(cond.id, 'param', e.target.value)}
                                            placeholder={cond.type === 'date_time' ? 'YYYY-MM-DD' : cond.type === 'wallet_balance' ? '0x...' : cond.type === 'webhook' ? 'https://...' : 'Token name'}
                                            className="text-[12px] rounded-lg px-2.5 py-2 outline-none flex-1 min-w-[100px] font-mono"
                                            style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                        />

                                        {/* Operator */}
                                        {cond.type !== 'webhook' && (
                                            <select value={cond.operator} onChange={e => updateCondition(cond.id, 'operator', e.target.value)}
                                                className="text-[12px] font-semibold rounded-lg px-2 py-2 outline-none cursor-pointer w-[90px]"
                                                style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--agt-blue)' }}
                                            >
                                                {(cond.type === 'date_time'
                                                    ? [{ value: '>=', label: 'after' }, { value: '==', label: 'on' }]
                                                    : OPERATORS
                                                ).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        )}

                                        {/* Value */}
                                        <input type="text" value={cond.value} onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                                            placeholder={cond.type === 'date_time' ? '2026-04-01' : cond.type === 'price_feed' ? '$1.05' : '$50,000'}
                                            className="text-[12px] rounded-lg px-2.5 py-2 outline-none w-[110px] font-mono"
                                            style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                        />

                                        {/* Remove */}
                                        <button onClick={() => removeCondition(cond.id)} className="p-1.5 rounded-lg transition-all hover:scale-110 flex-shrink-0"
                                            style={{ color: 'var(--pp-text-muted)' }}
                                        ><XMarkIcon className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add condition */}
                    <div className="mt-3 flex gap-2">
                        {CONDITION_TYPES.map(t => (
                            <button key={t.value} onClick={() => addCondition(t.value)}
                                className="flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all border border-dashed hover:scale-[1.02]"
                                style={{ borderColor: 'var(--pp-border)', color: 'var(--pp-text-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.color = t.color; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--pp-border)'; e.currentTarget.style.color = 'var(--pp-text-muted)'; }}
                            >+ {t.label}</button>
                        ))}
                    </div>
                </div>

                {/* Frequency selector */}
                {hasFilledConditions && (
                    <div className="px-5 py-4" style={{ borderTop: '1px solid var(--pp-border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--pp-text-muted)' }}>Frequency</p>
                        <div className="flex gap-1.5">
                            {FREQUENCIES.map(f => (
                                <button key={f.value} onClick={() => setRecurringMode(f.value)}
                                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all text-center"
                                    style={{
                                        background: recurringMode === f.value ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-1)',
                                        border: `1px solid ${recurringMode === f.value ? 'var(--agt-blue)' : 'var(--pp-border)'}`,
                                        color: recurringMode === f.value ? 'var(--agt-blue)' : 'var(--pp-text-muted)',
                                    }}
                                >{f.label}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status bar */}
                {hasFilledConditions && (
                    <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--pp-border)', background: 'var(--pp-bg-elevated)' }}>
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--agt-mint)' }} />
                        <span className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>
                            Auto-monitor active &bull; Triggers when conditions match &bull; Queues to Boardroom
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(ConditionBuilder);
