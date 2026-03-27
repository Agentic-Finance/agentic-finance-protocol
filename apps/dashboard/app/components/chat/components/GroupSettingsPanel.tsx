'use client';

import React, { useState } from 'react';
import type { Channel, Agent } from '../types';

interface Props {
    channel: Channel;
    agents: Agent[];
    walletAddress: string;
    onClose: () => void;
    onInvite: (wallet: string) => void;
    onAddAgent: (agentId: string) => void;
    onKick: (wallet: string) => void;
    onLeave: () => void;
    onUpdateName: (name: string) => void;
    onDelete: () => void;
}

export default function GroupSettingsPanel({ channel, agents, walletAddress, onClose, onInvite, onAddAgent, onKick, onLeave, onUpdateName, onDelete }: Props) {
    const [inviteWallet, setInviteWallet] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(channel.name);
    const [showAddAgent, setShowAddAgent] = useState(false);
    const [tab, setTab] = useState<'members' | 'agents' | 'settings'>('members');

    const isOwner = channel.participants[0] === walletAddress;

    return (
        <div className="w-80 flex flex-col" style={{ borderLeft: '1px solid var(--pp-border)', background: 'var(--pp-bg-secondary)' }}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>Group Settings</h3>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>✕</button>
            </div>

            {/* Group info */}
            <div className="p-4 text-center" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                <div className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center text-3xl" style={{ background: 'var(--pp-surface-2)' }}>👥</div>
                {editingName ? (
                    <div className="flex items-center gap-2">
                        <input value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 px-2 py-1 rounded text-sm text-center outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                        <button onClick={() => { onUpdateName(newName); setEditingName(false); }} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--agt-blue)', color: '#fff' }}>Save</button>
                    </div>
                ) : (
                    <p className="font-bold" style={{ color: 'var(--pp-text-primary)' }}>{channel.name}
                        {isOwner && <button onClick={() => setEditingName(true)} className="ml-2 text-xs" style={{ color: 'var(--agt-blue)' }}>✏️</button>}
                    </p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>{channel.participants.length} members{channel.agents?.length ? ` · ${channel.agents.length} agents` : ''}</p>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                {(['members', 'agents', 'settings'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 text-[11px] font-medium capitalize transition-all"
                        style={{ color: tab === t ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)', borderBottom: tab === t ? '2px solid var(--agt-blue)' : '2px solid transparent' }}>{t}</button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {tab === 'members' && (
                    <>
                        <div className="mb-3">
                            <div className="flex items-center gap-2">
                                <input type="text" placeholder="Invite by wallet (0x...)" value={inviteWallet} onChange={e => setInviteWallet(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                <button onClick={() => { if (inviteWallet.trim()) { onInvite(inviteWallet); setInviteWallet(''); } }}
                                    className="px-3 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--agt-blue)' }}>Invite</button>
                            </div>
                        </div>
                        {channel.participants.map((w, i) => (
                            <div key={w} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, var(--agt-blue), var(--agt-mint))', color: '#fff' }}>
                                    {w.slice(2, 4)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate font-mono" style={{ color: 'var(--pp-text-primary)' }}>{w.slice(0, 6)}...{w.slice(-4)}</p>
                                    <p className="text-[9px]" style={{ color: i === 0 ? 'var(--agt-pink)' : 'var(--pp-text-muted)' }}>{i === 0 ? 'Owner' : 'Member'}</p>
                                </div>
                                {isOwner && w !== walletAddress && (
                                    <button onClick={() => onKick(w)} className="text-[10px] px-2 py-1 rounded" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}>Kick</button>
                                )}
                            </div>
                        ))}
                    </>
                )}

                {tab === 'agents' && (
                    <>
                        <button onClick={() => setShowAddAgent(!showAddAgent)} className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left"
                            style={{ color: 'var(--agt-blue)', background: 'var(--pp-surface-1)', border: '1px dashed var(--pp-border)' }}>
                            <span>+</span> <span className="text-xs font-medium">Add Agent to Group</span>
                        </button>
                        {showAddAgent && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {agents.slice(0, 10).map(a => (
                                    <button key={a.id} onClick={() => { onAddAgent(a.id); setShowAddAgent(false); }}
                                        className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:opacity-80 transition-all"
                                        style={{ background: 'var(--pp-surface-1)' }}>
                                        <span className="text-lg">{a.avatarEmoji}</span>
                                        <div>
                                            <p className="text-xs font-medium" style={{ color: 'var(--pp-text-primary)' }}>{a.name}</p>
                                            <p className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>{a.category} · ${a.basePrice}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {(channel.agents || []).length === 0 && !showAddAgent && (
                            <div className="text-center py-6">
                                <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>No agents in this group</p>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Add agents to get AI assistance in chat</p>
                            </div>
                        )}
                    </>
                )}

                {tab === 'settings' && (
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: 'var(--pp-text-primary)' }}>Notifications</p>
                            <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>Mute this group to stop notifications</p>
                        </div>
                        <button onClick={onLeave} className="w-full py-2.5 rounded-lg text-xs font-medium transition-all" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            Leave Group
                        </button>
                        {isOwner && (
                            <button onClick={onDelete} className="w-full py-2.5 rounded-lg text-xs font-medium transition-all" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                Delete Group
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
