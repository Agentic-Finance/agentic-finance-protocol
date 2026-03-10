'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatChannel } from './ChatPanel';

interface NewChannelModalProps {
    walletAddress: string;
    contacts: { name: string; wallet: string }[];
    onClose: () => void;
    onCreated: (channel: ChatChannel) => void;
}

export default function NewChannelModal({ walletAddress, contacts, onClose, onCreated }: NewChannelModalProps) {
    const [mode, setMode] = useState<'dm' | 'group'>('dm');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<{ name: string; wallet: string }[]>([]);
    const [groupName, setGroupName] = useState('');
    const [customWallet, setCustomWallet] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => searchRef.current?.focus(), 200);
    }, []);

    const filteredContacts = contacts.filter(c => {
        const query = searchQuery.toLowerCase();
        return (
            c.wallet.toLowerCase() !== walletAddress.toLowerCase() &&
            (c.name.toLowerCase().includes(query) || c.wallet.toLowerCase().includes(query)) &&
            !selectedContacts.some(s => s.wallet.toLowerCase() === c.wallet.toLowerCase())
        );
    });

    const toggleContact = (contact: { name: string; wallet: string }) => {
        if (mode === 'dm') {
            setSelectedContacts([contact]);
        } else {
            setSelectedContacts(prev => {
                const exists = prev.some(c => c.wallet.toLowerCase() === contact.wallet.toLowerCase());
                if (exists) return prev.filter(c => c.wallet.toLowerCase() !== contact.wallet.toLowerCase());
                return [...prev, contact];
            });
        }
    };

    const addCustomWallet = () => {
        if (!customWallet || !customWallet.startsWith('0x') || customWallet.length < 10) return;
        const existing = contacts.find(c => c.wallet.toLowerCase() === customWallet.toLowerCase());
        const contact = existing || { name: `${customWallet.slice(0, 6)}...${customWallet.slice(-4)}`, wallet: customWallet };

        if (mode === 'dm') {
            setSelectedContacts([contact]);
        } else {
            if (!selectedContacts.some(c => c.wallet.toLowerCase() === customWallet.toLowerCase())) {
                setSelectedContacts(prev => [...prev, contact]);
            }
        }
        setCustomWallet('');
    };

    const createChannel = useCallback(async () => {
        if (selectedContacts.length === 0) return;
        setIsCreating(true);

        try {
            const participants = [
                { wallet: walletAddress, displayName: contacts.find(c => c.wallet.toLowerCase() === walletAddress.toLowerCase())?.name || null, role: 'owner' },
                ...selectedContacts.map(c => ({ wallet: c.wallet, displayName: c.name, role: 'member' })),
            ];

            const res = await fetch('/api/chat/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: mode === 'dm' ? 'dm' : 'group',
                    name: mode === 'group' ? (groupName || `Group (${participants.length})`) : null,
                    createdBy: walletAddress,
                    participants,
                }),
            });

            const data = await res.json();
            if (data.channel) {
                // Transform to ChatChannel format
                const channel: ChatChannel = {
                    id: data.channel.id,
                    type: data.channel.type,
                    name: data.channel.name || selectedContacts[0]?.name || null,
                    avatarUrl: null,
                    agentId: null,
                    jobId: null,
                    participants: data.channel.participants?.map((p: any) => ({
                        wallet: p.wallet,
                        displayName: p.displayName,
                        role: p.role,
                    })) || participants,
                    lastMessage: null,
                    unreadCount: 0,
                    isMuted: false,
                    createdAt: data.channel.createdAt || new Date().toISOString(),
                    lastMessageAt: null,
                };
                onCreated(channel);
            }
        } catch (error) {
            console.error('[Chat] Failed to create channel:', error);
        } finally {
            setIsCreating(false);
        }
    }, [selectedContacts, mode, groupName, walletAddress, contacts, onCreated]);

    return (
        <div className="absolute inset-0 z-50 bg-[#0a0e1a]/95 backdrop-blur-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                    <h3 className="text-white font-semibold text-sm">New Conversation</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {mode === 'dm' ? 'Direct message' : 'Group chat'}
                    </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>

            {/* Mode toggle */}
            <div className="px-5 py-3 flex gap-2">
                <button
                    onClick={() => { setMode('dm'); setSelectedContacts([]); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'dm' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/[0.04] text-slate-400 border border-transparent hover:bg-white/[0.06]'}`}
                >
                    Direct Message
                </button>
                <button
                    onClick={() => { setMode('group'); setSelectedContacts([]); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'group' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-white/[0.04] text-slate-400 border border-transparent hover:bg-white/[0.06]'}`}
                >
                    Group Chat
                </button>
            </div>

            {/* Group name input */}
            {mode === 'group' && (
                <div className="px-5 pb-2">
                    <input
                        type="text"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="Group name (optional)"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-all"
                    />
                </div>
            )}

            {/* Selected contacts */}
            {selectedContacts.length > 0 && (
                <div className="px-5 pb-2 flex flex-wrap gap-1.5">
                    {selectedContacts.map(c => (
                        <span key={c.wallet} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium">
                            {c.name}
                            <button onClick={() => setSelectedContacts(prev => prev.filter(p => p.wallet !== c.wallet))} className="ml-0.5 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="px-5 pb-2">
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search contacts or paste wallet..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-all"
                    />
                </div>
            </div>

            {/* Custom wallet input */}
            <div className="px-5 pb-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customWallet}
                        onChange={e => setCustomWallet(e.target.value)}
                        placeholder="0x... (paste any wallet address)"
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 transition-all font-mono text-xs"
                        onKeyDown={e => e.key === 'Enter' && addCustomWallet()}
                    />
                    <button
                        onClick={addCustomWallet}
                        disabled={!customWallet || !customWallet.startsWith('0x')}
                        className="px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-indigo-500/20"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
                {filteredContacts.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-slate-500 text-xs">
                            {contacts.length === 0 ? 'No contacts yet. Paste a wallet address above.' : 'No matching contacts.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filteredContacts.map(contact => {
                            const isSelected = selectedContacts.some(c => c.wallet.toLowerCase() === contact.wallet.toLowerCase());
                            return (
                                <button
                                    key={contact.wallet}
                                    onClick={() => toggleContact(contact)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${isSelected ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/[0.04] border border-transparent'}`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-xs font-bold">{contact.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm text-slate-200 font-medium truncate">{contact.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono truncate">{contact.wallet}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create button */}
            <div className="p-4 border-t border-white/[0.06]">
                <button
                    onClick={createChannel}
                    disabled={selectedContacts.length === 0 || isCreating}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm hover:from-indigo-400 hover:to-violet-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isCreating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            Start {mode === 'dm' ? 'Conversation' : 'Group'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
