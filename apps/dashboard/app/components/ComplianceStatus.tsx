'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { COMPLIANCE_REGISTRY_ADDRESS } from '../lib/constants';

const RPC_URL = 'https://rpc.moderato.tempo.xyz';

const REGISTRY_ABI = [
    'function getStats() external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)',
    'function sanctionsRoot() external view returns (uint256)',
    'function amountThreshold() external view returns (uint256)',
    'function volumeThreshold() external view returns (uint256)',
    'function sanctionsRootUpdatedAt() external view returns (uint256)',
    'function certificateMaxAge() external view returns (uint256)',
    'function totalCertificates() external view returns (uint256)',
    'function totalVerified() external view returns (uint256)',
];

interface ComplianceData {
    totalCertificates: number;
    totalVerified: number;
    sanctionsRoot: string;
    sanctionsRootUpdatedAt: number;
    amountThreshold: string;
    volumeThreshold: string;
    certificateMaxAge: number;
}

function ComplianceStatus() {
    const [data, setData] = useState<ComplianceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const registry = new ethers.Contract(COMPLIANCE_REGISTRY_ADDRESS, REGISTRY_ABI, provider);

            const [totalCerts, totalVerified, sanctionsRoot, rootUpdated, amtThreshold, volThreshold, maxAge] = await Promise.all([
                registry.totalCertificates(),
                registry.totalVerified(),
                registry.sanctionsRoot(),
                registry.sanctionsRootUpdatedAt(),
                registry.amountThreshold(),
                registry.volumeThreshold(),
                registry.certificateMaxAge(),
            ]);

            setData({
                totalCertificates: Number(totalCerts),
                totalVerified: Number(totalVerified),
                sanctionsRoot: sanctionsRoot.toString(),
                sanctionsRootUpdatedAt: Number(rootUpdated),
                amountThreshold: (Number(amtThreshold) / 1e6).toLocaleString(),
                volumeThreshold: (Number(volThreshold) / 1e6).toLocaleString(),
                certificateMaxAge: Number(maxAge),
            });
        } catch (e) {
            console.error('ComplianceStatus fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const rootShort = data?.sanctionsRoot
        ? data.sanctionsRoot === '0'
            ? 'Not set'
            : `${data.sanctionsRoot.slice(0, 8)}...${data.sanctionsRoot.slice(-6)}`
        : '—';

    const maxAgeDays = data ? Math.round(data.certificateMaxAge / 86400) : 0;

    return (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:opacity-90 transition-opacity"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(62, 221, 185, 0.12)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--agt-mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--pp-text-primary)' }}>ZK Compliance</h3>
                        <p className="text-[10px]" style={{ color: 'var(--pp-text-muted)' }}>OFAC + AML privacy proofs</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && data && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-mono" style={{ color: 'var(--agt-mint)' }}>Live</span>
                        </div>
                    )}
                    <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--pp-border)', borderTopColor: 'var(--agt-mint)' }} />
                        </div>
                    ) : data ? (
                        <>
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Certificates</p>
                                    <p className="text-lg font-semibold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{data.totalCertificates}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Verified</p>
                                    <p className="text-lg font-semibold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{data.totalVerified}</p>
                                </div>
                                <div className="rounded-lg p-3" style={{ background: 'var(--pp-surface-1)' }}>
                                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--pp-text-muted)' }}>Max Age</p>
                                    <p className="text-lg font-semibold font-mono" style={{ color: 'var(--pp-text-primary)' }}>{maxAgeDays}d</p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2 text-[11px] font-mono">
                                <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                    <span style={{ color: 'var(--pp-text-muted)' }}>Amount Threshold</span>
                                    <span style={{ color: 'var(--pp-text-primary)' }}>${data.amountThreshold}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                    <span style={{ color: 'var(--pp-text-muted)' }}>Volume Threshold (30d)</span>
                                    <span style={{ color: 'var(--pp-text-primary)' }}>${data.volumeThreshold}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                                    <span style={{ color: 'var(--pp-text-muted)' }}>Sanctions Root</span>
                                    <span style={{ color: 'var(--agt-blue)' }}>{rootShort}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5">
                                    <span style={{ color: 'var(--pp-text-muted)' }}>Contract</span>
                                    <a
                                        href={`https://moderato.explorer.tempo.xyz/address/${COMPLIANCE_REGISTRY_ADDRESS}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                        style={{ color: 'var(--agt-blue)' }}
                                    >
                                        {COMPLIANCE_REGISTRY_ADDRESS.slice(0, 6)}...{COMPLIANCE_REGISTRY_ADDRESS.slice(-4)}
                                    </a>
                                </div>
                            </div>

                            {/* What this does */}
                            <div className="rounded-lg p-3 text-[10px] space-y-1" style={{ background: 'var(--pp-surface-1)', color: 'var(--pp-text-muted)' }}>
                                <p className="font-semibold" style={{ color: 'var(--pp-text-secondary)' }}>How ZK Compliance Works</p>
                                <p>Agents prove transactions are compliant without revealing amounts, addresses, or volumes. OFAC non-membership + AML range checks verified on-chain via PLONK proofs.</p>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs py-4 text-center" style={{ color: 'var(--pp-text-muted)' }}>Failed to load compliance data</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default React.memo(ComplianceStatus);
