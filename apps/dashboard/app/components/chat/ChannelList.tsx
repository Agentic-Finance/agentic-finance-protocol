'use client';

import React from 'react';
import type { ChatChannel } from './ChatPanel';

interface ChannelListProps {
    channels: ChatChannel[];
    isLoading: boolean;
    walletAddress: string;
    onSelectChannel: (channel: ChatChannel) => void;
}

function getChannelIcon(type: string) {
    switch (type) {
        case 'dm': return (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        );
        case 'group': return (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        );
        case 'agent': return (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>
        );
        default: return (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
        );
    }
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateMessage(content: string, maxLen = 55): string {
    if (content.length <= maxLen) return content;
    return content.slice(0, maxLen).trim() + '...';
}

function getTypeColor(type: string): string {
    switch (type) {
        case 'dm': return 'text-sky-400 bg-sky-500/10';
        case 'group': return 'text-violet-400 bg-violet-500/10';
        case 'agent': return 'text-emerald-400 bg-emerald-500/10';
        default: return 'text-slate-400 bg-slate-500/10';
    }
}

export default function ChannelList({ channels, isLoading, walletAddress, onSelectChannel }: ChannelListProps) {
    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                        <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                            <div className="h-2 bg-white/[0.04] rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">No conversations yet</h3>
                <p className="text-slate-500 text-xs leading-relaxed max-w-[220px]">
                    Start a conversation with a team member or an AI agent to begin collaborating.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto h-full custom-scrollbar">
            <div className="p-2 space-y-0.5">
                {channels.map(channel => {
                    const otherParticipant = channel.participants.find(p => p.wallet !== walletAddress.toLowerCase());
                    const displayName = channel.name || otherParticipant?.displayName || (otherParticipant ? `${otherParticipant.wallet.slice(0, 6)}...${otherParticipant.wallet.slice(-4)}` : 'Unknown');

                    return (
                        <button
                            key={channel.id}
                            onClick={() => onSelectChannel(channel)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group text-left relative"
                        >
                            {/* Avatar */}
                            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(channel.type)}`}>
                                {channel.avatarUrl ? (
                                    <img src={channel.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    getChannelIcon(channel.type)
                                )}
                                {/* Online indicator for agents */}
                                {channel.type === 'agent' && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0e1a]" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-sm font-medium truncate ${channel.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                                        {displayName}
                                    </span>
                                    {channel.lastMessage && (
                                        <span className="text-[10px] text-slate-500 flex-shrink-0 tabular-nums">
                                            {formatTime(channel.lastMessage.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <p className={`text-xs truncate ${channel.unreadCount > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {channel.lastMessage ? (
                                            <>
                                                {channel.lastMessage.senderWallet === walletAddress.toLowerCase() && (
                                                    <span className="text-slate-500">You: </span>
                                                )}
                                                {truncateMessage(channel.lastMessage.content)}
                                            </>
                                        ) : (
                                            <span className="italic text-slate-600">No messages yet</span>
                                        )}
                                    </p>
                                    {channel.unreadCount > 0 && (
                                        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                            {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
