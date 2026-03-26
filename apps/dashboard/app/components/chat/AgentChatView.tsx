'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AgentCard from './AgentCard';

interface Agent {
    id: string;
    name: string;
    avatarEmoji: string;
    category: string;
    basePrice: number;
    successRate: number;
    avgRating: number;
    totalJobs: number;
    isVerified: boolean;
    nativeAgentId: string | null;
    skills: string;
    ownerWallet: string;
}

interface Message {
    id: string;
    channelId: string;
    senderWallet: string;
    senderName: string | null;
    content: string;
    messageType: string;
    metadata: any;
    createdAt: string;
}

interface AgentChatViewProps {
    walletAddress: string;
}

export default function AgentChatView({ walletAddress }: AgentChatViewProps) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [newMessage, setNewMessage] = useState('');
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch agents on mount
    useEffect(() => {
        fetch('/api/marketplace/agents')
            .then(r => r.json())
            .then(data => {
                if (data.agents) setAgents(data.agents);
            })
            .catch(err => console.error('Failed to fetch agents:', err));
    }, []);

    // Poll messages when channel is active
    useEffect(() => {
        if (!activeChannelId) return;

        const fetchMessages = () => {
            fetch(`/api/chat/messages?channelId=${activeChannelId}&wallet=${walletAddress}`)
                .then(r => r.json())
                .then(data => {
                    if (data.messages) setMessages(data.messages);
                })
                .catch(err => console.error('Failed to fetch messages:', err));
        };

        fetchMessages();
        pollRef.current = setInterval(fetchMessages, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeChannelId, walletAddress]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Derive categories from agents
    const categories = ['all', ...Array.from(new Set(agents.map(a => a.category)))];

    // Filter agents
    const filteredAgents = agents.filter(a => {
        const matchesSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleSelectAgent = (agent: Agent) => {
        setSelectedAgent(agent);
        setActiveChannelId(null);
        setMessages([]);
    };

    const handleSend = useCallback(async () => {
        if (!newMessage.trim() || !selectedAgent || isExecuting) return;

        const prompt = newMessage.trim();
        setNewMessage('');

        // Optimistically add user message
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            channelId: activeChannelId || '',
            senderWallet: walletAddress.toLowerCase(),
            senderName: null,
            content: prompt,
            messageType: 'text',
            metadata: null,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setIsExecuting(true);

        try {
            const res = await fetch('/api/chat/agent-execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: selectedAgent.nativeAgentId || selectedAgent.id,
                    wallet: walletAddress,
                    prompt,
                }),
            });
            const data = await res.json();

            if (data.channelId && !activeChannelId) {
                setActiveChannelId(data.channelId);
            }
        } catch (err) {
            console.error('Failed to execute agent:', err);
            // Add error message
            setMessages(prev => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    channelId: activeChannelId || '',
                    senderWallet: 'system',
                    senderName: 'System',
                    content: 'Failed to send message. Please try again.',
                    messageType: 'system',
                    metadata: null,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsExecuting(false);
        }
    }, [newMessage, selectedAgent, isExecuting, walletAddress, activeChannelId]);

    const toggleResultExpand = (messageId: string) => {
        setExpandedResults(prev => {
            const next = new Set(prev);
            if (next.has(messageId)) next.delete(messageId);
            else next.add(messageId);
            return next;
        });
    };

    const renderMessage = (msg: Message) => {
        const isAgent = msg.senderWallet.startsWith('agent:');
        const isUser = msg.senderWallet.toLowerCase() === walletAddress.toLowerCase();
        const isSystem = msg.messageType === 'system';
        const isResult = msg.messageType === 'agent_result';
        const isTxLink = msg.messageType === 'tx_link';

        if (isSystem) {
            return (
                <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-center text-slate-500 text-xs px-3 py-1 rounded-full bg-white/[0.02]">
                        {msg.content}
                    </span>
                </div>
            );
        }

        if (isResult) {
            const isExpanded = expandedResults.has(msg.id);
            return (
                <div key={msg.id} className="flex justify-start mb-3">
                    <div className="max-w-[80%] bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                        <div className="text-xs text-indigo-300 font-medium mb-1">Agent Result</div>
                        <div className="text-sm text-slate-300 mb-2">{msg.content}</div>
                        {msg.metadata && (
                            <>
                                <button
                                    onClick={() => toggleResultExpand(msg.id)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {isExpanded ? 'Hide details' : 'Show details'}
                                </button>
                                {isExpanded && (
                                    <pre className="mt-2 p-2 rounded-lg bg-black/30 text-xs text-slate-400 overflow-x-auto max-h-60 overflow-y-auto">
                                        {JSON.stringify(msg.metadata, null, 2)}
                                    </pre>
                                )}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        if (isTxLink) {
            const meta = msg.metadata || {};
            return (
                <div key={msg.id} className="flex justify-start mb-3">
                    <div className="max-w-[80%] bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-xs text-emerald-300 font-medium mb-1">Transaction</div>
                        <div className="text-sm text-slate-300">{msg.content}</div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                meta.status === 'confirmed' ? 'bg-emerald-400' :
                                meta.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'
                            }`} />
                            <span className="capitalize">{meta.status || 'unknown'}</span>
                            {meta.txHash && (
                                <span className="text-slate-600 font-mono">
                                    {meta.txHash.slice(0, 10)}...{meta.txHash.slice(-6)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Standard text messages
        if (isUser) {
            return (
                <div key={msg.id} className="flex justify-end mb-3">
                    <div className="max-w-[80%] bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-br-sm px-4 py-2.5">
                        <p className="text-sm text-slate-200">{msg.content}</p>
                        <p className="text-[10px] text-slate-500 mt-1 text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            );
        }

        // Agent message
        return (
            <div key={msg.id} className="flex justify-start mb-3">
                <div className="max-w-[80%] bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-2.5">
                    {msg.senderName && (
                        <p className="text-[10px] text-cyan-400 font-medium mb-0.5">{msg.senderName}</p>
                    )}
                    <p className="text-sm text-slate-300">{msg.content}</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full">
            {/* LEFT PANEL — Agent List */}
            <div className="w-80 flex flex-col" style={{ borderRight: '1px solid var(--pp-border)', background: 'var(--pp-bg-secondary)' }}>
                {/* Header */}
                <div className="p-4" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                    <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--pp-text-primary)' }}>Agent Chat</h2>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Search agents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
                            style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                        />
                    </div>
                </div>

                {/* Category filter */}
                <div className="px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                    <div className="flex gap-1.5 min-w-max">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)}
                                className="text-[10px] px-2.5 py-1 rounded-full transition-all whitespace-nowrap font-medium"
                                style={{
                                    background: categoryFilter === cat ? 'var(--agt-blue)' : 'var(--pp-surface-1)',
                                    color: categoryFilter === cat ? '#fff' : 'var(--pp-text-muted)',
                                    border: `1px solid ${categoryFilter === cat ? 'var(--agt-blue)' : 'var(--pp-border)'}`,
                                }}
                            >
                                {cat === 'all' ? 'All' : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Agent list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredAgents.length === 0 ? (
                        <div className="text-center py-8 text-sm" style={{ color: 'var(--pp-text-muted)' }}>No agents found</div>
                    ) : (
                        filteredAgents.map(agent => (
                            <AgentCard key={agent.id} agent={agent} isSelected={selectedAgent?.id === agent.id} onClick={() => handleSelectAgent(agent)} />
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL — Chat */}
            <div className="flex-1 flex flex-col" style={{ background: 'var(--pp-bg-primary)' }}>
                {!selectedAgent ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-xs">
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                <svg className="w-8 h-8" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <p className="text-base font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Select an agent</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Choose from 50 specialized agents to start a conversation</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--pp-surface-2)' }}>
                                {selectedAgent.avatarEmoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm truncate" style={{ color: 'var(--pp-text-primary)' }}>{selectedAgent.name}</span>
                                    {selectedAgent.isVerified && <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--agt-blue)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>{selectedAgent.category}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-[10px]" style={{ color: 'var(--agt-mint)' }}>Online</span>
                                    </div>
                                    <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{selectedAgent.totalJobs} jobs | ★ {selectedAgent.avgRating}</span>
                                    <span className="text-[10px] font-mono" style={{ color: 'var(--agt-mint)' }}>${selectedAgent.basePrice}</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {messages.length === 0 && !isExecuting && (
                                <div className="text-center py-16">
                                    <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl" style={{ background: 'var(--pp-surface-1)' }}>
                                        {selectedAgent.avatarEmoji}
                                    </div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>Start a conversation with {selectedAgent.name}</p>
                                    <p className="text-xs mt-1 mb-4" style={{ color: 'var(--pp-text-muted)' }}>Describe what you need — the agent will execute on-chain</p>
                                    <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                                        {['Audit my contract', 'Deploy a token', 'Check vault balance', 'Create escrow'].map(s => (
                                            <button key={s} onClick={() => setNewMessage(s)} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                                style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-secondary)' }}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {messages.map(renderMessage)}
                            {isExecuting && (
                                <div className="flex justify-start mb-3">
                                    <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--agt-blue)', animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--agt-blue)', animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--agt-blue)', animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>{selectedAgent.name} is working...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area */}
                        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                            <div className="flex items-center gap-2">
                                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder={`Message ${selectedAgent.name}...`} disabled={isExecuting}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-colors disabled:opacity-50"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}
                                />
                                <button onClick={handleSend} disabled={!newMessage.trim() || isExecuting}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))' }}>
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
