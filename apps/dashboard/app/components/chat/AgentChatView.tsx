'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

// --- Types ---

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

interface CanvasItem {
    id: string;
    type: 'user' | 'agent' | 'system' | 'card';
    agentName?: string;
    agentEmoji?: string;
    content: string;
    cardType?: 'transaction' | 'deploy' | 'audit' | 'payment' | 'escrow' | 'info';
    cardData?: any;
    timestamp: string;
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

type Mode = 'canvas' | 'messages';
type MsgTab = 'direct' | 'groups';

interface Props {
    walletAddress: string;
}

// --- Agent Dock ---
function AgentDock({ agents, onSelect }: { agents: Agent[]; onSelect: (a: Agent) => void }) {
    const recent = agents.slice(0, 6);
    return (
        <div className="flex items-center gap-1 px-2">
            {recent.map(a => (
                <button key={a.id} onClick={() => onSelect(a)} title={a.name}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-110 hover:shadow-lg"
                    style={{ background: 'var(--pp-surface-2)' }}>
                    {a.avatarEmoji}
                </button>
            ))}
            <div className="w-px h-6 mx-1" style={{ background: 'var(--pp-border)' }} />
            <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{agents.length} agents</span>
        </div>
    );
}

// --- Interactive Card ---
function InteractiveCard({ item }: { item: CanvasItem }) {
    if (item.cardType === 'transaction') {
        return (
            <div className="rounded-xl p-4 my-2 max-w-lg" style={{ background: 'rgba(62,221,185,0.06)', border: '1px solid rgba(62,221,185,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(62,221,185,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--agt-mint)' }}>Transaction {item.cardData?.status || 'Confirmed'}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{item.cardData?.txHash?.slice(0, 12)}...{item.cardData?.txHash?.slice(-8)}</p>
                    </div>
                </div>
                {item.cardData?.amount && <p className="text-lg font-bold" style={{ color: 'var(--pp-text-primary)' }}>{item.cardData.amount}</p>}
                <div className="flex gap-2 mt-3">
                    <button className="text-[10px] px-3 py-1.5 rounded-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-blue)' }}>View on Explorer</button>
                </div>
            </div>
        );
    }

    if (item.cardType === 'deploy') {
        return (
            <div className="rounded-xl p-4 my-2 max-w-lg" style={{ background: 'rgba(255,45,135,0.06)', border: '1px solid rgba(255,45,135,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🚀</span>
                    <p className="text-xs font-semibold" style={{ color: 'var(--agt-pink)' }}>Contract Deployed</p>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>{item.cardData?.name || 'Contract'}</p>
                <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--pp-text-muted)' }}>{item.cardData?.address}</p>
                <div className="flex gap-2 mt-3">
                    <button className="text-[10px] px-3 py-1.5 rounded-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-blue)' }}>View Contract</button>
                    <button className="text-[10px] px-3 py-1.5 rounded-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-mint)' }}>Verify Source</button>
                </div>
            </div>
        );
    }

    if (item.cardType === 'audit') {
        return (
            <div className="rounded-xl p-4 my-2 max-w-lg" style={{ background: 'rgba(27,191,236,0.06)', border: '1px solid rgba(27,191,236,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔍</span>
                    <p className="text-xs font-semibold" style={{ color: 'var(--agt-blue)' }}>Security Audit</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                    {[{ label: 'Critical', count: item.cardData?.critical || 0, color: '#EF4444' }, { label: 'Medium', count: item.cardData?.medium || 0, color: '#F59E0B' }, { label: 'Low', count: item.cardData?.low || 0, color: '#3EDDB9' }].map(s => (
                        <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                            <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                            <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Generic info card
    return (
        <div className="rounded-xl p-3 my-2 max-w-lg" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
            <p className="text-sm" style={{ color: 'var(--pp-text-secondary)' }}>{item.content}</p>
        </div>
    );
}

// --- Main Component ---
export default function AgentChatView({ walletAddress }: Props) {
    const [mode, setMode] = useState<Mode>('canvas');
    const [agents, setAgents] = useState<Agent[]>([]);
    const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [msgTab, setMsgTab] = useState<MsgTab>('direct');
    const [showNewDM, setShowNewDM] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [dmWallet, setDmWallet] = useState('');
    const [groupName, setGroupName] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch agents
    useEffect(() => {
        fetch('/api/marketplace/agents').then(r => r.json()).then(d => { if (d.agents) setAgents(d.agents); }).catch(() => {});
    }, []);

    // Fetch channels
    useEffect(() => {
        if (mode !== 'messages') return;
        fetch(`/api/chat/channels?wallet=${walletAddress}`).then(r => r.json()).then(d => { if (d.channels) setChannels(d.channels); }).catch(() => {});
    }, [walletAddress, mode]);

    // Poll messages
    useEffect(() => {
        if (!selectedChannel) return;
        const fetchMsgs = () => {
            fetch(`/api/chat/messages?channelId=${selectedChannel.id}&wallet=${walletAddress}`)
                .then(r => r.json()).then(d => { if (d.messages?.length > 0) setMessages(d.messages); }).catch(() => {});
        };
        fetchMsgs();
        pollRef.current = setInterval(fetchMsgs, 3000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [selectedChannel?.id, walletAddress]);

    // Auto scroll
    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [canvasItems, messages]);

    // --- Canvas: Send command ---
    const handleCanvasSend = useCallback(async () => {
        if (!input.trim() || isProcessing) return;
        const userMsg = input;
        setInput('');

        // Add user message
        setCanvasItems(prev => [...prev, { id: `u-${Date.now()}`, type: 'user', content: userMsg, timestamp: new Date().toISOString() }]);
        setIsProcessing(true);

        try {
            // Route to agent via AI
            const res = await fetch('/api/chat/agent-execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg, wallet: walletAddress }),
            });
            const data = await res.json();

            if (data.result) {
                const agentInfo = agents.find(a => a.id === data.agentId || a.nativeAgentId === data.agentId);

                // Determine card type
                let cardType: CanvasItem['cardType'] = undefined;
                let cardData: any = undefined;
                const content = typeof data.result === 'string' ? data.result : (data.result.summary || data.result.message || JSON.stringify(data.result));

                if (data.result.txHash) {
                    cardType = 'transaction';
                    cardData = { txHash: data.result.txHash, amount: data.result.amount, status: 'Confirmed' };
                } else if (data.result.contractAddress) {
                    cardType = 'deploy';
                    cardData = { name: data.result.name, address: data.result.contractAddress };
                } else if (data.result.critical !== undefined || data.result.findings) {
                    cardType = 'audit';
                    cardData = { critical: data.result.critical || 0, medium: data.result.medium || 0, low: data.result.low || 0 };
                }

                setCanvasItems(prev => [...prev, {
                    id: `a-${Date.now()}`,
                    type: cardType ? 'card' : 'agent',
                    agentName: agentInfo?.name || data.agentId || 'Agent',
                    agentEmoji: agentInfo?.avatarEmoji || '🤖',
                    content,
                    cardType,
                    cardData,
                    timestamp: new Date().toISOString(),
                }]);
            } else if (data.error) {
                setCanvasItems(prev => [...prev, { id: `e-${Date.now()}`, type: 'system', content: data.error, timestamp: new Date().toISOString() }]);
            }
        } catch {
            setCanvasItems(prev => [...prev, { id: `e-${Date.now()}`, type: 'system', content: 'Failed to process. Try again.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsProcessing(false);
        }
    }, [input, isProcessing, walletAddress, agents]);

    // --- Messages: Send ---
    const handleMsgSend = useCallback(async () => {
        if (!input.trim() || !selectedChannel || isProcessing) return;
        const content = input;
        setInput('');
        setIsProcessing(true);

        setMessages(prev => [...prev, { id: `t-${Date.now()}`, channelId: selectedChannel.id, senderWallet: walletAddress, senderName: 'You', content, messageType: 'text', metadata: null, createdAt: new Date().toISOString() }]);

        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: selectedChannel.id, wallet: walletAddress, content }),
            });
        } catch {}
        setIsProcessing(false);
    }, [input, selectedChannel, isProcessing, walletAddress]);

    // --- Create DM ---
    const handleCreateDM = async () => {
        if (!dmWallet.trim()) return;
        try {
            const res = await fetch('/api/chat/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'dm', createdBy: walletAddress, participants: [{ wallet: walletAddress }, { wallet: dmWallet.trim() }] }),
            });
            const data = await res.json();
            if (data.channel) {
                const ch: Channel = { id: data.channel.id, type: 'dm', name: `${dmWallet.slice(0, 6)}...${dmWallet.slice(-4)}`, avatar: '', lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress, dmWallet] };
                setChannels(prev => [ch, ...prev]);
                setSelectedChannel(ch);
                setShowNewDM(false);
                setDmWallet('');
            }
        } catch {}
    };

    // --- Create Group ---
    const handleCreateGroup = async () => {
        if (!groupName.trim()) return;
        try {
            const res = await fetch('/api/chat/channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'group', name: groupName, createdBy: walletAddress, participants: [{ wallet: walletAddress, role: 'owner' }] }),
            });
            const data = await res.json();
            if (data.channel) {
                const ch: Channel = { id: data.channel.id, type: 'group', name: groupName, avatar: '👥', lastMessage: '', lastMessageAt: '', unread: 0, participants: [walletAddress] };
                setChannels(prev => [ch, ...prev]);
                setSelectedChannel(ch);
                setShowNewGroup(false);
                setGroupName('');
            }
        } catch {}
    };

    // File upload
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (mode === 'canvas') {
            setCanvasItems(prev => [...prev, { id: `f-${Date.now()}`, type: 'user', content: `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, timestamp: new Date().toISOString() }]);
        }
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--pp-bg-primary)' }}>
            {/* Mode Switcher */}
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <button onClick={() => { setMode('canvas'); setSelectedChannel(null); }}
                        className="px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        style={{ background: mode === 'canvas' ? 'var(--agt-blue)' : 'transparent', color: mode === 'canvas' ? '#fff' : 'var(--pp-text-muted)', borderRadius: mode === 'canvas' ? '10px' : '0' }}>
                        <Image src="/logo-v2.png" alt="" width={16} height={16} style={{ borderRadius: 4 }} /> Canvas
                    </button>
                    <button onClick={() => setMode('messages')}
                        className="px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        style={{ background: mode === 'messages' ? 'var(--agt-blue)' : 'transparent', color: mode === 'messages' ? '#fff' : 'var(--pp-text-muted)', borderRadius: mode === 'messages' ? '10px' : '0' }}>
                        💬 Messages
                    </button>
                </div>
                {mode === 'canvas' && <AgentDock agents={agents} onSelect={(a) => setInput(`@${a.name} `)} />}
            </div>

            {/* === CANVAS MODE === */}
            {mode === 'canvas' && (
                <div className="flex-1 flex flex-col">
                    {/* Canvas content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {canvasItems.length === 0 && !isProcessing && (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center max-w-md">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                        <Image src="/logo-v2.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--pp-text-primary)' }}>Agent Canvas</h3>
                                    <p className="text-sm mb-6" style={{ color: 'var(--pp-text-muted)' }}>Type a command — AI routes to the right agent automatically</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {[
                                            { text: 'Deploy a token called MoonCoin', icon: '🚀' },
                                            { text: 'Audit contract 0x6A46...Fab', icon: '🔍' },
                                            { text: 'Send 100 AlphaUSD to Alice', icon: '💸' },
                                            { text: 'Check vault balance', icon: '🏦' },
                                            { text: 'Create escrow for developer', icon: '🔐' },
                                            { text: 'Start a payment stream', icon: '📡' },
                                        ].map(s => (
                                            <button key={s.text} onClick={() => setInput(s.text)}
                                                className="text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                                                style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-secondary)' }}>
                                                <span>{s.icon}</span> {s.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {canvasItems.map(item => (
                            <div key={item.id} className={`mb-4 ${item.type === 'user' ? 'flex justify-end' : item.type === 'system' ? 'flex justify-center' : ''}`}>
                                {item.type === 'user' && (
                                    <div className="max-w-[70%] rounded-2xl rounded-br-sm px-4 py-2.5" style={{ background: 'rgba(27,191,236,0.1)', border: '1px solid rgba(27,191,236,0.2)' }}>
                                        <p className="text-sm" style={{ color: 'var(--pp-text-primary)' }}>{item.content}</p>
                                        <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--pp-text-muted)' }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                )}

                                {item.type === 'agent' && (
                                    <div className="max-w-[80%]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{item.agentEmoji}</span>
                                            <span className="text-xs font-semibold" style={{ color: 'var(--agt-blue)' }}>{item.agentName}</span>
                                            <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="rounded-2xl rounded-bl-sm px-4 py-2.5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                            <p className="text-sm" style={{ color: 'var(--pp-text-primary)' }}>{item.content}</p>
                                        </div>
                                    </div>
                                )}

                                {item.type === 'card' && (
                                    <div className="max-w-[80%]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{item.agentEmoji}</span>
                                            <span className="text-xs font-semibold" style={{ color: 'var(--agt-blue)' }}>{item.agentName}</span>
                                        </div>
                                        <InteractiveCard item={item} />
                                    </div>
                                )}

                                {item.type === 'system' && (
                                    <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>{item.content}</span>
                                )}
                            </div>
                        ))}

                        {isProcessing && (
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--agt-blue)', animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--agt-blue)', animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--agt-blue)', animationDelay: '300ms' }} />
                                </div>
                                <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Agent is working...</span>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>

                    {/* Canvas input */}
                    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                        <div className="flex items-center gap-2 max-w-3xl mx-auto">
                            <input type="file" ref={fileRef} onChange={handleFile} className="hidden" />
                            <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                                style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-muted)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </button>
                            <input type="text" value={input} onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCanvasSend(); } }}
                                placeholder="Type a command... AI routes to the right agent"
                                disabled={isProcessing}
                                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-colors disabled:opacity-50"
                                style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            <button onClick={handleCanvasSend} disabled={!input.trim() || isProcessing}
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-all disabled:opacity-30"
                                style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === MESSAGES MODE === */}
            {mode === 'messages' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-72 flex flex-col" style={{ borderRight: '1px solid var(--pp-border)', background: 'var(--pp-bg-secondary)' }}>
                        {/* Tabs */}
                        <div className="flex" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                            {([['direct', '💬', 'Direct'], ['groups', '👥', 'Groups']] as const).map(([key, icon, label]) => (
                                <button key={key} onClick={() => setMsgTab(key)}
                                    className="flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1 transition-all"
                                    style={{ color: msgTab === key ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)', borderBottom: msgTab === key ? '2px solid var(--agt-blue)' : '2px solid transparent' }}>
                                    {icon} {label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {msgTab === 'direct' && (
                                <>
                                    <button onClick={() => setShowNewDM(!showNewDM)} className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                                        style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)', border: '1px dashed var(--pp-border)' }}>
                                        <span>+</span> <span className="text-sm font-medium">New Message</span>
                                    </button>
                                    {showNewDM && (
                                        <div className="p-3 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                            <input type="text" placeholder="Wallet address (0x...)" value={dmWallet} onChange={e => setDmWallet(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg text-sm mb-2 outline-none" style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                            <button onClick={handleCreateDM} disabled={!dmWallet.trim()} className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30" style={{ background: 'var(--agt-blue)' }}>Start Chat</button>
                                        </div>
                                    )}
                                    {(() => {
                                        const dmChannels = channels.filter(c => (c.type === 'dm' || c.type === 'agent') && c.name && c.name !== 'undefined');
                                        if (dmChannels.length === 0 && !showNewDM) {
                                            return (
                                                <div className="text-center py-8 px-4">
                                                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                                        <svg className="w-6 h-6" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    </div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>No conversations yet</p>
                                                    <p className="text-xs mt-1 mb-3" style={{ color: 'var(--pp-text-muted)' }}>Start a chat with another user by wallet address, or chat with an agent in Canvas mode</p>
                                                    <button onClick={() => setShowNewDM(true)} className="text-xs px-4 py-2 rounded-lg font-medium text-white" style={{ background: 'var(--agt-blue)' }}>+ New Message</button>
                                                </div>
                                            );
                                        }
                                        return dmChannels.map(ch => (
                                            <button key={ch.id} onClick={() => setSelectedChannel(ch)}
                                                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                                                style={{ background: selectedChannel?.id === ch.id ? 'var(--pp-surface-2)' : 'transparent' }}>
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))', color: '#fff' }}>
                                                    {ch.avatar || ch.name?.[0] || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{ch.name}</p>
                                                    <p className="text-[10px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{ch.lastMessage || 'Start chatting'}</p>
                                                </div>
                                                {ch.unread > 0 && <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--agt-pink)' }}>{ch.unread}</span>}
                                            </button>
                                        ));
                                    })()}
                                </>
                            )}

                            {msgTab === 'groups' && (
                                <>
                                    <button onClick={() => setShowNewGroup(!showNewGroup)} className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                                        style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)', border: '1px dashed var(--pp-border)' }}>
                                        <span>+</span> <span className="text-sm font-medium">Create Group</span>
                                    </button>
                                    {showNewGroup && (
                                        <div className="p-3 rounded-xl" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                            <input type="text" placeholder="Group name..." value={groupName} onChange={e => setGroupName(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg text-sm mb-2 outline-none" style={{ background: 'var(--pp-bg-primary)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                            <button onClick={handleCreateGroup} disabled={!groupName.trim()} className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30" style={{ background: 'var(--agt-blue)' }}>Create</button>
                                        </div>
                                    )}
                                    {(() => {
                                        const groupChannels = channels.filter(c => c.type === 'group');
                                        if (groupChannels.length === 0 && !showNewGroup) {
                                            return (
                                                <div className="text-center py-8 px-4">
                                                    <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                                        <span className="text-2xl">👥</span>
                                                    </div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--pp-text-primary)' }}>No groups yet</p>
                                                    <p className="text-xs mt-1 mb-3" style={{ color: 'var(--pp-text-muted)' }}>Create a group to collaborate with your team and AI agents together</p>
                                                    <div className="space-y-2 text-left px-2">
                                                        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                                            <span>💡</span> <span>Invite team members by wallet address</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                                            <span>🤖</span> <span>Add AI agents to get on-chain assistance</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                                                            <span>💸</span> <span>Send payments and create escrows inline</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowNewGroup(true)} className="mt-4 text-xs px-4 py-2 rounded-lg font-medium text-white" style={{ background: 'var(--agt-blue)' }}>+ Create Group</button>
                                                </div>
                                            );
                                        }
                                        return groupChannels.map(ch => (
                                            <button key={ch.id} onClick={() => setSelectedChannel(ch)}
                                                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                                                style={{ background: selectedChannel?.id === ch.id ? 'var(--pp-surface-2)' : 'transparent' }}>
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'var(--pp-surface-2)' }}>👥</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--pp-text-primary)' }}>{ch.name}</p>
                                                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{ch.participants.length} members</p>
                                                </div>
                                            </button>
                                        ));
                                    })()}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Chat area */}
                    <div className="flex-1 flex flex-col">
                        {!selectedChannel ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center max-w-sm">
                                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--pp-surface-1)' }}>
                                        <Image src="/logo-v2.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
                                    </div>
                                    <p className="text-lg font-bold" style={{ color: 'var(--pp-text-primary)' }}>Agentic Finance Chat</p>
                                    <p className="text-sm mt-1 mb-6" style={{ color: 'var(--pp-text-muted)' }}>Connect with users, teams, and AI agents</p>

                                    <div className="grid grid-cols-2 gap-3 text-left">
                                        {[
                                            { icon: '💬', title: 'Direct Message', desc: 'Chat 1-on-1 with any wallet', action: () => { setMsgTab('direct'); setShowNewDM(true); } },
                                            { icon: '👥', title: 'Create Group', desc: 'Collaborate with your team', action: () => { setMsgTab('groups'); setShowNewGroup(true); } },
                                            { icon: '🤖', title: 'Agent Canvas', desc: 'Command 50 AI agents', action: () => setMode('canvas') },
                                            { icon: '💸', title: 'Send Payment', desc: 'Pay inline via chat', action: () => setMode('canvas') },
                                        ].map(tip => (
                                            <button key={tip.title} onClick={tip.action}
                                                className="p-3 rounded-xl text-left transition-all hover:scale-[1.02]"
                                                style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                                <span className="text-xl">{tip.icon}</span>
                                                <p className="text-xs font-semibold mt-1.5" style={{ color: 'var(--pp-text-primary)' }}>{tip.title}</p>
                                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{tip.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'var(--pp-surface-2)' }}>
                                        {selectedChannel.avatar || '💬'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-sm" style={{ color: 'var(--pp-text-primary)' }}>{selectedChannel.name}</span>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-[10px]" style={{ color: 'var(--agt-mint)' }}>Online</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-5 py-4">
                                    {messages.length === 0 && (
                                        <div className="text-center py-16">
                                            <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No messages yet. Say hello!</p>
                                        </div>
                                    )}
                                    {messages.map(msg => {
                                        const isMe = msg.senderWallet.toLowerCase() === walletAddress.toLowerCase();
                                        if (msg.messageType === 'system') {
                                            return <div key={msg.id} className="flex justify-center my-2"><span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>{msg.content}</span></div>;
                                        }
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                                                <div className={`max-w-[70%] rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} px-4 py-2.5`}
                                                    style={{ background: isMe ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-1)', border: `1px solid ${isMe ? 'rgba(27,191,236,0.2)' : 'var(--pp-border)'}` }}>
                                                    {!isMe && msg.senderName && <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--agt-blue)' }}>{msg.senderName}</p>}
                                                    <p className="text-sm" style={{ color: 'var(--pp-text-primary)' }}>{msg.content}</p>
                                                    <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)', textAlign: isMe ? 'right' : 'left' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>

                                {/* Input */}
                                <div className="px-5 py-3" style={{ borderTop: '1px solid var(--pp-border)', background: 'var(--pp-bg-card)' }}>
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={input} onChange={e => setInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMsgSend(); } }}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                        <button onClick={handleMsgSend} disabled={!input.trim()}
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
            )}
        </div>
    );
}
