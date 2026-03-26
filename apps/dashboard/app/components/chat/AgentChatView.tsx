'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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

interface Channel {
    id: string;
    type: 'dm' | 'group' | 'agent';
    name: string;
    avatar: string;
    lastMessage: string;
    lastMessageAt: string;
    unread: number;
    participants: string[];
    agentId?: string;
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
    replyToId?: string;
}

type ChatTab = 'agents' | 'direct' | 'groups';

interface AgentChatViewProps {
    walletAddress: string;
}

export default function AgentChatView({ walletAddress }: AgentChatViewProps) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState<ChatTab>('agents');
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch agents
    useEffect(() => {
        fetch('/api/marketplace/agents')
            .then(r => r.json())
            .then(data => { if (data.agents) setAgents(data.agents); })
            .catch(() => {});
    }, []);

    // Fetch channels
    useEffect(() => {
        fetch(`/api/chat/channels?wallet=${walletAddress}`)
            .then(r => r.json())
            .then(data => { if (data.channels) setChannels(data.channels); })
            .catch(() => {});
    }, [walletAddress]);

    // Poll messages
    useEffect(() => {
        const channelId = selectedChannel?.id;
        if (!channelId) return;

        const fetchMessages = () => {
            fetch(`/api/chat/messages?channelId=${channelId}&wallet=${walletAddress}`)
                .then(r => r.json())
                .then(data => { if (data.messages) setMessages(data.messages); })
                .catch(() => {});
        };

        fetchMessages();
        pollRef.current = setInterval(fetchMessages, 3000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [selectedChannel?.id, walletAddress]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Select agent → create/get channel
    const handleSelectAgent = useCallback(async (agent: Agent) => {
        setSelectedAgent(agent);
        try {
            const res = await fetch('/api/chat/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'agent',
                    agentId: agent.id,
                    createdBy: walletAddress,
                    participants: [
                        { wallet: walletAddress, role: 'owner' },
                        { wallet: `agent:${agent.id}`, displayName: agent.name, role: 'agent' },
                    ],
                }),
            });
            const data = await res.json();
            if (data.channel) {
                setSelectedChannel({ id: data.channel.id, type: 'agent', name: agent.name, avatar: agent.avatarEmoji, lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress], agentId: agent.id });
            }
        } catch (err) {
            console.error('Select agent failed:', err);
        }
    }, [walletAddress]);

    // Send message
    const handleSend = useCallback(async () => {
        if (!newMessage.trim() || isExecuting) return;
        const channelId = selectedChannel?.id;
        if (!channelId) return;

        const msgContent = newMessage;
        setNewMessage('');
        setIsExecuting(true);

        // Optimistic
        setMessages(prev => [...prev, {
            id: `temp-${Date.now()}`, channelId, senderWallet: walletAddress, senderName: 'You',
            content: msgContent, messageType: 'text', metadata: null, createdAt: new Date().toISOString(),
        }]);

        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId, wallet: walletAddress, content: msgContent, agentId: selectedAgent?.id }),
            });
        } catch {
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`, channelId, senderWallet: 'system', senderName: 'System',
                content: 'Failed to send. Please try again.', messageType: 'system', metadata: null, createdAt: new Date().toISOString(),
            }]);
        } finally {
            setIsExecuting(false);
        }
    }, [newMessage, selectedChannel, selectedAgent, isExecuting, walletAddress]);

    // File upload
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChannel) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('channelId', selectedChannel.id);
        formData.append('wallet', walletAddress);

        try {
            const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.message) setMessages(prev => [...prev, data.message]);
        } catch {}
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [selectedChannel, walletAddress]);

    // Create group
    const handleCreateGroup = useCallback(async () => {
        if (!groupName.trim()) return;
        try {
            const res = await fetch('/api/chat/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'group',
                    name: groupName,
                    createdBy: walletAddress,
                    participants: [{ wallet: walletAddress, role: 'owner' }],
                }),
            });
            const data = await res.json();
            if (data.channel) {
                setChannels(prev => [{ id: data.channel.id, type: 'group', name: groupName, avatar: '👥', lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress] }, ...prev]);
                setSelectedChannel({ id: data.channel.id, type: 'group', name: groupName, avatar: '👥', lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress] });
                setShowNewGroup(false);
                setGroupName('');
                setSelectedAgent(null);
            }
        } catch (err) {
            console.error('Create group failed:', err);
        }
    }, [groupName, walletAddress]);

    const filteredAgents = agents.filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.category.toLowerCase().includes(searchQuery.toLowerCase()));

    // Render message
    const renderMessage = (msg: Message) => {
        const isUser = msg.senderWallet.toLowerCase() === walletAddress.toLowerCase();
        const isSystem = msg.messageType === 'system';
        const isFile = msg.messageType === 'file';
        const isResult = msg.messageType === 'agent_result';

        if (isSystem) {
            return (
                <div key={msg.id} className="flex justify-center my-3">
                    <span className="text-center text-xs px-3 py-1 rounded-full" style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}>{msg.content}</span>
                </div>
            );
        }

        if (isFile && msg.metadata) {
            const meta = msg.metadata;
            const isImage = meta.mimeType?.startsWith('image/');
            return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className="max-w-[70%] rounded-2xl p-3" style={{ background: isUser ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                        {!isUser && msg.senderName && <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--agt-blue)' }}>{msg.senderName}</p>}
                        {isImage ? (
                            <img src={meta.url} alt={meta.fileName} className="rounded-lg max-w-full max-h-60 object-cover" />
                        ) : (
                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--pp-surface-2)' }}>
                                <svg className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--agt-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{meta.fileName}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{(meta.fileSize / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)', textAlign: isUser ? 'right' : 'left' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            );
        }

        if (isResult) {
            const isExpanded = expandedResults.has(msg.id);
            return (
                <div key={msg.id} className="flex justify-start mb-3">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm p-3" style={{ background: 'rgba(62,221,185,0.06)', border: '1px solid rgba(62,221,185,0.2)' }}>
                        <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--agt-mint)' }}>Agent Result</div>
                        <div className="text-sm" style={{ color: 'var(--pp-text-secondary)' }}>{msg.content}</div>
                        {msg.metadata && (
                            <>
                                <button onClick={() => { const s = new Set(expandedResults); isExpanded ? s.delete(msg.id) : s.add(msg.id); setExpandedResults(s); }}
                                    className="text-[10px] mt-1" style={{ color: 'var(--agt-blue)' }}>{isExpanded ? 'Hide details' : 'Show details'}</button>
                                {isExpanded && <pre className="mt-2 p-2 rounded-lg text-[10px] overflow-auto max-h-48" style={{ background: 'var(--pp-bg-primary)', color: 'var(--pp-text-muted)' }}>{JSON.stringify(msg.metadata, null, 2)}</pre>}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        // Standard text
        return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
                <div className={`max-w-[70%] rounded-2xl ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'} px-4 py-2.5`}
                    style={{ background: isUser ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-1)', border: `1px solid ${isUser ? 'rgba(27,191,236,0.2)' : 'var(--pp-border)'}` }}>
                    {!isUser && msg.senderName && <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--agt-blue)' }}>{msg.senderName}</p>}
                    <p className="text-sm" style={{ color: 'var(--pp-text-primary)' }}>{msg.content}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)', textAlign: isUser ? 'right' : 'left' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        );
    };

    const tabs: { key: ChatTab; label: string; icon: string }[] = [
        { key: 'agents', label: 'Agents', icon: '🤖' },
        { key: 'direct', label: 'Direct', icon: '💬' },
        { key: 'groups', label: 'Groups', icon: '👥' },
    ];

    return (
        <div className="flex h-full" style={{ background: 'var(--pp-bg-primary)' }}>
            {/* LEFT SIDEBAR */}
            <div className="w-80 flex flex-col" style={{ borderRight: '1px solid var(--pp-border)', background: 'var(--pp-bg-secondary)' }}>
                {/* Tabs */}
                <div className="flex" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className="flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                            style={{
                                color: activeTab === tab.key ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                                borderBottom: activeTab === tab.key ? '2px solid var(--agt-blue)' : '2px solid transparent',
                                background: activeTab === tab.key ? 'var(--pp-surface-1)' : 'transparent',
                            }}>
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="p-3" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                    </div>
                </div>

                {/* Content based on tab */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'agents' && (
                        <div className="p-2 space-y-1">
                            {filteredAgents.map(agent => (
                                <button key={agent.id} onClick={() => handleSelectAgent(agent)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                                    style={{
                                        background: selectedAgent?.id === agent.id ? 'var(--pp-surface-2)' : 'transparent',
                                        border: selectedAgent?.id === agent.id ? '1px solid var(--pp-border)' : '1px solid transparent',
                                    }}
                                    onMouseEnter={e => { if (selectedAgent?.id !== agent.id) e.currentTarget.style.background = 'var(--pp-surface-1)'; }}
                                    onMouseLeave={e => { if (selectedAgent?.id !== agent.id) e.currentTarget.style.background = 'transparent'; }}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--pp-surface-2)' }}>{agent.avatarEmoji}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{agent.name}</span>
                                            {agent.isVerified && <span className="text-[8px]" style={{ color: 'var(--agt-blue)' }}>✓</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{agent.category}</span>
                                            <span className="text-[10px] font-mono" style={{ color: 'var(--agt-mint)' }}>${agent.basePrice}</span>
                                        </div>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'direct' && (
                        <div className="p-2 space-y-1">
                            {channels.filter(c => c.type === 'dm').length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No conversations yet</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}>Start by chatting with an agent</p>
                                </div>
                            ) : channels.filter(c => c.type === 'dm').map(ch => (
                                <button key={ch.id} onClick={() => { setSelectedChannel(ch); setSelectedAgent(null); }}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                                    style={{ background: selectedChannel?.id === ch.id ? 'var(--pp-surface-2)' : 'transparent' }}>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))', color: '#fff' }}>
                                        {ch.name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{ch.name}</p>
                                        <p className="text-[10px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{ch.lastMessage || 'No messages yet'}</p>
                                    </div>
                                    {ch.unread > 0 && <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--agt-pink)' }}>{ch.unread}</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div className="p-2 space-y-1">
                            <button onClick={() => setShowNewGroup(!showNewGroup)}
                                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                                style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)', border: '1px dashed var(--pp-border)' }}>
                                <span className="text-lg">+</span>
                                <span className="text-sm font-medium">Create Group</span>
                            </button>
                            {showNewGroup && (
                                <div className="p-3 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <input type="text" placeholder="Group name..." value={groupName} onChange={e => setGroupName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg text-sm mb-2 outline-none" style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                    <button onClick={handleCreateGroup} className="w-full py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--agt-blue)' }}>Create</button>
                                </div>
                            )}
                            {channels.filter(c => c.type === 'group').map(ch => (
                                <button key={ch.id} onClick={() => { setSelectedChannel(ch); setSelectedAgent(null); }}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                                    style={{ background: selectedChannel?.id === ch.id ? 'var(--pp-surface-2)' : 'transparent' }}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--pp-surface-2)' }}>👥</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{ch.name}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{ch.participants.length} members</p>
                                    </div>
                                    {ch.unread > 0 && <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--agt-pink)' }}>{ch.unread}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT — Chat Area */}
            <div className="flex-1 flex flex-col">
                {!selectedChannel && !selectedAgent ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-sm">
                            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                <svg className="w-10 h-10" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--pp-text-primary)' }}>Start a Conversation</h3>
                            <p className="text-sm mt-2" style={{ color: 'var(--pp-text-muted)' }}>Chat with AI agents, team members, or create group discussions</p>
                            <div className="flex flex-wrap gap-2 justify-center mt-4">
                                {['🤖 Chat with Agent', '💬 Direct Message', '👥 Create Group'].map((s, i) => (
                                    <button key={s} onClick={() => setActiveTab(['agents', 'direct', 'groups'][i] as ChatTab)}
                                        className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                                        style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-secondary)' }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'var(--pp-surface-2)' }}>
                                {selectedAgent?.avatarEmoji || selectedChannel?.avatar || '👥'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm truncate" style={{ color: 'var(--pp-text-primary)' }}>
                                        {selectedAgent?.name || selectedChannel?.name || 'Chat'}
                                    </span>
                                    {selectedAgent?.isVerified && <svg className="w-3.5 h-3.5" style={{ color: 'var(--agt-blue)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                    {selectedChannel?.type === 'group' && <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>Group</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-[10px]" style={{ color: 'var(--agt-mint)' }}>Online</span>
                                    </div>
                                    {selectedAgent && <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{selectedAgent.totalJobs} jobs | ★ {selectedAgent.avgRating} | ${selectedAgent.basePrice}</span>}
                                    {selectedChannel?.type === 'group' && <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{selectedChannel.participants.length} members</span>}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {messages.length === 0 && !isExecuting && (
                                <div className="text-center py-16">
                                    <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl" style={{ background: 'var(--pp-surface-1)' }}>
                                        {selectedAgent?.avatarEmoji || '💬'}
                                    </div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>Start chatting</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>Send a message or file to begin</p>
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
                                            <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Typing...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                            <div className="flex items-center gap-2">
                                {/* File upload */}
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.csv" />
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                </button>
                                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder="Type a message..."
                                    disabled={isExecuting}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-colors disabled:opacity-50"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                <button onClick={handleSend} disabled={!newMessage.trim() || isExecuting}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-30"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
