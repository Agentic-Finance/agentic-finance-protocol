'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChannelList from './ChannelList';
import MessageThread from './MessageThread';
import NewChannelModal from './NewChannelModal';

export interface ChatChannel {
    id: string;
    type: 'dm' | 'group' | 'agent' | 'support';
    name: string | null;
    avatarUrl: string | null;
    agentId: string | null;
    jobId: string | null;
    participants: { wallet: string; displayName: string | null; role: string }[];
    lastMessage: {
        content: string;
        senderWallet: string;
        senderName: string | null;
        createdAt: string;
        messageType: string;
    } | null;
    unreadCount: number;
    isMuted: boolean;
    createdAt: string;
    lastMessageAt: string | null;
}

export interface ChatMessage {
    id: string;
    channelId: string;
    senderWallet: string;
    senderName: string | null;
    content: string;
    messageType: string;
    metadata: any;
    replyToId: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    editedAt: string | null;
}

interface ChatPanelProps {
    walletAddress: string;
    isOpen: boolean;
    onClose: () => void;
    contacts: { name: string; wallet: string }[];
    targetJobId?: string | null;
}

export default function ChatPanel({ walletAddress, isOpen, onClose, contacts, targetJobId }: ChatPanelProps) {
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [totalUnread, setTotalUnread] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Fetch channels
    const fetchChannels = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const res = await fetch(`/api/chat/channels?wallet=${walletAddress}`);
            const data = await res.json();
            if (data.channels) {
                setChannels(data.channels);
                setTotalUnread(data.channels.reduce((sum: number, ch: ChatChannel) => sum + ch.unreadCount, 0));
            }
        } catch (error) {
            console.error('[Chat] Failed to fetch channels:', error);
        } finally {
            setIsLoading(false);
        }
    }, [walletAddress]);

    // SSE connection for real-time updates
    useEffect(() => {
        if (!walletAddress || !isOpen) return;

        const es = new EventSource(`/api/chat/messages/stream?wallet=${walletAddress}`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'new_message') {
                    // Update channel's last message
                    setChannels(prev => {
                        const updated = prev.map(ch => {
                            if (ch.id === data.channelId) {
                                return {
                                    ...ch,
                                    lastMessage: {
                                        content: data.message.content,
                                        senderWallet: data.message.senderWallet,
                                        senderName: data.message.senderName,
                                        createdAt: data.message.createdAt,
                                        messageType: data.message.messageType,
                                    },
                                    lastMessageAt: data.message.createdAt,
                                    unreadCount: data.message.senderWallet !== walletAddress.toLowerCase() ? ch.unreadCount + 1 : ch.unreadCount,
                                };
                            }
                            return ch;
                        });
                        // Sort by last message
                        return updated.sort((a, b) => {
                            const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                            const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                            return tb - ta;
                        });
                    });
                }

                if (data.type === 'new_channel') {
                    fetchChannels();
                }
            } catch { /* ignore parse errors */ }
        };

        es.onerror = () => {
            // Reconnect after 5 seconds
            setTimeout(() => {
                if (eventSourceRef.current) eventSourceRef.current.close();
            }, 5000);
        };

        return () => {
            es.close();
            eventSourceRef.current = null;
        };
    }, [walletAddress, isOpen, fetchChannels]);

    // Mark channel as read when opened
    const handleSelectChannel = useCallback((channel: ChatChannel) => {
        setActiveChannel(channel);
        // Clear unread for this channel
        setChannels(prev => prev.map(ch =>
            ch.id === channel.id ? { ...ch, unreadCount: 0 } : ch
        ));
    }, []);

    // Initial fetch
    useEffect(() => {
        if (isOpen && walletAddress) fetchChannels();
    }, [isOpen, walletAddress, fetchChannels]);

    // Auto-select channel when targetJobId is provided (from "Chat with Agent" button)
    useEffect(() => {
        if (!targetJobId || channels.length === 0) return;
        const targetChannel = channels.find(ch => ch.jobId === targetJobId);
        if (targetChannel && activeChannel?.id !== targetChannel.id) {
            handleSelectChannel(targetChannel);
        }
    }, [targetJobId, channels, activeChannel, handleSelectChannel]);

    const handleBack = useCallback(() => {
        setActiveChannel(null);
        fetchChannels(); // Refresh unread counts
    }, [fetchChannels]);

    const handleChannelCreated = useCallback((channel: ChatChannel) => {
        setShowNewChannel(false);
        setChannels(prev => [channel, ...prev]);
        setActiveChannel(channel);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
            />

            {/* Chat Panel */}
            <div className="relative w-full max-w-[440px] h-full bg-[#0a0e1a] border-l border-white/[0.08] shadow-2xl pointer-events-auto flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0d1120]/90 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        {activeChannel && (
                            <button
                                onClick={handleBack}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                        )}
                        <div>
                            <h2 className="text-white font-semibold text-base tracking-tight">
                                {activeChannel ? (activeChannel.name || 'Direct Message') : 'Messages'}
                            </h2>
                            {!activeChannel && (
                                <p className="text-[11px] text-slate-500 font-medium">
                                    {channels.length} conversation{channels.length !== 1 ? 's' : ''}
                                    {totalUnread > 0 && <span className="text-indigo-400 ml-1">({totalUnread} unread)</span>}
                                </p>
                            )}
                            {activeChannel && (
                                <p className="text-[11px] text-slate-500 font-medium">
                                    {activeChannel.type === 'agent' ? 'Agent Channel' :
                                     activeChannel.type === 'group' ? `${activeChannel.participants.length} members` :
                                     activeChannel.participants.find(p => p.wallet !== walletAddress.toLowerCase())?.displayName ||
                                     `${activeChannel.participants.find(p => p.wallet !== walletAddress.toLowerCase())?.wallet.slice(0, 10)}...`}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!activeChannel && (
                            <button
                                onClick={() => setShowNewChannel(true)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-indigo-400 hover:text-indigo-300"
                                title="New conversation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden">
                    {activeChannel ? (
                        <MessageThread
                            channel={activeChannel}
                            walletAddress={walletAddress}
                            contacts={contacts}
                        />
                    ) : (
                        <ChannelList
                            channels={channels}
                            isLoading={isLoading}
                            walletAddress={walletAddress}
                            onSelectChannel={handleSelectChannel}
                        />
                    )}
                </div>

                {/* New Channel Modal */}
                {showNewChannel && (
                    <NewChannelModal
                        walletAddress={walletAddress}
                        contacts={contacts}
                        onClose={() => setShowNewChannel(false)}
                        onCreated={handleChannelCreated}
                    />
                )}
            </div>

            <style jsx>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
}
