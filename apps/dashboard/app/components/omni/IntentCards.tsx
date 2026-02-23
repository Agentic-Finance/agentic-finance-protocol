import React from 'react';
import { ParsedIntent } from './types';

interface IntentCardsProps {
    liveIntents: ParsedIntent[];
    chatAnswer: string | null;
    walletAliases: Record<string, string>;
    lockedAliases: Set<string>;
    cardNotes: Record<number, string>;
    handleAliasChange: (wallet: string, newAlias: string) => void;
    handleAliasLock: (wallet: string) => void;
    handleAliasKeyDown: (wallet: string, e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleNoteChange: (indexId: number, newNote: string) => void;
}

function IntentCards({
    liveIntents, chatAnswer, walletAliases, lockedAliases, cardNotes,
    handleAliasChange, handleAliasLock, handleAliasKeyDown, handleNoteChange,
}: IntentCardsProps) {
    if (liveIntents.length === 0 || chatAnswer) {
        return null;
    }

    return (
        <div className="mt-2 flex gap-4 overflow-x-auto pb-6 cyber-scroll-x animate-in slide-in-from-top-4 fade-in duration-500 relative z-10">
            {liveIntents.map((intent, i) => {
                const isRaw = intent.isRawWallet;
                const showAliasInput = isRaw && (intent.name === 'Unknown Entity' || intent.name === 'Unknown');
                const displayAlias = walletAliases[intent.wallet] !== undefined ? walletAliases[intent.wallet] : '';
                const aliasLocked = showAliasInput && lockedAliases.has(intent.wallet);
                const initial = showAliasInput
                    ? (aliasLocked && displayAlias ? displayAlias.charAt(0).toUpperCase() : '?')
                    : (intent.name.charAt(0).toUpperCase() || '?');

                return (
                    <div key={i} className="relative min-w-[340px] p-5 rounded-2xl border backdrop-blur-xl flex flex-col bg-[#061214]/90 border-emerald-500/40 shadow-lg">
                        <div className="text-[10px] font-bold mb-4 tracking-widest flex items-center gap-2 uppercase text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500"></span>
                            Target Locked
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black shrink-0 transition-all duration-300
                                ${showAliasInput && !aliasLocked
                                    ? 'bg-amber-500/10 text-amber-400/80 border border-amber-500/25'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                }`}>
                                {initial}
                            </div>
                            <div className="flex flex-col overflow-hidden w-full">
                                {showAliasInput ? (
                                    aliasLocked ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-lg font-black tracking-wide text-white leading-tight truncate">
                                                {displayAlias || 'Anonymous'}
                                            </h4>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border shrink-0
                                                ${displayAlias
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                                    : 'text-slate-500 bg-white/5 border-white/10'}`}>
                                                {displayAlias ? '\u2713 Alias Set' : 'Anonymous'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5 w-full">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                                                <span className="text-[9px] font-bold tracking-[0.15em] text-amber-400/80 uppercase">Unrecognized Address</span>
                                            </div>
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    placeholder="Assign an alias..."
                                                    value={displayAlias}
                                                    onChange={(e) => handleAliasChange(intent.wallet, e.target.value)}
                                                    onKeyDown={(e) => handleAliasKeyDown(intent.wallet, e)}
                                                    className="w-full bg-black/50 border border-emerald-500/20 hover:border-emerald-500/35 focus:border-emerald-400/55 rounded-lg pl-3 pr-[3.75rem] py-[7px] text-sm text-white focus:outline-none placeholder:text-slate-600 font-mono tracking-wide transition-all duration-200"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleAliasLock(intent.wallet)}
                                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest px-2 py-[5px] rounded-md border transition-all duration-200
                                                        ${displayAlias
                                                            ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400/70'
                                                            : 'text-slate-500 bg-white/5 border-white/10 hover:text-slate-300 hover:bg-white/10'}`}>
                                                    {displayAlias ? 'Lock' : 'Skip'}
                                                </button>
                                            </div>
                                            <p className="text-[9px] font-mono leading-none">
                                                {displayAlias
                                                    ? <span className="text-emerald-500/60">{'\u21B5'} Enter or Lock to confirm alias</span>
                                                    : <span className="text-slate-600">{'\u21B5'} Enter or Skip to leave anonymous</span>}
                                            </p>
                                        </div>
                                    )
                                ) : (
                                    <h4 className="text-lg font-black tracking-wide truncate text-white leading-tight">
                                        {intent.name}
                                    </h4>
                                )}

                                <div className="flex items-end gap-2 mt-1">
                                    <span className="text-3xl font-mono font-black text-amber-400">{intent.amount}</span>
                                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-500/30 uppercase">{intent.token || 'ALPHAUSD'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 border-dashed">
                            <input type="text" placeholder="Add reference note... (Optional)" value={cardNotes[intent.indexId] || intent.note || ''} onChange={(e) => handleNoteChange(intent.indexId, e.target.value)} className="bg-transparent text-xs text-slate-500 w-full outline-none font-mono" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default React.memo(IntentCards);
