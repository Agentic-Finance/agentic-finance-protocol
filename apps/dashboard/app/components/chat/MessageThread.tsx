'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatChannel, ChatMessage } from './ChatPanel';

interface MessageThreadProps {
    channel: ChatChannel;
    walletAddress: string;
    contacts: { name: string; wallet: string }[];
}

function formatMessageTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateSeparator(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getDisplayName(wallet: string, contacts: { name: string; wallet: string }[], participants: { wallet: string; displayName: string | null }[]): string {
    // Check contacts first
    const contact = contacts.find(c => c.wallet.toLowerCase() === wallet.toLowerCase());
    if (contact) return contact.name;
    // Check participants
    const participant = participants.find(p => p.wallet === wallet.toLowerCase());
    if (participant?.displayName) return participant.displayName;
    // Agent sender
    if (wallet.startsWith('agent:')) return wallet.replace('agent:', 'Agent ');
    // Truncated address
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function getAvatarColor(wallet: string): string {
    const hash = wallet.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = [
        'from-indigo-500 to-violet-500',
        'from-emerald-500 to-teal-500',
        'from-rose-500 to-pink-500',
        'from-amber-500 to-orange-500',
        'from-cyan-500 to-sky-500',
        'from-fuchsia-500 to-purple-500',
    ];
    return colors[hash % colors.length];
}

export default function MessageThread({ channel, walletAddress, contacts }: MessageThreadProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const lastMessageCountRef = useRef(0);

    // Fetch messages
    const fetchMessages = useCallback(async (cursor?: string) => {
        try {
            const url = `/api/chat/messages?channelId=${channel.id}&wallet=${walletAddress}${cursor ? `&cursor=${cursor}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.messages) {
                if (cursor) {
                    setMessages(prev => [...data.messages, ...prev]);
                } else {
                    setMessages(data.messages);
                }
                setHasMore(data.hasMore);
            }
        } catch (error) {
            console.error('[Chat] Failed to fetch messages:', error);
        } finally {
            setIsLoading(false);
        }
    }, [channel.id, walletAddress]);

    // Initial load
    useEffect(() => {
        setIsLoading(true);
        setMessages([]);
        fetchMessages();
    }, [channel.id, fetchMessages]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        lastMessageCountRef.current = messages.length;
    }, [messages.length]);

    // Poll for new messages every 3 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            if (messages.length === 0) return;
            try {
                const res = await fetch(`/api/chat/messages?channelId=${channel.id}&wallet=${walletAddress}&limit=10`);
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
                        if (newMsgs.length === 0) return prev;
                        return [...prev, ...newMsgs];
                    });
                }
            } catch { /* ignore */ }
        }, 3000);

        return () => clearInterval(interval);
    }, [channel.id, walletAddress, messages.length]);

    // Focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [channel.id]);

    // Send message
    const sendMessage = useCallback(async () => {
        if (!input.trim() || isSending) return;

        const content = input.trim();
        setInput('');
        setIsSending(true);

        // Optimistic add
        const tempId = `temp-${Date.now()}`;
        const myName = contacts.find(c => c.wallet.toLowerCase() === walletAddress.toLowerCase())?.name || null;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            channelId: channel.id,
            senderWallet: walletAddress.toLowerCase(),
            senderName: myName,
            content,
            messageType: 'text',
            metadata: null,
            replyToId: null,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            editedAt: null,
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: channel.id,
                    senderWallet: walletAddress,
                    senderName: myName,
                    content,
                }),
            });
            const data = await res.json();
            if (data.message) {
                // Replace optimistic message with real one
                setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
            }
        } catch {
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    }, [input, isSending, channel.id, walletAddress, contacts]);

    // Handle keyboard
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    };

    // Group messages by date
    const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';
    for (const msg of messages) {
        const date = new Date(msg.createdAt).toDateString();
        if (date !== currentDate) {
            currentDate = date;
            groupedMessages.push({ date: msg.createdAt, messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Load more */}
                        {hasMore && (
                            <button
                                onClick={() => fetchMessages(messages[0]?.id)}
                                className="w-full py-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Load earlier messages
                            </button>
                        )}

                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/[0.06] flex items-center justify-center mb-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                </div>
                                <p className="text-slate-500 text-xs">Send the first message</p>
                            </div>
                        )}

                        {groupedMessages.map((group, gi) => (
                            <div key={gi}>
                                {/* Date separator */}
                                <div className="flex items-center gap-3 my-4">
                                    <div className="flex-1 h-px bg-white/[0.06]" />
                                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        {formatDateSeparator(group.date)}
                                    </span>
                                    <div className="flex-1 h-px bg-white/[0.06]" />
                                </div>

                                {group.messages.map((msg, mi) => {
                                    const isMe = msg.senderWallet === walletAddress.toLowerCase();
                                    const isAgent = msg.senderWallet.startsWith('agent:');
                                    const isSystem = msg.messageType === 'system';
                                    const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
                                    const isConsecutive = prevMsg && prevMsg.senderWallet === msg.senderWallet &&
                                        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000;

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="flex justify-center my-2">
                                                <span className="text-[11px] text-slate-500 bg-white/[0.03] px-3 py-1 rounded-full">
                                                    {msg.content}
                                                </span>
                                            </div>
                                        );
                                    }

                                    if (msg.isDeleted) {
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} my-1`}>
                                                <span className="text-[11px] text-slate-600 italic px-3 py-1.5">
                                                    Message deleted
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-0.5' : 'mt-3'}`}
                                        >
                                            <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                                {/* Avatar (only show for first in group) */}
                                                {!isMe && !isConsecutive ? (
                                                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(msg.senderWallet)} flex items-center justify-center flex-shrink-0 mt-1`}>
                                                        <span className="text-white text-[10px] font-bold">
                                                            {isAgent ? '🤖' : getDisplayName(msg.senderWallet, contacts, channel.participants).charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                ) : !isMe ? (
                                                    <div className="w-7 flex-shrink-0" />
                                                ) : null}

                                                <div className="flex flex-col">
                                                    {/* Sender name (only show for first in group) */}
                                                    {!isMe && !isConsecutive && (
                                                        <span className={`text-[10px] font-semibold mb-0.5 ml-1 ${isAgent ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                            {getDisplayName(msg.senderWallet, contacts, channel.participants)}
                                                        </span>
                                                    )}

                                                    {/* Message bubble */}
                                                    <div
                                                        className={`px-3.5 py-2 text-[13px] leading-relaxed ${
                                                            isMe
                                                                ? 'bg-indigo-500/90 text-white rounded-2xl rounded-br-md'
                                                                : isAgent
                                                                    ? 'bg-emerald-500/10 text-slate-200 border border-emerald-500/20 rounded-2xl rounded-bl-md'
                                                                    : 'bg-white/[0.06] text-slate-200 rounded-2xl rounded-bl-md'
                                                        } ${msg.id.startsWith('temp-') ? 'opacity-70' : ''}`}
                                                    >
                                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                        <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? 'text-white/50' : 'text-slate-500'}`}>
                                                            <span className="text-[9px] tabular-nums">{formatMessageTime(msg.createdAt)}</span>
                                                            {msg.isEdited && <span className="text-[9px] italic">edited</span>}
                                                            {isMe && !msg.id.startsWith('temp-') && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input area */}
            <div className="border-t border-white/[0.06] p-3 bg-[#0d1120]/90 backdrop-blur-xl">
                <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 resize-none custom-scrollbar transition-all"
                            style={{ maxHeight: '120px' }}
                        />
                    </div>
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isSending}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/[0.06] disabled:text-slate-600 text-white transition-all flex-shrink-0 mb-0.5"
                    >
                        {isSending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5 ml-1">
                    Press <kbd className="px-1 py-0.5 bg-white/[0.04] rounded text-slate-500 text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-white/[0.04] rounded text-slate-500 text-[9px]">Shift+Enter</kbd> for new line
                </p>
            </div>
        </div>
    );
}
