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
            <div className="w-80 border-r border-white/[0.06] flex flex-col bg-white/[0.01]">
                {/* Search */}
                <div className="p-3 border-b border-white/[0.06]">
                    <input
                        type="text"
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/30 transition-colors"
                    />
                </div>

                {/* Category filter */}
                <div className="px-3 py-2 border-b border-white/[0.06] overflow-x-auto">
                    <div className="flex gap-1.5 min-w-max">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`text-[10px] px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
                                    categoryFilter === cat
                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06]'
                                }`}
                            >
                                {cat === 'all' ? 'All' : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Agent list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {filteredAgents.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No agents found
                        </div>
                    ) : (
                        filteredAgents.map(agent => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                isSelected={selectedAgent?.id === agent.id}
                                onClick={() => handleSelectAgent(agent)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL — Chat */}
            <div className="flex-1 flex flex-col">
                {!selectedAgent ? (
                    /* Empty state */
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-6xl mb-4 opacity-20">&#128172;</div>
                            <p className="text-slate-500 text-lg font-medium">Select an agent to start chatting</p>
                            <p className="text-slate-600 text-sm mt-1">Choose from the agent list on the left</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-white/[0.01]">
                            <span className="text-2xl">{selectedAgent.avatarEmoji}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white truncate">{selectedAgent.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                                        {selectedAgent.category}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="text-[10px] text-emerald-400">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {messages.length === 0 && !isExecuting && (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-3">{selectedAgent.avatarEmoji}</div>
                                    <p className="text-slate-400 text-sm font-medium">Start a conversation with {selectedAgent.name}</p>
                                    <p className="text-slate-600 text-xs mt-1">Send a message to begin</p>
                                </div>
                            )}
                            {messages.map(renderMessage)}
                            {isExecuting && (
                                <div className="flex justify-start mb-3">
                                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-xs text-slate-500">{selectedAgent.name} is working...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area */}
                        <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder={`Message ${selectedAgent.name}...`}
                                    disabled={isExecuting}
                                    className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/30 transition-colors disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || isExecuting}
                                    className="px-4 py-2.5 bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-cyan-500/20"
                                >
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
