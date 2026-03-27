'use client';

import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import { REACTIONS } from '../types';

interface Props {
    msg: ChatMessage;
    isMe: boolean;
    walletAddress: string;
    onReply: (msg: ChatMessage) => void;
    onReact: (msgId: string, emoji: string) => void;
    onPin: (msgId: string) => void;
    onDelete: (msgId: string) => void;
    onEdit: (msgId: string, content: string) => void;
    onForward: (msg: ChatMessage) => void;
}

export default function MessageBubble({ msg, isMe, walletAddress, onReply, onReact, onPin, onDelete, onEdit, onForward }: Props) {
    const [showActions, setShowActions] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextPos, setContextPos] = useState({ x: 0, y: 0 });

    if (msg.messageType === 'system') {
        return (
            <div className="flex justify-center my-3">
                <span className="text-[11px] px-4 py-1.5 rounded-full" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>
                    {msg.content}
                </span>
            </div>
        );
    }

    if (msg.messageType === 'payment_request') {
        return (
            <div className="flex justify-center my-3">
                <div className="rounded-xl p-4 max-w-sm w-full" style={{ background: 'rgba(62,221,185,0.06)', border: '1px solid rgba(62,221,185,0.2)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💸</span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--agt-mint)' }}>Payment Request</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color: 'var(--pp-text-primary)' }}>{msg.metadata?.amount || '0'} {msg.metadata?.token || 'USDC'}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--pp-text-muted)' }}>From {msg.senderName || msg.senderWallet?.slice(0, 8)}</p>
                    <div className="flex gap-2 mt-3">
                        <button className="flex-1 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--agt-mint)' }}>Accept</button>
                        <button className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)', border: '1px solid var(--pp-border)' }}>Decline</button>
                    </div>
                </div>
            </div>
        );
    }

    if (msg.messageType === 'image') {
        return (
            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                <div className={`max-w-[70%] rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} overflow-hidden`}
                    style={{ border: `1px solid ${isMe ? 'rgba(27,191,236,0.2)' : 'var(--pp-border)'}` }}>
                    <img src={msg.metadata?.url} alt="Image" className="max-w-full max-h-64 object-cover" />
                    {msg.content && <p className="text-sm px-3 py-2" style={{ color: 'var(--pp-text-primary)' }}>{msg.content}</p>}
                </div>
            </div>
        );
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const statusIcon = () => {
        if (!isMe) return null;
        switch (msg.status) {
            case 'sending': return <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>○</span>;
            case 'sent': return <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>✓</span>;
            case 'delivered': return <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>✓✓</span>;
            case 'read': return <span className="text-[9px]" style={{ color: 'var(--agt-blue)' }}>✓✓</span>;
            default: return <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>✓</span>;
        }
    };

    return (
        <div
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 group relative`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowContextMenu(false); }}
            onContextMenu={handleContextMenu}
        >
            <div className="max-w-[70%] relative">
                {/* Reply preview */}
                {msg.replyToContent && (
                    <div className="mb-1 ml-2 px-3 py-1.5 rounded-lg text-[10px] truncate" style={{ background: 'var(--pp-surface-1)', borderLeft: '2px solid var(--agt-blue)', color: 'var(--pp-text-muted)' }}>
                        {msg.replyToContent}
                    </div>
                )}

                {/* Pinned indicator */}
                {msg.isPinned && (
                    <div className="flex items-center gap-1 mb-1 ml-2">
                        <span className="text-[9px]">📌</span>
                        <span className="text-[9px]" style={{ color: 'var(--agt-orange)' }}>Pinned</span>
                    </div>
                )}

                {/* Message bubble */}
                <div className={`rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} px-4 py-2.5`}
                    style={{
                        background: isMe ? 'rgba(27,191,236,0.1)' : 'var(--pp-surface-1)',
                        border: `1px solid ${isMe ? 'rgba(27,191,236,0.2)' : 'var(--pp-border)'}`,
                    }}>
                    {!isMe && msg.senderName && (
                        <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--agt-blue)' }}>{msg.senderName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--pp-text-primary)' }}>{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                        {msg.isEdited && <span className="text-[9px]" style={{ color: 'var(--pp-text-muted)' }}>edited</span>}
                        <span className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {statusIcon()}
                    </div>
                </div>

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex gap-1 mt-1 ml-2">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
                                style={{ background: users.includes(walletAddress) ? 'rgba(27,191,236,0.15)' : 'var(--pp-surface-1)', border: `1px solid ${users.includes(walletAddress) ? 'rgba(27,191,236,0.3)' : 'var(--pp-border)'}` }}>
                                <span>{emoji}</span>
                                <span style={{ color: 'var(--pp-text-muted)' }}>{users.length}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Hover action bar */}
                {showActions && (
                    <div className={`absolute ${isMe ? 'left-0' : 'right-0'} -top-8 flex items-center gap-0.5 rounded-lg px-1 py-0.5 z-10`}
                        style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        {REACTIONS.slice(0, 4).map(emoji => (
                            <button key={emoji} onClick={() => onReact(msg.id, emoji)} className="w-7 h-7 flex items-center justify-center rounded hover:scale-125 transition-transform text-sm">
                                {emoji}
                            </button>
                        ))}
                        <div className="w-px h-5 mx-0.5" style={{ background: 'var(--pp-border)' }} />
                        <button onClick={() => onReply(msg)} className="w-7 h-7 flex items-center justify-center rounded hover:opacity-80 transition-all" title="Reply">
                            <svg className="w-3.5 h-3.5" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        </button>
                        <button onClick={() => onPin(msg.id)} className="w-7 h-7 flex items-center justify-center rounded hover:opacity-80 transition-all" title="Pin">
                            <span className="text-xs">📌</span>
                        </button>
                    </div>
                )}

                {/* Context menu */}
                {showContextMenu && (
                    <div className="fixed z-50 py-1 rounded-xl min-w-[160px]"
                        style={{ left: contextPos.x, top: contextPos.y, background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: 'Reply', icon: '↩️', action: () => { onReply(msg); setShowContextMenu(false); } },
                            { label: 'Pin', icon: '📌', action: () => { onPin(msg.id); setShowContextMenu(false); } },
                            { label: 'Forward', icon: '↗️', action: () => { onForward(msg); setShowContextMenu(false); } },
                            { label: 'Copy', icon: '📋', action: () => { navigator.clipboard.writeText(msg.content); setShowContextMenu(false); } },
                            ...(isMe ? [{ label: 'Edit', icon: '✏️', action: () => { const newText = prompt('Edit message:', msg.content); if (newText) onEdit(msg.id, newText); setShowContextMenu(false); } }] : []),
                            { label: 'Delete', icon: '🗑️', action: () => { onDelete(msg.id); setShowContextMenu(false); }, danger: true },
                        ].map((item: any) => (
                            <button key={item.label} onClick={item.action}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-all hover:opacity-80"
                                style={{ color: item.danger ? '#EF4444' : 'var(--pp-text-primary)' }}>
                                <span>{item.icon}</span> {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
