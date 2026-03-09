import React, { useState } from 'react';
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
    handleWalletAssign?: (indexId: number, wallet: string) => void;
    handleDeleteIntent?: (indexId: number) => void;
}

const isValidWallet = (w: string) => /^0x[a-fA-F0-9]{40}$/i.test(w);
const isUnresolvedWallet = (w: string) => !w || w === '0x00...00' || !isValidWallet(w);

function IntentCards({
    liveIntents, chatAnswer, walletAliases, lockedAliases, cardNotes,
    handleAliasChange, handleAliasLock, handleAliasKeyDown, handleNoteChange,
    handleWalletAssign, handleDeleteIntent,
}: IntentCardsProps) {
    const [walletInputs, setWalletInputs] = useState<Record<number, string>>({});
    const [walletLocked, setWalletLocked] = useState<Set<number>>(new Set());

    if (liveIntents.length === 0 || chatAnswer) {
        return null;
    }

    const onWalletInputChange = (indexId: number, value: string) => {
        setWalletInputs(prev => ({ ...prev, [indexId]: value }));
    };

    const onWalletLock = (indexId: number) => {
        const value = walletInputs[indexId] || '';
        if (isValidWallet(value) && handleWalletAssign) {
            handleWalletAssign(indexId, value);
            setWalletLocked(prev => { const s = new Set(prev); s.add(indexId); return s; });
        }
    };

    const onWalletKeyDown = (indexId: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') onWalletLock(indexId);
    };

    return (
        <div className="mt-2 flex gap-4 overflow-x-auto pb-6 cyber-scroll-x animate-in slide-in-from-top-4 fade-in duration-500 relative z-10">
            {liveIntents.map((intent, i) => {
                const isRaw = intent.isRawWallet;
                const showAliasInput = isRaw && (intent.name === 'Unknown Entity' || intent.name === 'Unknown');
                const displayAlias = walletAliases[intent.wallet] !== undefined ? walletAliases[intent.wallet] : '';
                const aliasLocked = showAliasInput && lockedAliases.has(intent.wallet);

                // Detect unresolved name (name exists but no valid wallet)
                const needsWallet = !isRaw && isUnresolvedWallet(intent.wallet);
                const walletInput = walletInputs[intent.indexId] || '';
                const isWalletLocked = walletLocked.has(intent.indexId);
                const walletInputValid = isValidWallet(walletInput);

                const initial = showAliasInput
                    ? (aliasLocked && displayAlias ? displayAlias.charAt(0).toUpperCase() : '?')
                    : (intent.name.charAt(0).toUpperCase() || '?');

                // Card style: amber border when wallet missing, emerald when locked
                const cardBorderClass = needsWallet && !isWalletLocked
                    ? 'border-amber-500/40'
                    : 'border-emerald-500/40';

                // Status badge
                const statusLabel = needsWallet && !isWalletLocked ? 'Wallet Missing' : 'Target Locked';
                const statusColor = needsWallet && !isWalletLocked ? 'text-amber-400' : 'text-emerald-500';
                const dotColor = needsWallet && !isWalletLocked ? 'bg-amber-400' : 'bg-emerald-500';

                return (
                    <div key={i} className={`relative min-w-[340px] p-5 rounded-2xl border bg-[#0F1319] flex flex-col bg-[#061214]/90 shadow-lg ${cardBorderClass} group/card`}>
                        {/* Delete button */}
                        {handleDeleteIntent && (
                            <button
                                onClick={() => handleDeleteIntent(intent.indexId)}
                                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg bg-rose-500/0 hover:bg-rose-500/20 text-slate-600 hover:text-rose-400 transition-all opacity-0 group-hover/card:opacity-100 z-10"
                                title="Remove recipient"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}

                        <div className={`text-[10px] font-bold mb-4 tracking-widest flex items-center gap-2 uppercase ${statusColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`}></span>
                            {statusLabel}
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black shrink-0 transition-all duration-300
                                ${(showAliasInput && !aliasLocked) || (needsWallet && !isWalletLocked)
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

                        {/* Wallet assignment input for unresolved names */}
                        {needsWallet && (
                            <div className="mb-4">
                                {isWalletLocked ? (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{'\u2713'} Wallet</span>
                                        <span className="text-xs font-mono text-emerald-300/70 truncate">{intent.wallet}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                                            <span className="text-[9px] font-bold tracking-[0.15em] text-amber-400/80 uppercase">Not in contacts — assign wallet</span>
                                        </div>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                placeholder="0x... wallet address"
                                                value={walletInput}
                                                onChange={(e) => onWalletInputChange(intent.indexId, e.target.value)}
                                                onKeyDown={(e) => onWalletKeyDown(intent.indexId, e)}
                                                className={`w-full bg-black/50 border rounded-lg pl-3 pr-[3.75rem] py-[7px] text-sm text-white focus:outline-none placeholder:text-slate-600 font-mono tracking-wide transition-all duration-200
                                                    ${walletInput && !walletInputValid
                                                        ? 'border-red-500/40 focus:border-red-400/60'
                                                        : walletInputValid
                                                            ? 'border-emerald-500/40 focus:border-emerald-400/60'
                                                            : 'border-amber-500/20 hover:border-amber-500/35 focus:border-amber-400/55 animate-pulse-border'
                                                    }`}
                                            />
                                            <button
                                                onClick={() => onWalletLock(intent.indexId)}
                                                disabled={!walletInputValid}
                                                className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest px-2 py-[5px] rounded-md border transition-all duration-200
                                                    ${walletInputValid
                                                        ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400/70 cursor-pointer'
                                                        : 'text-slate-600 bg-white/5 border-white/10 cursor-not-allowed'}`}>
                                                Lock
                                            </button>
                                        </div>
                                        <p className="text-[9px] font-mono leading-none">
                                            {walletInput && !walletInputValid
                                                ? <span className="text-red-400/70">Invalid address — must be 0x + 40 hex chars</span>
                                                : walletInputValid
                                                    ? <span className="text-emerald-500/60">{'\u21B5'} Enter or Lock to confirm wallet</span>
                                                    : <span className="text-slate-600">Paste or type the recipient wallet address</span>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

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
