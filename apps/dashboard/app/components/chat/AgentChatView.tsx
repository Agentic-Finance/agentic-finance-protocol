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
    const [agentCategory, setAgentCategory] = useState('all');
    const [agentPage, setAgentPage] = useState(0);
    const [showNewDM, setShowNewDM] = useState(false);
    const [dmWallet, setDmWallet] = useState('');
    const AGENTS_PER_PAGE = 10;
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [groupMembers, setGroupMembers] = useState<Array<{ wallet: string; displayName: string | null; role: string }>>([]);
    const [inviteWallet, setInviteWallet] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Close context menu on outside click
    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // Message actions
    const handleReact = async (msgId: string, emoji: string) => {
        try {
            await fetch(`/api/chat/messages/${msgId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'react', wallet: walletAddress, emoji }),
            });
            setContextMenu(null);
        } catch {}
    };

    const handleDeleteMessage = async (msgId: string) => {
        try {
            await fetch(`/api/chat/messages/${msgId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', wallet: walletAddress }),
            });
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: 'This message was deleted', messageType: 'system' } : m));
            setContextMenu(null);
        } catch {}
    };

    const handlePinMessage = async (msgId: string) => {
        try {
            await fetch(`/api/chat/messages/${msgId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pin', wallet: walletAddress }),
            });
            setContextMenu(null);
        } catch {}
    };

    const handleInviteMember = async () => {
        if (!inviteWallet.trim() || !selectedChannel) return;
        try {
            await fetch(`/api/chat/channels/${selectedChannel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'invite', wallet: walletAddress, inviteWallet: inviteWallet.trim() }),
            });
            setInviteWallet('');
        } catch {}
    };

    const handleKickMember = async (kickWallet: string) => {
        if (!selectedChannel) return;
        try {
            await fetch(`/api/chat/channels/${selectedChannel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'kick', wallet: walletAddress, kickWallet }),
            });
        } catch {}
    };

    const handleDeleteGroup = async () => {
        if (!selectedChannel) return;
        if (!confirm('Delete this group? This cannot be undone.')) return;
        try {
            await fetch(`/api/chat/channels/${selectedChannel.id}?wallet=${walletAddress}`, { method: 'DELETE' });
            setChannels(prev => prev.filter(c => c.id !== selectedChannel.id));
            setSelectedChannel(null);
            setShowGroupSettings(false);
        } catch {}
    };

    const handleInviteAgent = async (agent: Agent) => {
        if (!selectedChannel) return;
        try {
            await fetch(`/api/chat/channels/${selectedChannel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'invite', wallet: walletAddress, inviteWallet: `agent:${agent.id}`, inviteDisplayName: agent.name }),
            });
        } catch {}
    };

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
                .then(data => {
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages);
                    }
                })
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

    // Create DM with another user
    const handleCreateDM = useCallback(async () => {
        if (!dmWallet.trim()) return;
        try {
            const res = await fetch('/api/chat/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'dm',
                    createdBy: walletAddress,
                    participants: [
                        { wallet: walletAddress, role: 'owner' },
                        { wallet: dmWallet.trim(), role: 'member' },
                    ],
                }),
            });
            const data = await res.json();
            if (data.channel) {
                const shortAddr = `${dmWallet.slice(0, 6)}...${dmWallet.slice(-4)}`;
                setSelectedChannel({ id: data.channel.id, type: 'dm', name: shortAddr, avatar: '', lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress, dmWallet] });
                setChannels(prev => [{ id: data.channel.id, type: 'dm', name: shortAddr, avatar: '', lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress, dmWallet] }, ...prev]);
                setShowNewDM(false);
                setDmWallet('');
                setSelectedAgent(null);
            }
        } catch {}
    }, [dmWallet, walletAddress]);

    // Filter + paginate agents
    const categories = ['all', ...Array.from(new Set(agents.map(a => a.category)))];
    const filteredAgents = agents
        .filter(a => agentCategory === 'all' || a.category === agentCategory)
        .filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const pagedAgents = filteredAgents.slice(agentPage * AGENTS_PER_PAGE, (agentPage + 1) * AGENTS_PER_PAGE);
    const totalAgentPages = Math.ceil(filteredAgents.length / AGENTS_PER_PAGE);

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

        // Reactions
        const reactions = (msg.metadata as any)?.reactions || {};
        const reactionKeys = Object.keys(reactions);
        const isPinned = (msg.metadata as any)?.pinned;

        // Standard text
        return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group relative`}>
                <div className={`max-w-[70%] rounded-2xl ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'} px-4 py-2.5 relative`}
                    style={{ background: isUser ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-1)', border: `1px solid ${isUser ? 'rgba(27,191,236,0.2)' : 'var(--pp-border)'}` }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY }); }}>

                    {/* Pin indicator */}
                    {isPinned && <div className="text-[9px] mb-1 flex items-center gap-1" style={{ color: 'var(--agt-orange)' }}>📌 Pinned</div>}

                    {/* Reply reference */}
                    {msg.replyToId && <div className="text-[10px] px-2 py-1 mb-1 rounded-lg border-l-2" style={{ borderColor: 'var(--agt-blue)', background: 'var(--pp-surface-2)', color: 'var(--pp-text-muted)' }}>Reply to message</div>}

                    {!isUser && msg.senderName && <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--agt-blue)' }}>{msg.senderName}</p>}
                    <p className="text-sm" style={{ color: 'var(--pp-text-primary)' }}>{msg.isDeleted ? <em style={{ color: 'var(--pp-text-muted)' }}>This message was deleted</em> : msg.content}</p>

                    <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {msg.isEdited && <span className="ml-1">(edited)</span>}
                        </p>
                    </div>

                    {/* Reactions */}
                    {reactionKeys.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {reactionKeys.map(emoji => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                    className="text-[11px] px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-all hover:opacity-80"
                                    style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border)' }}>
                                    <span>{emoji}</span>
                                    <span style={{ color: 'var(--pp-text-muted)', fontSize: '9px' }}>{reactions[emoji].length}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Hover action buttons */}
                    <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 rounded-lg px-1 py-0.5" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                        {['👍', '❤️', '🔥'].map(e => (
                            <button key={e} onClick={() => handleReact(msg.id, e)} className="text-sm px-1 hover:scale-125 transition-transform">{e}</button>
                        ))}
                        <button onClick={() => setReplyTo(msg)} className="text-xs px-1 hover:opacity-80" style={{ color: 'var(--pp-text-muted)' }}>↩</button>
                        <button onClick={(e) => { e.stopPropagation(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY }); }}
                            className="text-xs px-1 hover:opacity-80" style={{ color: 'var(--pp-text-muted)' }}>⋯</button>
                    </div>
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
                        <div>
                            {/* Category pills */}
                            <div className="px-3 py-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                <div className="flex gap-1 min-w-max">
                                    {categories.map(cat => (
                                        <button key={cat} onClick={() => { setAgentCategory(cat); setAgentPage(0); }}
                                            className="text-[10px] px-2 py-1 rounded-full transition-all whitespace-nowrap font-medium capitalize"
                                            style={{
                                                background: agentCategory === cat ? 'var(--agt-blue)' : 'var(--pp-surface-1)',
                                                color: agentCategory === cat ? '#fff' : 'var(--pp-text-muted)',
                                                border: `1px solid ${agentCategory === cat ? 'var(--agt-blue)' : 'var(--pp-border)'}`,
                                            }}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Agent list (paginated) */}
                            <div className="p-2 space-y-1">
                                {pagedAgents.map(agent => (
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

                            {/* Pagination */}
                            {totalAgentPages > 1 && (
                                <div className="flex items-center justify-center gap-2 py-2 px-3" style={{ borderTop: '1px solid var(--pp-border)' }}>
                                    <button onClick={() => setAgentPage(Math.max(0, agentPage - 1))} disabled={agentPage === 0}
                                        className="text-xs px-2 py-1 rounded disabled:opacity-30" style={{ color: 'var(--pp-text-muted)' }}>Prev</button>
                                    <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{agentPage + 1}/{totalAgentPages}</span>
                                    <button onClick={() => setAgentPage(Math.min(totalAgentPages - 1, agentPage + 1))} disabled={agentPage >= totalAgentPages - 1}
                                        className="text-xs px-2 py-1 rounded disabled:opacity-30" style={{ color: 'var(--pp-text-muted)' }}>Next</button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'direct' && (
                        <div className="p-2 space-y-1">
                            {/* New DM button */}
                            <button onClick={() => setShowNewDM(!showNewDM)}
                                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                                style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)', border: '1px dashed var(--pp-border)' }}>
                                <span className="text-lg">+</span>
                                <span className="text-sm font-medium">New Message</span>
                            </button>
                            {showNewDM && (
                                <div className="p-3 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                    <input type="text" placeholder="Enter wallet address (0x...)" value={dmWallet} onChange={e => setDmWallet(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg text-sm mb-2 outline-none" style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                    <button onClick={handleCreateDM} disabled={!dmWallet.trim()} className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30" style={{ background: 'var(--agt-blue)' }}>Start Chat</button>
                                </div>
                            )}

                            {channels.filter(c => c.type === 'dm' || c.type === 'agent').length === 0 && !showNewDM ? (
                                <div className="text-center py-8 px-4">
                                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                        <svg className="w-6 h-6" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    </div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>No conversations yet</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>Send a direct message or chat with an agent</p>
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
                            {/* Group settings button */}
                            {selectedChannel?.type === 'group' && (
                                <button onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/chat/channels/${selectedChannel.id}`);
                                        const data = await res.json();
                                        if (data.channel?.participants) {
                                            setGroupMembers(data.channel.participants.map((p: any) => ({ wallet: p.wallet, displayName: p.displayName, role: p.role })));
                                        }
                                    } catch {}
                                    setShowGroupSettings(!showGroupSettings);
                                }}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                                    style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                            )}
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

                        {/* Reply bar */}
                        {replyTo && (
                            <div className="px-5 py-2 flex items-center gap-2" style={{ borderTop: '1px solid var(--pp-border)', background: 'var(--pp-surface-1)' }}>
                                <div className="flex-1 min-w-0 border-l-2 pl-2" style={{ borderColor: 'var(--agt-blue)' }}>
                                    <p className="text-[10px] font-medium" style={{ color: 'var(--agt-blue)' }}>Replying to {replyTo.senderName || 'message'}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--pp-text-muted)' }}>{replyTo.content}</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>✕</button>
                            </div>
                        )}

                        {/* Input */}
                        <div className="px-5 py-3" style={{ borderTop: replyTo ? 'none' : '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
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

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed z-[100] rounded-xl shadow-2xl py-1 min-w-[180px]"
                    style={{ left: contextMenu.x, top: contextMenu.y, background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setReplyTo(messages.find(m => m.id === contextMenu.msgId) || null); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all hover:opacity-80" style={{ color: 'var(--pp-text-secondary)' }}>
                        ↩️ Reply
                    </button>
                    <button onClick={() => handlePinMessage(contextMenu.msgId)}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all hover:opacity-80" style={{ color: 'var(--pp-text-secondary)' }}>
                        📌 Pin Message
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(messages.find(m => m.id === contextMenu.msgId)?.content || ''); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all hover:opacity-80" style={{ color: 'var(--pp-text-secondary)' }}>
                        📋 Copy Text
                    </button>
                    <div className="my-1" style={{ borderTop: '1px solid var(--pp-border)' }} />
                    <button onClick={() => handleDeleteMessage(contextMenu.msgId)}
                        className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-all hover:opacity-80" style={{ color: 'var(--agt-pink)' }}>
                        🗑 Delete
                    </button>
                </div>
            )}

            {/* Group Settings Panel */}
            {showGroupSettings && selectedChannel?.type === 'group' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowGroupSettings(false)}>
                    <div className="w-[400px] max-h-[80vh] rounded-2xl overflow-hidden" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                            <h3 className="text-base font-bold" style={{ color: 'var(--pp-text-primary)' }}>Group Settings</h3>
                            <button onClick={() => setShowGroupSettings(false)} className="text-lg" style={{ color: 'var(--pp-text-muted)' }}>✕</button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Group info */}
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Group Name</label>
                                <div className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>{selectedChannel.name}</div>
                            </div>

                            {/* Invite member */}
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Invite Member</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="0x... wallet address" value={inviteWallet} onChange={e => setInviteWallet(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                    <button onClick={handleInviteMember} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--agt-blue)' }}>Invite</button>
                                </div>
                            </div>

                            {/* Invite agent */}
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Add AI Agent</label>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {agents.slice(0, 10).map(agent => (
                                        <button key={agent.id} onClick={() => handleInviteAgent(agent)}
                                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all hover:opacity-80"
                                            style={{ background: 'var(--pp-surface-1)' }}>
                                            <span className="text-lg">{agent.avatarEmoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-medium truncate block" style={{ color: 'var(--pp-text-primary)' }}>{agent.name}</span>
                                                <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{agent.category}</span>
                                            </div>
                                            <span className="text-xs" style={{ color: 'var(--agt-mint)' }}>+ Add</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Members list */}
                            <div>
                                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Members ({groupMembers.length})</label>
                                <div className="space-y-1">
                                    {groupMembers.map(p => (
                                        <div key={p.wallet} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))', color: '#fff' }}>
                                                    {p.wallet.startsWith('agent:') ? '🤖' : (p.displayName?.[0] || p.wallet.slice(2, 4)).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-medium block" style={{ color: 'var(--pp-text-primary)' }}>
                                                        {p.displayName || (p.wallet.startsWith('agent:') ? p.wallet.replace('agent:', '') : `${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)}`)}
                                                    </span>
                                                    <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{p.role}</span>
                                                </div>
                                            </div>
                                            {p.wallet.toLowerCase() !== walletAddress.toLowerCase() && (
                                                <button onClick={() => handleKickMember(p.wallet)} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--agt-pink)' }}>Remove</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Danger zone */}
                            <div className="pt-3" style={{ borderTop: '1px solid var(--pp-border)' }}>
                                <button onClick={handleDeleteGroup} className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    Delete Group
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
