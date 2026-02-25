'use client';

import React, { useCallback, useState } from 'react';
import { XMarkIcon, PlusIcon, BoltIcon, LightBulbIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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
    onClose: () => void;
}

const CONDITION_TYPES = [
    { value: 'price_feed', label: 'Price Feed', icon: '📈', placeholder: 'e.g. AlphaUSD' },
    { value: 'tvl_threshold', label: 'TVL Threshold', icon: '🏦', placeholder: 'Protocol name' },
    { value: 'date_time', label: 'Date / Time', icon: '📅', placeholder: 'YYYY-MM-DD or duration' },
    { value: 'wallet_balance', label: 'Wallet Balance', icon: '💰', placeholder: '0x...' },
    { value: 'webhook', label: 'Custom Webhook', icon: '🔗', placeholder: 'https://...' },
];

const OPERATORS = [
    { value: '>=', label: '≥' },
    { value: '<=', label: '≤' },
    { value: '==', label: '=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
];

// Example presets that users can click to auto-populate
const EXAMPLE_PRESETS = [
    {
        title: 'Pay when token price hits target',
        description: 'Auto-pay team bonuses when AlphaUSD reaches $1.05',
        icon: '📈',
        conditions: [{ type: 'price_feed' as const, param: 'AlphaUSD', operator: '>=' as const, value: '$1.05' }],
        logic: 'AND' as const,
    },
    {
        title: 'Scheduled payroll on date',
        description: 'Execute mass payroll on the 1st of every month',
        icon: '📅',
        conditions: [{ type: 'date_time' as const, param: '1st of month', operator: '>=' as const, value: '2026-03-01' }],
        logic: 'AND' as const,
    },
    {
        title: 'Treasury balance threshold',
        description: 'Only disburse when treasury wallet has enough funds',
        icon: '💰',
        conditions: [{ type: 'wallet_balance' as const, param: '0xTreasury...', operator: '>=' as const, value: '$50,000' }],
        logic: 'AND' as const,
    },
    {
        title: 'Multi-condition: Price + Date',
        description: 'Pay when token price is above threshold AND after a specific date',
        icon: '⚡',
        conditions: [
            { type: 'price_feed' as const, param: 'AlphaUSD', operator: '>=' as const, value: '$1.00' },
            { type: 'date_time' as const, param: 'After date', operator: '>=' as const, value: '2026-04-01' },
        ],
        logic: 'AND' as const,
    },
];

function ConditionBuilder({ conditions, setConditions, conditionLogic, setConditionLogic, onClose }: ConditionBuilderProps) {
    const [showGuide, setShowGuide] = useState(true);

    const addCondition = useCallback(() => {
        setConditions(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'price_feed',
            param: '',
            operator: '>=',
            value: '',
        }]);
        setShowGuide(false);
    }, [setConditions]);

    const removeCondition = useCallback((id: string) => {
        setConditions(prev => prev.filter(c => c.id !== id));
    }, [setConditions]);

    const updateCondition = useCallback((id: string, field: keyof Condition, value: string) => {
        setConditions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    }, [setConditions]);

    const applyPreset = useCallback((preset: typeof EXAMPLE_PRESETS[0]) => {
        const newConditions: Condition[] = preset.conditions.map(c => ({
            id: crypto.randomUUID(),
            type: c.type,
            param: c.param,
            operator: c.operator,
            value: c.value,
        }));
        setConditions(newConditions);
        setConditionLogic(preset.logic);
        setShowGuide(false);
    }, [setConditions, setConditionLogic]);

    // Check if conditions are still empty/default (user hasn't customized yet)
    const hasEmptyConditions = conditions.length <= 1 && conditions.every(c => !c.param && !c.value);

    return (
        <div className="mt-4 mb-2 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 backdrop-blur-xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <BoltIcon className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-400 tracking-wide">CONDITIONAL ENGINE</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">Set rules below - Agent auto-executes payment when conditions are met</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!showGuide && hasEmptyConditions && (
                            <button
                                onClick={() => setShowGuide(true)}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 transition-all"
                                title="Show examples"
                            >
                                <LightBulbIcon className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-rose-400 transition-all">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Guided Onboarding: Example Presets */}
                {showGuide && hasEmptyConditions && (
                    <div className="mb-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-3">
                            <LightBulbIcon className="w-3.5 h-3.5 text-amber-400/70" />
                            <span className="text-[11px] font-bold text-amber-400/70 uppercase tracking-wider">Quick Start - Choose an example or build your own</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {EXAMPLE_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => applyPreset(preset)}
                                    className="group text-left p-3.5 rounded-xl bg-[#141924]/60 border border-white/5 hover:border-amber-500/25 hover:bg-amber-500/[0.04] transition-all duration-200"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-lg shrink-0 mt-0.5">{preset.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors truncate">{preset.title}</p>
                                                <ChevronRightIcon className="w-3 h-3 text-slate-600 group-hover:text-amber-400 shrink-0 transition-colors" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{preset.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 h-px bg-white/5"></div>
                            <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">or customize below</span>
                            <div className="flex-1 h-px bg-white/5"></div>
                        </div>
                    </div>
                )}

                {/* Conditions List */}
                <div className="space-y-3">
                    {conditions.map((cond, idx) => {
                        const typeInfo = CONDITION_TYPES.find(t => t.value === cond.type);
                        return (
                            <div key={cond.id} className="relative">
                                {/* Logic connector pill between conditions */}
                                {idx > 0 && (
                                    <div className="flex justify-center -mt-1.5 mb-1.5">
                                        <button
                                            onClick={() => setConditionLogic(prev => prev === 'AND' ? 'OR' : 'AND')}
                                            className="px-3 py-0.5 text-[9px] font-black rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all tracking-widest"
                                        >
                                            {conditionLogic}
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-[#141924]/80 border border-white/5 hover:border-amber-500/10 transition-colors">
                                    {/* Condition number */}
                                    <span className="text-[9px] font-black text-amber-500/40 w-5 shrink-0">#{idx + 1}</span>

                                    {/* Type Selector */}
                                    <select
                                        value={cond.type}
                                        onChange={(e) => updateCondition(cond.id, 'type', e.target.value)}
                                        className="bg-[#06080C] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500/30 cursor-pointer appearance-none min-w-[150px]"
                                    >
                                        {CONDITION_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                        ))}
                                    </select>

                                    {/* Parameter Input */}
                                    <input
                                        type="text"
                                        value={cond.param}
                                        onChange={(e) => updateCondition(cond.id, 'param', e.target.value)}
                                        placeholder={typeInfo?.placeholder || 'Parameter...'}
                                        className="bg-[#06080C] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500/30 flex-1 min-w-[120px] placeholder:text-slate-600"
                                    />

                                    {/* Operator - hide for webhook and date types */}
                                    {cond.type !== 'webhook' && (
                                        <select
                                            value={cond.operator}
                                            onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                                            className="bg-[#06080C] border border-white/10 rounded-lg px-2 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500/30 w-[52px] text-center cursor-pointer appearance-none"
                                        >
                                            {cond.type === 'date_time'
                                                ? [{ value: '>=', label: '≥ After' }, { value: '==', label: '= On' }].map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))
                                                : OPERATORS.map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))
                                            }
                                        </select>
                                    )}

                                    {/* Value Input */}
                                    <input
                                        type="text"
                                        value={cond.value}
                                        onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                                        placeholder={
                                            cond.type === 'date_time' ? '2026-04-01'
                                            : cond.type === 'webhook' ? 'Returns truthy'
                                            : cond.type === 'price_feed' ? '$1.05'
                                            : cond.type === 'tvl_threshold' ? '$10,000,000'
                                            : '$5,000'
                                        }
                                        className="bg-[#06080C] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500/30 w-[130px] placeholder:text-slate-600"
                                    />

                                    {/* Remove button */}
                                    <button
                                        onClick={() => removeCondition(cond.id)}
                                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition-all shrink-0"
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Condition Button */}
                <button
                    onClick={addCondition}
                    className="mt-3 flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/[0.06] rounded-xl transition-all border border-dashed border-amber-500/10 hover:border-amber-500/25 w-full justify-center"
                >
                    <PlusIcon className="w-3.5 h-3.5" /> Add Condition
                </button>

                {/* Status indicator */}
                {conditions.length > 0 && conditions.some(c => c.param || c.value) && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                            <span className="text-slate-500">
                                When <span className="text-amber-400 font-bold">{conditionLogic === 'AND' ? 'ALL' : 'ANY'}</span> condition{conditions.length > 1 ? 's are' : ' is'} met → Agent will auto-execute the payroll intents
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-600 font-mono">
                            <span className="text-slate-700">💡</span>
                            Monitoring agent checks every 60 seconds. You can pause or cancel anytime.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(ConditionBuilder);
