'use client';
import React, { useState } from 'react';

export default function SendReceivePage() {
    const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'request' | 'split'>('send');
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [token, setToken] = useState('AlphaUSD');

    const tabs = [
        { id: 'send', label: 'Send', icon: '↗️' },
        { id: 'receive', label: 'Receive', icon: '↙️' },
        { id: 'request', label: 'Request', icon: '📩' },
        { id: 'split', label: 'Split Bill', icon: '✂️' },
    ] as const;

    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Send & Receive</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Transfer tokens, generate payment links, request payments, or split bills</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
                        style={{ background: activeTab === t.id ? 'var(--agt-blue)' : 'transparent', color: activeTab === t.id ? '#fff' : 'var(--pp-text-muted)' }}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="rounded-xl p-6" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    {activeTab === 'send' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Recipient</label>
                                <input type="text" placeholder="0x... or name from contacts" value={recipient} onChange={e => setRecipient(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Amount</label>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                                    <select value={token} onChange={e => setToken(e.target.value)}
                                        className="px-3 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }}>
                                        <option>AlphaUSD</option><option>pathUSD</option><option>BetaUSD</option><option>ThetaUSD</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Note (optional)</label>
                                <input type="text" placeholder="Payment for..." className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded" />
                                    <span className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>ZK Shield (private payment)</span>
                                </label>
                            </div>
                            <button className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                                Send Payment
                            </button>
                        </div>
                    )}

                    {activeTab === 'receive' && (
                        <div className="space-y-4 text-center">
                            <div className="w-48 h-48 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://agt.finance/pay/receive&bgcolor=1A1D28&color=3EDDB9`} alt="QR" className="rounded-lg" />
                            </div>
                            <p className="text-sm font-medium">Your Payment QR Code</p>
                            <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Share this QR or link for anyone to pay you</p>
                            <button className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--agt-blue)' }}>
                                Copy Payment Link
                            </button>
                        </div>
                    )}

                    {activeTab === 'request' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Request from</label>
                                <input type="text" placeholder="0x... wallet address" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Amount</label>
                                <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Reason</label>
                                <input type="text" placeholder="For project deliverable..." className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <button className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-mint), var(--agt-blue))' }}>
                                Send Request
                            </button>
                        </div>
                    )}

                    {activeTab === 'split' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Total Amount</label>
                                <input type="number" placeholder="Total bill amount" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--pp-text-muted)' }}>Split between (wallet addresses, one per line)</label>
                                <textarea rows={3} placeholder="0x...\n0x...\n0x..." className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)', color: 'var(--pp-text-primary)' }} />
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                <p className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>Each person pays: <span style={{ color: 'var(--agt-mint)' }}>$0.00</span></p>
                            </div>
                            <button className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-orange), var(--agt-pink))' }}>
                                Split & Send Requests
                            </button>
                        </div>
                    )}
                </div>

                {/* Recent transactions */}
                <div className="rounded-xl p-6" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
                    <h3 className="text-sm font-bold mb-4">Recent Transactions</h3>
                    <div className="space-y-3">
                        {[
                            { type: 'sent', to: '0x7a58...9e4', amount: '100', token: 'AlphaUSD', time: '2 min ago', status: 'confirmed' },
                            { type: 'received', to: '0x3C44...3BC', amount: '250', token: 'AlphaUSD', time: '1 hour ago', status: 'confirmed' },
                            { type: 'sent', to: '0x90F8...9C1', amount: '50', token: 'pathUSD', time: '3 hours ago', status: 'confirmed' },
                        ].map((tx, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--pp-surface-1)' }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: tx.type === 'sent' ? 'rgba(255,45,135,0.1)' : 'rgba(62,221,185,0.1)' }}>
                                    <span className="text-sm">{tx.type === 'sent' ? '↗️' : '↙️'}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-medium">{tx.type === 'sent' ? 'Sent to' : 'Received from'} {tx.to}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>{tx.time}</p>
                                </div>
                                <span className="text-sm font-mono font-medium" style={{ color: tx.type === 'sent' ? 'var(--agt-pink)' : 'var(--agt-mint)' }}>
                                    {tx.type === 'sent' ? '-' : '+'}{tx.amount} {tx.token}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
