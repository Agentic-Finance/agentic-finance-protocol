'use client';

import React, { useState, Suspense, lazy } from 'react';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { SidebarSkeleton } from '../Skeletons';

const MppDashboard = lazy(() => import('../MppDashboard'));
const ComplianceStatus = lazy(() => import('../ComplianceStatus'));

type PaymentTool = 'link' | 'split' | 'request' | 'qr';

interface PaymentsTabProps {
    walletAddress: string | null;
    showToast: (type: string, msg: string) => void;
}

function PaymentsTab({ walletAddress, showToast }: PaymentsTabProps) {
    const [activeTool, setActiveTool] = useState<PaymentTool | null>(null);
    const [linkAmount, setLinkAmount] = useState('');
    const [linkToken, setLinkToken] = useState('AlphaUSD');
    const [linkNote, setLinkNote] = useState('');
    const [splitTotal, setSplitTotal] = useState('');
    const [splitCount, setSplitCount] = useState('2');
    const [requestTo, setRequestTo] = useState('');
    const [requestAmount, setRequestAmount] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');

    const tools: { id: PaymentTool; label: string; icon: React.ReactNode; desc: string; gradient: string; border: string }[] = [
        {
            id: 'link', label: 'Payment Link', desc: 'Create shareable payment link + QR',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.032a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.257 8.82" /></svg>,
            gradient: 'linear-gradient(135deg, rgba(62,221,185,0.1), rgba(27,191,236,0.1))',
            border: 'rgba(62,221,185,0.3)',
        },
        {
            id: 'split', label: 'Split Bill', desc: 'Divide payment equally among recipients',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
            gradient: 'linear-gradient(135deg, rgba(255,125,44,0.1), rgba(255,215,0,0.1))',
            border: 'rgba(255,125,44,0.3)',
        },
        {
            id: 'request', label: 'Request Payment', desc: 'Send a payment request to a wallet',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>,
            gradient: 'linear-gradient(135deg, rgba(255,45,135,0.1), rgba(139,92,246,0.1))',
            border: 'rgba(255,45,135,0.3)',
        },
        {
            id: 'qr', label: 'QR Code', desc: 'Generate QR code for your wallet address',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>,
            gradient: 'linear-gradient(135deg, rgba(27,191,236,0.1), rgba(139,92,246,0.1))',
            border: 'rgba(27,191,236,0.3)',
        },
    ];

    const generatePaymentLink = async () => {
        try {
            const res = await fetch('/api/payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientWallet: walletAddress, amount: linkAmount || undefined, token: linkToken, note: linkNote || undefined }),
            });
            const data = await res.json();
            if (data.success) {
                setGeneratedLink(data.paymentUrl);
                navigator.clipboard?.writeText(data.paymentUrl);
                showToast('success', 'Payment link created and copied!');
            } else {
                showToast('error', data.error || 'Failed to create link');
            }
        } catch { showToast('error', 'Failed to create payment link'); }
    };

    const qrUrl = walletAddress
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://agt.finance/pay?to=${walletAddress}`)}&bgcolor=1A1D28&color=3EDDB9`
        : '';

    return (
        <div className="space-y-6">
            {/* Tool Selector Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                        className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                        style={{
                            background: activeTool === tool.id ? tool.gradient : 'var(--pp-surface-1)',
                            border: activeTool === tool.id ? `1px solid ${tool.border}` : '1px solid var(--pp-border)',
                        }}
                    >
                        <div className="mb-2" style={{ color: activeTool === tool.id ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)' }}>
                            {tool.icon}
                        </div>
                        <p className="text-xs font-bold" style={{ color: 'var(--pp-text-primary)' }}>{tool.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--pp-text-muted)' }}>{tool.desc}</p>
                    </button>
                ))}
            </div>

            {/* Active Tool Panel */}
            {activeTool === 'link' && (
                <div className="rounded-xl p-5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--pp-text-primary)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.032a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.257 8.82" /></svg>
                        Create Payment Link
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount (optional)</label>
                            <input value={linkAmount} onChange={e => setLinkAmount(e.target.value)} placeholder="0.00"
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }} />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Token</label>
                            <select value={linkToken} onChange={e => setLinkToken(e.target.value)}
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }}>
                                <option>AlphaUSD</option><option>pathUSD</option><option>BetaUSD</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Note (optional)</label>
                        <input value={linkNote} onChange={e => setLinkNote(e.target.value)} placeholder="What is this payment for?"
                            className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }} />
                    </div>
                    <button onClick={generatePaymentLink} className="w-full py-2.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-mint), var(--agt-blue))' }}>
                        Generate Link + QR
                    </button>

                    {generatedLink && (
                        <div className="mt-4 p-4 rounded-xl flex items-center gap-4" style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)' }}>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(generatedLink)}&bgcolor=21242F&color=3EDDB9`}
                                alt="QR" className="w-20 h-20 rounded-lg" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--agt-mint)' }}>Payment Link Created</p>
                                <a href={generatedLink} target="_blank" rel="noopener noreferrer"
                                    className="text-xs font-mono underline truncate block" style={{ color: 'var(--agt-blue)' }}>{generatedLink}</a>
                                <p className="text-[9px] mt-1" style={{ color: 'var(--pp-text-muted)' }}>Share link or scan QR. Copied to clipboard.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTool === 'split' && (
                <div className="rounded-xl p-5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--pp-text-primary)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                        Split Bill
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Total Amount</label>
                            <input value={splitTotal} onChange={e => setSplitTotal(e.target.value)} placeholder="100.00"
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }} />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Split Between</label>
                            <input value={splitCount} onChange={e => setSplitCount(e.target.value)} placeholder="2" type="number" min="2"
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }} />
                        </div>
                    </div>
                    {splitTotal && parseInt(splitCount) >= 2 && (
                        <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)' }}>
                            <p className="text-xs" style={{ color: 'var(--pp-text-secondary)' }}>
                                Each person pays: <strong style={{ color: 'var(--agt-orange)' }}>${(parseFloat(splitTotal) / parseInt(splitCount)).toFixed(2)}</strong> AlphaUSD
                            </p>
                        </div>
                    )}
                    <button className="w-full py-2.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-orange), var(--agt-pink))' }}>
                        Generate Split Links
                    </button>
                </div>
            )}

            {activeTool === 'request' && (
                <div className="rounded-xl p-5" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--pp-text-primary)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
                        Request Payment
                    </h3>
                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>From (wallet address)</label>
                            <input value={requestTo} onChange={e => setRequestTo(e.target.value)} placeholder="0x..."
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none font-mono" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }} />
                        </div>
                        <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--pp-text-muted)' }}>Amount</label>
                            <input value={requestAmount} onChange={e => setRequestAmount(e.target.value)} placeholder="100.00"
                                className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-primary)', border: '1px solid var(--pp-border)' }} />
                        </div>
                    </div>
                    <button className="w-full py-2.5 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                        Send Request
                    </button>
                </div>
            )}

            {activeTool === 'qr' && walletAddress && (
                <div className="rounded-xl p-5 text-center" style={{ background: 'var(--pp-surface-1)', border: '1px solid var(--pp-border)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--pp-text-primary)' }}>Your Wallet QR Code</h3>
                    <div className="inline-block p-3 rounded-xl mb-3" style={{ background: 'var(--pp-bg-elevated)', border: '1px solid var(--pp-border)' }}>
                        <img src={qrUrl} alt="Wallet QR" className="w-40 h-40 rounded-lg" />
                    </div>
                    <p className="text-xs font-mono mb-2" style={{ color: 'var(--agt-blue)' }}>{walletAddress}</p>
                    <button onClick={() => { navigator.clipboard?.writeText(walletAddress); showToast('success', 'Address copied!'); }}
                        className="text-[10px] px-4 py-1.5 rounded-lg" style={{ background: 'var(--pp-surface-2)', color: 'var(--pp-text-secondary)', border: '1px solid var(--pp-border)' }}>
                        Copy Address
                    </button>
                </div>
            )}

            {/* MPP + Compliance sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FeatureErrorBoundary feature="MPP Dashboard" compact>
                    <Suspense fallback={<SidebarSkeleton />}>
                        <MppDashboard />
                    </Suspense>
                </FeatureErrorBoundary>
                <FeatureErrorBoundary feature="ZK Compliance" compact>
                    <Suspense fallback={null}>
                        <ComplianceStatus />
                    </Suspense>
                </FeatureErrorBoundary>
            </div>
        </div>
    );
}

export default React.memo(PaymentsTab);
