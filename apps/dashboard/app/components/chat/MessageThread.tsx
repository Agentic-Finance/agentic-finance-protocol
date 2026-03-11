'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatChannel, ChatMessage } from './ChatPanel';

const EXPLORER = 'https://explore.tempo.xyz';

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
    const contact = contacts.find(c => c.wallet.toLowerCase() === wallet.toLowerCase());
    if (contact) return contact.name;
    const participant = participants.find(p => p.wallet === wallet.toLowerCase());
    if (participant?.displayName) return participant.displayName;
    if (wallet.startsWith('agent:')) return wallet.replace('agent:', 'Agent ');
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

/** Parse /send command: "/send 50 AlphaUSD to 0x1234..." */
function parseSendCommand(text: string): { amount: number; token: string; to: string } | null {
    const match = text.match(/^\/send\s+([\d.]+)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})/i);
    if (!match) return null;
    const amount = parseFloat(match[1]);
    if (isNaN(amount) || amount <= 0) return null;
    return { amount, token: match[2], to: match[3] };
}

// ═══════════════════════════════════════
// Rich Card: Transaction
// ═══════════════════════════════════════
function TransactionCard({ metadata, timestamp }: { metadata: any; timestamp: string }) {
    const status = metadata?.status || 'pending';
    const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
        pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '⏳' },
        confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✓' },
        failed: { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: '✗' },
    };
    const s = statusColors[status] || statusColors.pending;
    const isEscrow = metadata?.type === 'escrow_locked';
    const isSettled = metadata?.type === 'payment_settled';

    return (
        <div className="bg-gradient-to-br from-[#141926] to-[#0f1420] border border-white/[0.08] rounded-xl overflow-hidden max-w-[320px]">
            {/* Top accent bar */}
            <div className={`h-0.5 ${status === 'confirmed' ? 'bg-emerald-500' : status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'}`} />

            <div className="p-3.5">
                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                            <span className="text-sm">{isEscrow ? '🔒' : isSettled ? '💰' : '💸'}</span>
                        </div>
                        <div>
                            <span className="text-white font-semibold text-xs">
                                {isEscrow ? 'Escrow Locked' : isSettled ? 'Payment Settled' : 'Payment'}
                            </span>
                            <p className="text-[9px] text-slate-500">{formatMessageTime(timestamp)}</p>
                        </div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                        {status}
                    </span>
                </div>

                {/* Amount */}
                <div className="bg-black/30 rounded-lg p-2.5 mb-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-white font-bold text-lg tabular-nums">
                            ${metadata?.amount || '0'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-medium">
                            {metadata?.token || 'AlphaUSD'}
                        </span>
                    </div>
                    {metadata?.recipientWallet && (
                        <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                            To: {metadata.recipientWallet}
                        </p>
                    )}
                </div>

                {/* TX Hash link */}
                {metadata?.txHash && (
                    <a
                        href={`${EXPLORER}/tx/${metadata.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] text-indigo-400/70 hover:text-indigo-400 font-mono transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        {metadata.txHash.slice(0, 10)}...{metadata.txHash.slice(-6)}
                    </a>
                )}

                {metadata?.note && (
                    <p className="text-[11px] text-slate-400 mt-1.5 italic">{metadata.note}</p>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Rich Card: Agent Result
// ═══════════════════════════════════════
function AgentResultCard({ content, metadata, timestamp }: { content: string; metadata: any; timestamp: string }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = content.length > 300;

    return (
        <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/15 rounded-xl overflow-hidden max-w-[340px]">
            <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-3.5">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">✨</span>
                        <span className="text-emerald-400 font-semibold text-xs">Task Result</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {metadata?.executionTime && (
                            <span className="text-[9px] text-slate-500 font-mono tabular-nums">
                                {metadata.executionTime}s
                            </span>
                        )}
                        <span className="text-[9px] text-slate-500">{formatMessageTime(timestamp)}</span>
                    </div>
                </div>

                {/* Result content */}
                <div className="bg-black/30 rounded-lg p-2.5 mb-2">
                    <p className="text-slate-300 text-[12px] leading-relaxed whitespace-pre-wrap break-words">
                        {isLong && !expanded ? content.slice(0, 300) + '...' : content}
                    </p>
                    {isLong && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="text-indigo-400 text-[10px] font-medium mt-1.5 hover:text-indigo-300 transition-colors"
                        >
                            {expanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>

                {/* AI Proof links */}
                {(metadata?.commitTxHash || metadata?.verifyTxHash) && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider">AI Proof</span>
                        </div>
                        {metadata.commitTxHash && (
                            <a href={`${EXPLORER}/tx/${metadata.commitTxHash}`} target="_blank" rel="noopener noreferrer"
                                className="text-[9px] text-violet-400/60 hover:text-violet-400 font-mono transition-colors">
                                Commit
                            </a>
                        )}
                        {metadata.verifyTxHash && (
                            <a href={`${EXPLORER}/tx/${metadata.verifyTxHash}`} target="_blank" rel="noopener noreferrer"
                                className="text-[9px] text-violet-400/60 hover:text-violet-400 font-mono transition-colors">
                                Verify
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// Send Command Preview
// ═══════════════════════════════════════
function SendCommandPreview({ parsed, onConfirm, onCancel }: {
    parsed: { amount: number; token: string; to: string };
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="mx-3 mb-2 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">💸</span>
                <span className="text-white font-semibold text-xs">Send Payment</span>
            </div>
            <div className="bg-black/30 rounded-lg p-2.5 mb-2.5">
                <div className="flex items-baseline justify-between">
                    <span className="text-white font-bold text-base tabular-nums">${parsed.amount}</span>
                    <span className="text-slate-400 text-[11px]">{parsed.token}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">
                    To: {parsed.to}
                </p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onConfirm}
                    className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold rounded-lg transition-all"
                >
                    Confirm & Send
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 text-[11px] font-medium rounded-lg transition-all border border-white/[0.08]"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default function MessageThread({ channel, walletAddress, contacts }: MessageThreadProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sendPreview, setSendPreview] = useState<{ amount: number; token: string; to: string } | null>(null);
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

    // Check for /send command as user types
    useEffect(() => {
        if (input.startsWith('/send ')) {
            const parsed = parseSendCommand(input);
            setSendPreview(parsed);
        } else {
            setSendPreview(null);
        }
    }, [input]);

    // Send message
    const sendMessage = useCallback(async () => {
        if (!input.trim() || isSending) return;

        const content = input.trim();
        setInput('');
        setSendPreview(null);
        setIsSending(true);

        // Check if this is a /send command
        const sendCmd = parseSendCommand(content);
        const messageType = sendCmd ? 'tx_link' : 'text';
        const metadata = sendCmd ? {
            amount: sendCmd.amount,
            token: sendCmd.token,
            recipientWallet: sendCmd.to,
            senderWallet: walletAddress,
            status: 'pending',
            note: `Sent via chat`,
        } : undefined;

        // Optimistic add
        const tempId = `temp-${Date.now()}`;
        const myName = contacts.find(c => c.wallet.toLowerCase() === walletAddress.toLowerCase())?.name || null;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            channelId: channel.id,
            senderWallet: walletAddress.toLowerCase(),
            senderName: myName,
            content: sendCmd ? `Sent ${sendCmd.amount} ${sendCmd.token} to ${sendCmd.to.slice(0, 6)}...${sendCmd.to.slice(-4)}` : content,
            messageType,
            metadata: metadata || null,
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
                    content: optimisticMsg.content,
                    messageType,
                    metadata,
                }),
            });
            const data = await res.json();
            if (data.message) {
                setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
            }
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    }, [input, isSending, channel.id, walletAddress, contacts]);

    // Handle /send confirm from preview
    const handleSendConfirm = useCallback(() => {
        sendMessage();
    }, [sendMessage]);

    // Handle keyboard
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (sendPreview) {
                handleSendConfirm();
            } else {
                sendMessage();
            }
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

    // Render message content based on type
    const renderMessageContent = (msg: ChatMessage, isMe: boolean) => {
        // Transaction card
        if (msg.messageType === 'tx_link' && msg.metadata) {
            return <TransactionCard metadata={msg.metadata} timestamp={msg.createdAt} />;
        }

        // Agent result card
        if (msg.messageType === 'agent_result') {
            return <AgentResultCard content={msg.content} metadata={msg.metadata} timestamp={msg.createdAt} />;
        }

        // Regular text message
        return (
            <>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? 'text-white/50' : 'text-slate-500'}`}>
                    <span className="text-[9px] tabular-nums">{formatMessageTime(msg.createdAt)}</span>
                    {msg.isEdited && <span className="text-[9px] italic">edited</span>}
                    {isMe && !msg.id.startsWith('temp-') && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                </div>
            </>
        );
    };

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
                                {channel.type === 'agent' && (
                                    <p className="text-slate-600 text-[10px] mt-1">Agent will post updates here automatically</p>
                                )}
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
                                    const isRichCard = msg.messageType === 'tx_link' || msg.messageType === 'agent_result';
                                    const prevMsg = mi > 0 ? group.messages[mi - 1] : null;
                                    const isConsecutive = prevMsg && prevMsg.senderWallet === msg.senderWallet &&
                                        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000;

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="flex justify-center my-2">
                                                <span className="text-[11px] text-slate-500 bg-white/[0.03] px-3 py-1 rounded-full max-w-[90%] truncate">
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
                                                {/* Avatar */}
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
                                                    {/* Sender name */}
                                                    {!isMe && !isConsecutive && (
                                                        <span className={`text-[10px] font-semibold mb-0.5 ml-1 ${isAgent ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                            {getDisplayName(msg.senderWallet, contacts, channel.participants)}
                                                        </span>
                                                    )}

                                                    {/* Rich card or message bubble */}
                                                    {isRichCard ? (
                                                        <div className={msg.id.startsWith('temp-') ? 'opacity-70' : ''}>
                                                            {renderMessageContent(msg, isMe)}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={`px-3.5 py-2 text-[13px] leading-relaxed ${
                                                                isMe
                                                                    ? 'bg-indigo-500/90 text-white rounded-2xl rounded-br-md'
                                                                    : isAgent
                                                                        ? 'bg-emerald-500/10 text-slate-200 border border-emerald-500/20 rounded-2xl rounded-bl-md'
                                                                        : 'bg-white/[0.06] text-slate-200 rounded-2xl rounded-bl-md'
                                                            } ${msg.id.startsWith('temp-') ? 'opacity-70' : ''}`}
                                                        >
                                                            {renderMessageContent(msg, isMe)}
                                                        </div>
                                                    )}
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

            {/* Send command preview */}
            {sendPreview && (
                <SendCommandPreview
                    parsed={sendPreview}
                    onConfirm={handleSendConfirm}
                    onCancel={() => { setInput(''); setSendPreview(null); }}
                />
            )}

            {/* Input area */}
            <div className="border-t border-white/[0.06] p-3 bg-[#0d1120]/90 backdrop-blur-xl">
                <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={channel.type === 'agent' ? "Message agent... (try /send 50 AlphaUSD to 0x...)" : "Type a message..."}
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
                    <kbd className="px-1 py-0.5 bg-white/[0.04] rounded text-slate-500 text-[9px]">Enter</kbd> send
                    {' · '}
                    <kbd className="px-1 py-0.5 bg-white/[0.04] rounded text-slate-500 text-[9px]">Shift+Enter</kbd> new line
                    {channel.type === 'agent' && (
                        <>
                            {' · '}
                            <span className="text-indigo-400/50">/send</span>
                            <span className="text-slate-600"> to pay</span>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
