'use client';
// PayPol Protocol — Landing Page v2.1
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    CommandLineIcon, CubeTransparentIcon, CpuChipIcon,
    ShieldCheckIcon, DocumentTextIcon, SparklesIcon,
    ClockIcon, BoltIcon, GlobeAltIcon, EyeSlashIcon,
    UserGroupIcon, BriefcaseIcon, ServerStackIcon,
    ArrowPathIcon, CodeBracketIcon, ChartBarIcon,
    LightBulbIcon, RocketLaunchIcon, CheckCircleIcon,
    PuzzlePieceIcon, TruckIcon, ArrowsRightLeftIcon,
    BookOpenIcon, ChatBubbleLeftRightIcon, ArrowTopRightOnSquareIcon,
    SignalIcon, CheckBadgeIcon, ScaleIcon, KeyIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function LandingPage({ onLaunchApp }: { onLaunchApp: () => void }) {
    const [scrolled, setScrolled] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // --- REAL AI BRAIN INTEGRATION STATES ---
    const [outputStep, setOutputStep] = useState(0);
    const [agentData, setAgentData] = useState<any>(null);
    const [nexusLog, setNexusLog] = useState<string[]>([]);

    // Navbar Scroll
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll-triggered reveal animations
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Stagger children
                    const children = entry.target.querySelectorAll('.reveal-child');
                    children.forEach((child, i) => {
                        (child as HTMLElement).style.transitionDelay = `${i * 0.08}s`;
                        child.classList.add('revealed');
                    });
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // --- TERMINAL LOGIC ---
    useEffect(() => {
        setOutputStep(0);
        setNexusLog([]);
        setAgentData(null);

        if (activeTab !== 1) {
            const t1 = setTimeout(() => setOutputStep(1), 200);
            const t2 = setTimeout(() => setOutputStep(2), 600);
            const t3 = setTimeout(() => setOutputStep(3), 1000);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        } else {
            // Nexus A2A — Simulated demo for landing page
            const runSimulatedDemo = async () => {
                setOutputStep(1);
                setNexusLog(prev => [...prev, "> Initializing Nexus Protocol..."]);

                await new Promise(r => setTimeout(r, 800));
                setNexusLog(prev => [...prev, "> Connecting to Agent Marketplace..."]);

                await new Promise(r => setTimeout(r, 1000));
                const mockDev = '0x7a3F' + Math.random().toString(16).slice(2, 6);
                const mockAudit = '0x9bE2' + Math.random().toString(16).slice(2, 6);
                setAgentData({ devAddress: mockDev, auditAddress: mockAudit });
                setNexusLog(prev => [...prev, `> Agents Spawned: Dev(${mockDev.slice(0, 8)}...) & Audit(${mockAudit.slice(0, 8)}...)`]);
                setOutputStep(2);

                await new Promise(r => setTimeout(r, 1500));
                setNexusLog(prev => [...prev, "> Dev Agent pushing code to GitHub..."]);

                await new Promise(r => setTimeout(r, 1200));
                const mockSig = '0x' + Array.from({ length: 15 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                setNexusLog(prev => [...prev, `> Audit Agent Verified! Signature: ${mockSig}...`]);
                setNexusLog(prev => [...prev, "> [CHAIN] \uD83D\uDCB8 $5.00 streamed to Dev Agent."]);
                setOutputStep(3);
            };
            runSimulatedDemo();
        }
    }, [activeTab]);

    const prompts = [
        { title: "Private Payroll", command: "Pay @Tony 10 AlphaUSD, use ZK Shield and lock for 7 days.", icon: <ShieldCheckIcon className="w-5 h-5" />, color: '#10b981' },
        { title: "PayPol Nexus (A2A)", command: "Fund 500 AlphaUSD. Hire DevAgent & AuditAgent. Micro-stream $5 per approved PR.", icon: <CubeTransparentIcon className="w-5 h-5" />, color: '#a855f7' },
        { title: "Smart Ledger", command: "Parse Q3_Engineering_Roster.csv and map to addresses.", icon: <DocumentTextIcon className="w-5 h-5" />, color: '#818cf8' },
        { title: "Omni-Chain Yield", command: "Bridge 50k USDC to Arbitrum. Auto-stake in highest yield pool.", icon: <ArrowPathIcon className="w-5 h-5" />, color: '#ec4899' },
        { title: "Autonomous Hedge Fund", command: "Monitor BTC/ETH ratio. Rebalance portfolio if divergence > 5%.", icon: <ChartBarIcon className="w-5 h-5" />, color: '#eab308' },
        { title: "DePIN Reward Routing", command: "Ping node uptime API. Disburse micro-rewards to 5,000 active nodes.", icon: <SignalIcon className="w-5 h-5" />, color: '#06b6d4' }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0B1120', color: '#e2e8f0', fontFamily: 'sans-serif', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* BACKGROUND — Vibrant gradient mesh */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-15%', left: '10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-25%', right: '-5%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', top: '40%', left: '50%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', top: '10%', right: '20%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.10) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                {/* Subtle grid overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/grid.svg')", backgroundPosition: 'center', opacity: 0.04 }}></div>
                {/* Noise texture */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}></div>
            </div>

            {/* NAVBAR */}
            <div className="landing-nav" style={{ position: 'fixed', top: '0', width: '100%', zIndex: 50, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', background: scrolled ? 'rgba(11, 17, 32, 0.95)' : 'transparent', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.10)' : 'none', backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none', transition: 'all 0.3s ease' }}>
                <div className="landing-logo" style={{ pointerEvents: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 0 25px rgba(16,185,129,0.5))', transition: 'transform 0.3s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Image src="/logo.png" alt="PayPol Logo" width={192} height={48} className="landing-logo-img" style={{ width: 'auto', objectFit: 'contain' }} priority />
                </div>
                <div className="hidden md:flex" style={{ pointerEvents: 'auto', alignItems: 'center', gap: '40px', padding: '12px 48px', backgroundColor: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '9999px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px) saturate(180%)', height: '52px' }}>
                    {[
                        { label: 'Overview', href: '#overview' },
                        { label: 'Protocol', href: '#protocol' },
                        { label: 'Features', href: '#features' },
                        { label: 'Developers', href: '#resources' },
                    ].map((item) => (
                        <a key={item.label} href={item.href} style={{ cursor: 'pointer', textDecoration: 'none', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold', transition: 'color 0.2s', letterSpacing: '0.02em' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>{item.label}</a>
                    ))}
                </div>
                <button onClick={onLaunchApp} className="animate-pulse-slow landing-cta-btn" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', color: '#000', borderRadius: '9999px', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 0 30px rgba(255,255,255,0.3)', transition: 'transform 0.2s', letterSpacing: '0.02em' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    Launch App
                </button>
            </div>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* HERO — Headline + Floating Terminal Showcase               */}
            {/* ════════════════════════════════════════════════════════════ */}
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10, padding: '90px 20px 24px' }}>

                {/* GIANT HEADLINE */}
                <div className="animate-fade-in-up" style={{ textAlign: 'center', maxWidth: '900px', marginBottom: '24px' }}>
                    <h1 style={{ fontWeight: '900', letterSpacing: '-0.03em', lineHeight: 1.08, fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)', margin: 0, textShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                        <span style={{ color: '#fff' }}>The Financial OS for</span>
                        <br />
                        <span className="shimmer-text" style={{ color: '#34d399' }}>The Agentic Economy.</span>
                    </h1>
                </div>

                {/* FLOATING TERMINAL — iPhone Edge-to-Edge */}
                <div className="animate-fade-in-up terminal-tilt" style={{
                    width: '96%', maxWidth: '1200px', flex: 1, minHeight: '420px',
                    backgroundColor: 'rgba(12, 16, 22, 0.95)',
                    border: `1.5px solid ${prompts[activeTab].color}35`, borderRadius: '28px',
                    boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 60px ${prompts[activeTab].color}10`,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
                    animationDelay: '0.2s'
                }}>

                    {/* Dynamic Island Notch */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0', flexShrink: 0, backgroundColor: 'rgba(4, 6, 10, 0.95)' }}>
                        <div style={{
                            width: '120px', height: '28px', backgroundColor: '#000', borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                        }}>
                            <span className="animate-pulse" style={{ width: '6px', height: '6px', backgroundColor: prompts[activeTab].color, borderRadius: '50%', boxShadow: `0 0 8px ${prompts[activeTab].color}` }}></span>
                            <span style={{ fontSize: '0.55rem', fontWeight: '800', color: prompts[activeTab].color, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{outputStep === 3 ? "DONE" : "LIVE"}</span>
                        </div>
                    </div>

                    {/* Terminal Header — Tab Pills */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '8px 20px', backgroundColor: 'rgba(4, 6, 10, 0.95)', flexShrink: 0, gap: '12px' }}>
                        {/* Traffic lights */}
                        <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                        </div>

                        {/* Horizontal Tab Pills */}
                        <div className="hide-scroll" style={{ display: 'flex', gap: '6px', flex: 1, overflowX: 'auto', padding: '2px 0' }}>
                            {prompts.map((prompt, index) => (
                                <button key={index} onClick={() => setActiveTab(index)} style={{
                                    padding: '5px 14px', borderRadius: '9999px', cursor: 'pointer', transition: 'all 0.3s',
                                    border: activeTab === index ? `1px solid ${prompt.color}50` : '1px solid rgba(255,255,255,0.06)',
                                    backgroundColor: activeTab === index ? `${prompt.color}15` : 'transparent',
                                    color: activeTab === index ? prompt.color : '#64748b',
                                    fontSize: '0.72rem', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}>
                                    {prompt.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Terminal Output Content */}
                    <div className="hide-scroll" style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className={`transition-all duration-500 ${outputStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ backgroundColor: '#161B22', color: '#fff', padding: '14px 20px', borderRadius: '14px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)', alignSelf: 'flex-end', maxWidth: '85%', fontWeight: '500', fontFamily: 'monospace' }}>{prompts[activeTab].command}</div>

                        {activeTab === 0 && outputStep >= 2 && (
                            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                                <div style={{ backgroundColor: '#05070A', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '20px 28px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', backgroundColor: '#10b981', height: '100%' }}></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: '900', fontSize: '1.5rem' }}>T</div>
                                        <div><h3 style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.3rem', margin: '0 0 4px 0', lineHeight: 1 }}>Tony</h3><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fbbf24' }}>10.0</span><span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#818cf8', backgroundColor: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.2)' }}>AlphaUSD</span></div></div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ backgroundColor: '#05070A', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', marginBottom: '12px' }}><BoltIcon style={{ width: '14px', height: '14px' }} /><span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Boardroom</span></div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}><span>Tony</span><span>+10.0</span></div></div>
                                    <div style={{ backgroundColor: '#05070A', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', padding: '16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', marginBottom: '12px' }}><ClockIcon style={{ width: '14px', height: '14px' }} /><span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Escrow Vault</span></div><div style={{ fontSize: '0.9rem', color: '#6ee7b7', fontFamily: 'monospace', fontWeight: 'bold' }}>0xe89b...bd4d</div></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 1 && outputStep >= 2 && (
                            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '650px', margin: '0 auto' }}>
                                <div style={{ backgroundColor: '#05070A', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '18px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px rgba(168,85,247,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '36px', height: '36px', backgroundColor: '#000', border: '2px solid #a855f7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheckIcon style={{ width: '18px', height: '18px', color: '#a855f7' }} /></div><div><p style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nexus Vault</p><p style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '900', fontFamily: 'monospace' }}>500.0 <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>USDC</span></p></div></div>
                                    <div style={{ backgroundColor: 'rgba(168,85,247,0.1)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.3)' }}><span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><ClockIcon style={{ width: '13px', height: '13px' }} /> In Escrow</span></div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#162036', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}><div style={{ width: '48px', height: '48px', backgroundColor: '#14203A', border: '1px solid #374151', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><CpuChipIcon style={{ width: '24px', height: '24px', color: '#94a3b8' }} /><span className="animate-pulse" style={{ position: 'absolute', top: '-3px', right: '-3px', width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid #111827' }}></span></div><span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '10px' }}>Dev Agent</span><span style={{ color: '#64748b', fontSize: '0.55rem', fontFamily: 'monospace', marginTop: '3px' }}>{agentData ? `${agentData.devAddress.slice(0, 6)}...` : "..."}</span></div>
                                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                        {outputStep >= 3 && (<div style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '3px 10px', borderRadius: '999px', marginBottom: '6px', zIndex: 10 }}><span style={{ fontSize: '0.6rem', color: '#c084fc', fontWeight: '900', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckBadgeIcon style={{ width: '11px', height: '11px' }} /> AI IS JUDGE</span></div>)}
                                        <div style={{ width: '100%', height: '2px', backgroundColor: '#1e293b', position: 'relative', overflow: 'hidden' }}><div className="animate-[slideRight_2s_linear_infinite]" style={{ height: '100%', width: '40px', backgroundColor: '#a855f7', boxShadow: '0 0 10px #a855f7' }}></div></div><span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '6px', fontFamily: 'monospace' }}>+$5.00 Stream</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}><div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}><ShieldCheckIcon style={{ width: '24px', height: '24px', color: '#c084fc' }} /><span className="animate-pulse" style={{ position: 'absolute', top: '-3px', right: '-3px', width: '10px', height: '10px', backgroundColor: '#a855f7', borderRadius: '50%', border: '2px solid #111827' }}></span></div><span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '10px' }}>Audit Agent</span><span style={{ color: '#a855f7', fontSize: '0.55rem', fontFamily: 'monospace', marginTop: '3px' }}>{outputStep >= 3 ? "Signed ✍️" : (agentData ? `${agentData.auditAddress.slice(0, 6)}...` : "...")}</span></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 2 && outputStep >= 2 && (<div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}><div style={{ backgroundColor: '#05070A', border: '1px solid rgba(129, 140, 248, 0.3)', borderRadius: '16px', overflow: 'hidden' }}><div style={{ display: 'flex', backgroundColor: 'rgba(129, 140, 248, 0.1)', padding: '12px 20px', fontSize: '0.75rem', fontWeight: 'bold', color: '#a5b4fc', textTransform: 'uppercase' }}><div style={{ flex: 1 }}>Employee</div><div style={{ flex: 1 }}>Wallet</div><div style={{ width: '100px', textAlign: 'right' }}>Amount</div></div>{[{ name: "Alice", wallet: "0x71C...9A", amount: "5k" }, { name: "Bob", wallet: "0x3F2...8B", amount: "4.5k" }, { name: "Charlie", wallet: "0x9E1...1C", amount: "4.5k" }].map((row, i) => (<div key={i} style={{ display: 'flex', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}><div style={{ flex: 1, color: '#fff', fontWeight: 'bold' }}>{row.name}</div><div style={{ flex: 1, color: '#64748b', fontFamily: 'monospace' }}>{row.wallet}</div><div style={{ width: '100px', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>{row.amount}</div></div>))}</div></div>)}
                        {activeTab === 3 && outputStep >= 2 && (<div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '600px', margin: '0 auto' }}><div style={{ backgroundColor: '#05070A', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '20px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ textAlign: 'center' }}><div style={{ width: '48px', height: '48px', backgroundColor: '#1e1b4b', borderRadius: '50%', border: '1px solid #4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><GlobeAltIcon style={{ width: '24px', height: '24px', color: '#818cf8' }} /></div><span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold' }}>Ethereum</span></div><div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '0.7rem', color: '#ec4899', marginBottom: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>50,000 USDC</span><div style={{ width: '100%', height: '2px', backgroundColor: '#1e293b', position: 'relative', overflow: 'hidden' }}><div className="animate-[slideRight_1.5s_linear_infinite]" style={{ height: '100%', width: '40px', backgroundColor: '#ec4899' }}></div></div><span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>LayerZero Bridge</span></div><div style={{ textAlign: 'center' }}><div style={{ width: '48px', height: '48px', backgroundColor: '#064e3b', borderRadius: '50%', border: '1px solid #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}><CubeTransparentIcon style={{ width: '24px', height: '24px', color: '#34d399' }} /></div><span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold' }}>Arbitrum</span></div></div></div>)}
                        {activeTab === 4 && outputStep >= 2 && (<div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}><div style={{ backgroundColor: '#05070A', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><ChartBarIcon style={{ width: '24px', height: '24px', color: '#eab308' }} /><span style={{ color: '#fff', fontWeight: 'bold' }}>Portfolio Rebalancing</span></div><span style={{ fontSize: '0.75rem', color: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)', fontWeight: 'bold' }}>AUTO-EXECUTED</span></div><div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}><div style={{ textAlign: 'center', opacity: 0.6 }}><p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Previous Split</p><p style={{ fontSize: '1.1rem', color: '#cbd5e1', fontWeight: 'bold', fontFamily: 'monospace' }}>BTC:52% / ETH:48%</p></div><ArrowsRightLeftIcon style={{ width: '20px', height: '20px', color: '#eab308' }} /><div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.8rem', color: '#eab308', marginBottom: '4px' }}>New Target Split</p><p style={{ fontSize: '1.4rem', color: '#fff', fontWeight: '900', fontFamily: 'monospace' }}>BTC:60% / ETH:40%</p></div></div></div></div>)}
                        {activeTab === 5 && outputStep >= 2 && (<div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}><div style={{ width: '100%', backgroundColor: '#05070A', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}><ServerStackIcon style={{ width: '32px', height: '32px', color: '#06b6d4' }} /><span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>Uptime API Oracle</span></div><div style={{ width: '2px', height: '40px', backgroundColor: '#06b6d4', opacity: 0.5 }}></div><div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>{[1, 2, 3, 4, 5].map((id) => (<div key={id} style={{ width: '40px', height: '40px', backgroundColor: '#162036', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}><SignalIcon style={{ width: '20px', height: '20px', color: '#06b6d4' }} /><div className="animate-pulse" style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div></div>))}<div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold' }}>...</div></div><div style={{ marginTop: '32px', backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '10px 20px', borderRadius: '999px' }}><span style={{ fontSize: '0.85rem', color: '#22d3ee', fontWeight: 'bold', fontFamily: 'monospace' }}>Verifying 5,000 active nodes...</span></div></div></div>)}

                        {/* Agent Execution Logs */}
                        <div className={`transition-all duration-700 mt-auto ${outputStep >= 1 ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: '#030407', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}><CodeBracketIcon style={{ width: '13px', height: '13px' }} /> <span>Agent Execution Logs</span></div>
                            {activeTab === 1 ? nexusLog.map((log, i) => <p key={i} style={{ margin: '3px 0', color: log.includes('Verified') ? '#a855f7' : '#94a3b8' }}>{log}</p>) : <><p style={{ margin: '3px 0' }}>&gt; Analyzing natural language intent...</p><p style={{ margin: '3px 0' }}>&gt; Fetching real-time on-chain data constraints...</p><p style={{ margin: '3px 0', color: prompts[activeTab].color }}>&gt; Success: Action triggered.</p></>}
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="animate-bounce-slow-scroll" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.4 }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
            </section>

            <div style={{ width: '100%', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(11,17,32,0.6)', padding: '12px 0', position: 'relative', zIndex: 10 }}>
                <div className="animate-ticker" style={{ display: 'flex', whiteSpace: 'nowrap', gap: '40px', width: 'max-content' }}>{[...Array(3)].map((_, i) => (<div key={i} style={{ display: 'flex', gap: '40px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}><span><span style={{ color: '#10b981' }}>[SUCCESS]</span> Agent-03 verified PR. Vault released 5k.</span><span><span style={{ color: '#a855f7' }}>[NEXUS]</span> AuditAgent signed tx. $5 streamed.</span><span><span style={{ color: '#ec4899' }}>[BRIDGE]</span> 50k USDC bridged to Arb.</span></div>))}</div>
            </div>

            {/* --- SECTION: THE THESIS (SYMMETRICAL LAYOUT) --- */}
            <section id="overview" style={{ padding: '120px 20px', backgroundColor: '#0D1526', position: 'relative', zIndex: 10 }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: '100px' }}><h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>The Thesis. <br /><span className="gradient-text">The Inevitable Shift.</span></h2></div>
                    <div className="thesis-grid" style={{ display: 'grid', gap: '60px', alignItems: 'start' }}>

                        {/* COLUMN 1: Why Agents? */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}><LightBulbIcon style={{ width: '32px', height: '32px', color: '#f59e0b' }} /><h3 style={{ fontSize: '2rem', color: '#fff', fontWeight: '900', letterSpacing: '-0.01em', margin: 0 }}>The World Is Changing.</h3></div>
                            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '40px', fontWeight: '500' }}>By 2028, autonomous AI agents will manage more capital than most hedge funds. The question is not <span style={{ color: '#fff' }}>whether</span> this shift happens — it is <span style={{ color: '#f59e0b' }}>who builds the financial rails</span>.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GlobeAltIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>$47T Addressable Market</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Global payroll, treasury management, and cross-border settlement — every dollar that moves will eventually move through an agent.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(34,211,238,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClockIcon style={{ width: '20px', height: '20px', color: '#22d3ee' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Always-On Execution</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Agents never sleep, never miss deadlines, never fat-finger transactions. They execute 24/7/365 with sub-second precision.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BoltIcon style={{ width: '20px', height: '20px', color: '#a855f7' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Infinite Parallelism</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>A single agent swarm can process millions of micro-settlements simultaneously — something no human treasury team can replicate.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(236,72,153,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheckIcon style={{ width: '20px', height: '20px', color: '#ec4899' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Zero Trust Required</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Cryptographic proofs replace human trust. No more "I'll pay after delivery" — escrow-backed, ZK-verified settlements eliminate counterparty risk.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(234,179,8,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CodeBracketIcon style={{ width: '20px', height: '20px', color: '#eab308' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Composable Intelligence</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Agents hire other agents. An audit agent verifies work, a treasury agent funds the escrow, a settlement agent distributes payment. The economy compounds itself.</p></div></div>
                            </div>
                        </div>

                        {/* COLUMN 2: Why PayPol? */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}><RocketLaunchIcon style={{ width: '32px', height: '32px', color: '#10b981' }} /><h3 style={{ fontSize: '2rem', color: '#fff', fontWeight: '900', letterSpacing: '-0.01em', margin: 0 }}>PayPol Is The Answer.</h3></div>
                            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '40px', fontWeight: '500' }}>Every AI agent needs a bank account. Every agent economy needs a central bank. PayPol is <span style={{ color: '#fff', textDecoration: 'underline', textDecorationColor: '#10b981' }}>the settlement infrastructure</span> for this entire new economy.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircleIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Deterministic Finance</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>AI reasoning is probabilistic. Financial execution must be binary. PayPol bridges this gap — every transaction either settles correctly or reverts entirely. Zero ambiguity.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EyeSlashIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Privacy by Default</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>ZK-SNARKs protect every salary, every vendor payment, every agent settlement from public view. Enterprise-grade privacy is not a feature — it is the foundation.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowsRightLeftIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Omni-Chain, One Protocol</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Capital flows to where it is needed most. PayPol abstracts away bridge complexities across EVM and SVM, so agents operate on any chain through one unified interface.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ScaleIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Game-Theoretic Security</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Our arbitration protocol makes cheating mathematically irrational. Nash equilibrium ensures honest behavior without human judges or centralized courts.</p></div></div>
                                <div style={{ display: 'flex', gap: '20px' }}><div style={{ flexShrink: 0, width: '36px', height: '36px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KeyIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div><div><h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>Sovereign Infrastructure</h4><p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Self-custodial vaults, programmable multi-sig, and time-locked escrows. No single points of failure. No permission needed. The protocol IS the trust layer.</p></div></div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* PROTOCOL STACK — Replacing old Architecture section */}
            <section id="protocol" style={{ padding: '120px 20px', backgroundColor: '#0B1222', position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                {/* Ambient glow */}
                <div style={{ position: 'absolute', top: '20%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>

                <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '9999px', padding: '6px 16px', marginBottom: '20px' }}>
                            <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#818cf8' }}></span>
                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#a5b4fc', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Protocol Architecture</span>
                        </div>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                            Seven Layers.<br />
                            <span className="gradient-text">One Unstoppable Stack.</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '600px', margin: '20px auto 0', lineHeight: 1.7 }}>
                            From raw neural intent to settled on-chain value — every layer is purpose-built for the agent economy.
                        </p>
                    </div>

                    {/* UNIFIED PROTOCOL STACK TABLE */}
                    <div className="protocol-table reveal" style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', borderRadius: '24px', overflow: 'hidden', backgroundColor: '#14203A', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
                        {/* Gradient accent line on left */}
                        <div style={{ position: 'absolute', left: 0, top: 0, width: '3px', height: '100%', background: 'linear-gradient(to bottom, #a855f7, #22d3ee, #f59e0b, #818cf8, #10b981, #ec4899, #94a3b8)', zIndex: 2 }}></div>

                        {/* Table header */}
                        <div className="protocol-table-header" style={{ display: 'grid', padding: '16px 24px 16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Layer</span>
                                <span className="protocol-header-stat" style={{ fontSize: '0.65rem', fontWeight: '800', color: '#475569', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Spec</span>
                            </div>
                        </div>

                        {/* Layer 7 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SparklesIcon style={{ width: '20px', height: '20px', color: '#c084fc' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#a855f7', backgroundColor: 'rgba(168,85,247,0.12)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L7</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>Neural Intent Engine</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>LLM-powered natural language parsing into deterministic financial operations</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: '800', fontFamily: 'monospace' }}>OpenClaw + Claude</span>
                            </div>
                        </div>

                        {/* Layer 6 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CpuChipIcon style={{ width: '20px', height: '20px', color: '#22d3ee' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.12)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L6</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>A2A Agent Marketplace</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>Nash-equilibrium negotiation and autonomous task execution with on-chain escrow</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#22d3ee', fontFamily: 'monospace', lineHeight: 1 }}>38+</span>
                                <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 'bold' }}>AGENTS</span>
                            </div>
                        </div>

                        {/* Layer 5 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ScaleIcon style={{ width: '20px', height: '20px', color: '#f59e0b' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L5</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>Game-Theoretic Arbitration</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>Trustless dispute resolution — cheating is mathematically irrational</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '800', fontFamily: 'monospace' }}>3% capped</span>
                            </div>
                        </div>

                        {/* Layer 4 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><EyeSlashIcon style={{ width: '20px', height: '20px', color: '#818cf8' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#818cf8', backgroundColor: 'rgba(129,140,248,0.12)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L4</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>ZK Privacy Shield</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>Zero-Knowledge proofs obscure amounts, identities, and settlement details</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: '800', fontFamily: 'monospace' }}>PLONK + Nullifier</span>
                            </div>
                        </div>

                        {/* Layer 3 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ShieldCheckIcon style={{ width: '20px', height: '20px', color: '#10b981' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L3</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>Fortress Treasury & Escrow</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>Multi-Sig, Time-Vault Escrows, and Conditional Payroll Engine</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '800', fontFamily: 'monospace' }}>Multi-Sig + ZK</span>
                            </div>
                        </div>

                        {/* Layer 2 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ArrowsRightLeftIcon style={{ width: '20px', height: '20px', color: '#ec4899' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#ec4899', backgroundColor: 'rgba(236,72,153,0.12)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L2</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>Omni-Chain Nexus</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>Cross-chain value transfer with fiat off-ramping across 150+ jurisdictions</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: '#ec4899', fontWeight: '800', fontFamily: 'monospace' }}>EVM + SVM</span>
                            </div>
                        </div>

                        {/* Layer 1 */}
                        <div className="protocol-row reveal-child" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px 20px 28px', backgroundColor: 'rgba(255,255,255,0.02)', transition: 'background-color 0.3s' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CubeTransparentIcon style={{ width: '20px', height: '20px', color: '#e2e8f0' }} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.1em', flexShrink: 0 }}>L1</span>
                                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: '800', margin: 0, whiteSpace: 'nowrap' }}>AlphaNet Settlement Layer</h3>
                                </div>
                                <p className="protocol-row-desc" style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>Deterministic on-chain settlement powered by Tempo consensus</p>
                            </div>
                            <div className="protocol-row-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: '800', fontFamily: 'monospace' }}>{'<'}1s finality</span>
                            </div>
                        </div>
                    </div>

                    {/* Integration Partners Badge Strip */}
                    <div style={{ marginTop: '60px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: '#5a6a80', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '20px' }}>Integrated With</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            {[
                                { name: 'OpenClaw', color: '#a855f7' },
                                { name: 'Eliza', color: '#818cf8' },
                                { name: 'LangChain', color: '#22d3ee' },
                                { name: 'CrewAI', color: '#38bdf8' },
                                { name: 'Olas', color: '#f43f5e' },
                                { name: 'LayerZero', color: '#ec4899' },
                                { name: 'Tempo', color: '#10b981' },
                            ].map((p) => (
                                <span key={p.name} style={{ padding: '8px 20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${p.color}25`, fontSize: '0.8rem', fontWeight: '700', color: p.color, letterSpacing: '0.02em' }}>{p.name}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ECOSYSTEM */}
            <section id="ecosystem" style={{ padding: '120px 20px', position: 'relative', zIndex: 10, backgroundColor: '#0E1428', borderTop: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                {/* Ambient background glows */}
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                    {/* Title */}
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '9999px', padding: '6px 16px', marginBottom: '24px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#34d399', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Who Builds on PayPol</span>
                        </div>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', marginBottom: '20px' }}>
                            One Protocol.<br />
                            <span className="gradient-text">Every Financial Frontier.</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto', lineHeight: 1.7 }}>
                            From DAO treasuries to autonomous AI swarms — PayPol is the settlement layer powering the next generation of programmable finance.
                        </p>
                    </div>

                    {/* Top row — 2 large cards */}
                    <div className="eco-grid-2 reveal" style={{ display: 'grid', gap: '24px', marginBottom: '24px' }}>
                        {/* Protocol Treasuries */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '24px', padding: '48px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #10b981, transparent)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <UserGroupIcon style={{ width: '36px', height: '36px', color: '#10b981' }} />
                                <h3 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: '900' }}>Protocol Treasuries</h3>
                            </div>
                            <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '24px' }}>
                                DAO-native payroll with ZK-validated bounties and multi-sig escrow. Every disbursement is trustless, auditable, and compliant.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '9999px', padding: '4px 12px' }}>Payroll Automation</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '9999px', padding: '4px 12px' }}>Bug Bounties</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '9999px', padding: '4px 12px' }}>Multi-Sig</span>
                            </div>
                        </div>

                        {/* Autonomous AI Swarms */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '24px', padding: '48px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #22d3ee, transparent)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <ServerStackIcon style={{ width: '36px', height: '36px', color: '#22d3ee' }} />
                                <h3 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: '900' }}>Autonomous AI Swarms</h3>
                            </div>
                            <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '24px' }}>
                                Machine-to-machine micropayments with automated API budget provisioning. Agents hire agents — trustlessly, at scale.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '9999px', padding: '4px 12px' }}>M2M Payments</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '9999px', padding: '4px 12px' }}>38+ AI Agents</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '9999px', padding: '4px 12px' }}>A2A Escrow</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle row — 3 medium cards */}
                    <div className="eco-grid-3 reveal" style={{ display: 'grid', gap: '24px', marginBottom: '24px' }}>
                        {/* Institutional Finance */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(129,140,248,0.15)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #818cf8, transparent)' }} />
                            <BriefcaseIcon style={{ width: '32px', height: '32px', color: '#818cf8', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: '900', marginBottom: '12px' }}>Institutional Finance</h3>
                            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>Cross-border contractor settlements with ZK payroll privacy. Direct-to-bank fiat off-ramping across 150+ jurisdictions.</p>
                        </div>

                        {/* DePIN Networks */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #ec4899, transparent)' }} />
                            <BoltIcon style={{ width: '32px', height: '32px', color: '#ec4899', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: '900', marginBottom: '12px' }}>DePIN Networks</h3>
                            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>Real-time royalty splitting and hardware node reward distribution. High-frequency micro-transaction routing at sub-second finality.</p>
                        </div>

                        {/* DeFi Vaults */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #a855f7, transparent)' }} />
                            <ChartBarIcon style={{ width: '32px', height: '32px', color: '#a855f7', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: '900', marginBottom: '12px' }}>DeFi Algorithmic Vaults</h3>
                            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>AI-driven portfolio rebalancing with automated flash loan execution and cross-chain liquidity routing via AlphaNet.</p>
                        </div>
                    </div>

                    {/* Bottom row — 2 cards + stats panel */}
                    <div className="eco-grid-3 reveal" style={{ display: 'grid', gap: '24px' }}>
                        {/* Gaming */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #f59e0b, transparent)' }} />
                            <PuzzlePieceIcon style={{ width: '32px', height: '32px', color: '#f59e0b', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: '900', marginBottom: '12px' }}>Gaming & Metaverse</h3>
                            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>Programmatic tournament payouts, NPC-to-NPC autonomous commerce, and zero-click player reward distribution.</p>
                        </div>

                        {/* Cross-Chain Commerce */}
                        <div className="bento-item" style={{ backgroundColor: '#162036', border: '1px solid rgba(244,114,182,0.15)', borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, #f472b6, transparent)' }} />
                            <GlobeAltIcon style={{ width: '32px', height: '32px', color: '#f472b6', marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: '900', marginBottom: '12px' }}>Cross-Chain Commerce</h3>
                            <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>Omni-chain value transfer between EVM and SVM. Unified state layer with instant settlement across any blockchain.</p>
                        </div>

                        {/* Protocol Numbers */}
                        <div style={{ backgroundColor: '#162036', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>38+</div>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>AI Agents</div>
                            </div>
                            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#34d399', letterSpacing: '-0.02em' }}>5</div>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Verified Contracts</div>
                            </div>
                            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#818cf8', letterSpacing: '-0.02em' }}>9</div>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Core Features</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* FEATURES — LIVE ON TEMPO L1                                 */}
            {/* ════════════════════════════════════════════════════════════ */}
            <section id="features" style={{ padding: '120px 20px', position: 'relative', zIndex: 10, backgroundColor: '#0C1020', borderTop: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '10%', right: '-5%', width: '35vw', height: '35vw', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '35vw', height: '35vw', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                    <div className="reveal" style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '9999px', padding: '6px 16px', marginBottom: '24px' }}>
                            <span className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#34d399', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>Live on Tempo Moderato</span>
                        </div>
                        <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                            9 Features.<br />
                            <span className="gradient-text">All Real. All On-Chain.</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '650px', margin: '20px auto 0', lineHeight: 1.7 }}>
                            Every feature executes real transactions on Tempo L1. 6 source-verified smart contracts. 38+ AI agents. Zero mocks.
                        </p>
                    </div>

                    {/* Phase 2 Feature Grid — 4x2 */}
                    <div className="reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                        {[
                            { icon: <ShieldCheckIcon style={{ width: '28px', height: '28px' }} />, title: 'ZK Circuit V2', desc: 'PLONK proving system with Poseidon nullifier pattern. Anti-double-spend protection for private payments.', color: '#818cf8', stat: 'PLONK + Nullifier' },
                            { icon: <CpuChipIcon style={{ width: '28px', height: '28px' }} />, title: '5+ Flagship Agents', desc: 'Contract auditor, deployer, payroll, escrow manager, shield executor — all with real Tempo L1 transactions.', color: '#22d3ee', stat: '24+ Native' },
                            { icon: <SparklesIcon style={{ width: '28px', height: '28px' }} />, title: 'AI Brain Orchestrator', desc: 'Claude-powered natural language parsing into deterministic NexusV2 escrow operations. Real AI, not mock.', color: '#c084fc', stat: 'Claude Sonnet' },
                            { icon: <ArrowsRightLeftIcon style={{ width: '28px', height: '28px' }} />, title: 'A2A Economy', desc: 'Agents autonomously hire agents. Coordinator decomposes tasks, creates per-sub-task NexusV2 escrow chains.', color: '#a855f7', stat: '6 TXs/chain' },
                            { icon: <SignalIcon style={{ width: '28px', height: '28px' }} />, title: 'Live Dashboard', desc: 'Real-time SSE streaming: transaction feed, agent heatmap, ZK proof counter, TVL gauge, revenue ticker.', color: '#10b981', stat: 'SSE Real-time' },
                            { icon: <CheckBadgeIcon style={{ width: '28px', height: '28px' }} />, title: 'Verifiable AI Proofs', desc: 'On-chain keccak256 commitment before execution. Verification after. Mismatch triggers slashing event.', color: '#f59e0b', stat: 'AIProofRegistry' },
                            { icon: <ChartBarIcon style={{ width: '28px', height: '28px' }} />, title: 'Tempo Benchmark', desc: '5 real operations comparing Tempo vs Ethereum costs. Proves 99%+ savings for PayPol operations.', color: '#ec4899', stat: '99%+ Savings' },
                            { icon: <CodeBracketIcon style={{ width: '28px', height: '28px' }} />, title: 'SDK Ecosystem', desc: 'Self-registration with webhook health check. 14 community agents across 7 contributor teams.', color: '#38bdf8', stat: '14 Community' },
                            { icon: <ArrowsRightLeftIcon style={{ width: '28px', height: '28px' }} />, title: 'Stream Settlement', desc: 'Progressive milestone-based escrow. Client approves each deliverable, payment releases incrementally. Real-time notifications.', color: '#06b6d4', stat: 'StreamV1' },
                        ].map((f, i) => (
                            <div key={i} className="reveal-child" style={{ backgroundColor: '#14203A', border: `1px solid ${f.color}20`, borderRadius: '20px', padding: '28px', position: 'relative', overflow: 'hidden', transition: 'all 0.3s' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: `linear-gradient(to right, ${f.color}, transparent)` }} />
                                <div style={{ color: f.color, marginBottom: '16px' }}>{f.icon}</div>
                                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: '800', marginBottom: '8px' }}>{f.title}</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '16px' }}>{f.desc}</p>
                                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: f.color, backgroundColor: `${f.color}15`, border: `1px solid ${f.color}25`, padding: '3px 10px', borderRadius: '9999px', letterSpacing: '0.05em' }}>{f.stat}</span>
                            </div>
                        ))}
                    </div>

                    {/* Deployed Contracts Strip */}
                    <div className="reveal" style={{ marginTop: '60px', backgroundColor: '#14203A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '20px', textAlign: 'center' }}>6 Source-Verified Contracts on Tempo Moderato</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            {[
                                { name: 'NexusV2', addr: '0x6A46...2Fab', color: '#10b981' },
                                { name: 'ShieldVaultV2', addr: '0x3B4b...0055', color: '#818cf8' },
                                { name: 'MultisendV2', addr: '0x25f4...4575', color: '#22d3ee' },
                                { name: 'PlonkVerifier', addr: '0x9FB9...50B', color: '#c084fc' },
                                { name: 'AIProofRegistry', addr: '0x8fDB...a014', color: '#f59e0b' },
                                { name: 'StreamV1', addr: '0x2808...B8fd', color: '#06b6d4' },
                            ].map((c) => (
                                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '700' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }}>{c.addr}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* RESOURCES */}
            <section id="resources" style={{ padding: '120px 20px', backgroundColor: '#0D1526', position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}><h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>Developer <span style={{ color: '#10b981' }}>Resources.</span></h2></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                        <a href="/docs/documentation" className="resource-card" style={{ textDecoration: 'none', backgroundColor: '#162036', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}><ArrowTopRightOnSquareIcon style={{ position: 'absolute', top: '24px', right: '24px', width: '20px', height: '20px', color: '#64748b' }} /><DocumentTextIcon style={{ width: '36px', height: '36px', color: '#10b981', marginBottom: '20px' }} /><h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>Documentation</h3><p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>Comprehensive guides, API references, and smart contract integration.</p></a>
                        <a href="https://github.com/PayPol-Foundation/paypol-protocol" target="_blank" rel="noopener noreferrer" className="resource-card" style={{ textDecoration: 'none', backgroundColor: '#162036', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}><ArrowTopRightOnSquareIcon style={{ position: 'absolute', top: '24px', right: '24px', width: '20px', height: '20px', color: '#64748b' }} /><CodeBracketIcon style={{ width: '36px', height: '36px', color: '#fff', marginBottom: '20px' }} /><h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>GitHub</h3><p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>Audit our open-source contracts and contribute to the PayPol core.</p></a>
                        <a href="#" className="resource-card" style={{ textDecoration: 'none', backgroundColor: '#162036', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}><ArrowTopRightOnSquareIcon style={{ position: 'absolute', top: '24px', right: '24px', width: '20px', height: '20px', color: '#64748b' }} /><ChatBubbleLeftRightIcon style={{ width: '36px', height: '36px', color: '#818cf8', marginBottom: '20px' }} /><h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>Community</h3><p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>Join the Discord. Connect with other builders in the Agentic Economy.</p></a>
                        <a href="/docs/research-paper" className="resource-card" style={{ textDecoration: 'none', backgroundColor: '#162036', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}><ArrowTopRightOnSquareIcon style={{ position: 'absolute', top: '24px', right: '24px', width: '20px', height: '20px', color: '#64748b' }} /><BookOpenIcon style={{ width: '36px', height: '36px', color: '#f59e0b', marginBottom: '20px' }} /><h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>Research Paper</h3><p style={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.95rem' }}>Deep dive into the economic models and ZK mechanics of PayPol.</p></a>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="reveal" style={{ padding: '160px 20px', textAlign: 'center', backgroundColor: '#0F1730', position: 'relative', overflow: 'hidden' }}>
                <div className="cta-glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', borderRadius: '50%', zIndex: 0 }}></div>
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#34d399', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: '24px' }}>The Future Is Autonomous</p>
                    <h2 style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: '900', color: '#fff', marginBottom: '24px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>Ready to route<br /><span className="gradient-text">liquidity?</span></h2>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 48px', lineHeight: 1.7 }}>Join the protocol powering the next generation of autonomous financial agents.</p>
                    <button onClick={onLaunchApp} className="cta-button" style={{ padding: '20px 56px', backgroundColor: '#fff', color: '#000', borderRadius: '9999px', fontSize: '1.1rem', fontWeight: '900', border: 'none', cursor: 'pointer', position: 'relative' }}>Initialize Workspace</button>
                </div>
            </section>

            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '50px 0', textAlign: 'center', backgroundColor: '#0B1120', width: '100%' }}>
                <Image src="/logo.png" alt="PayPol" width={160} height={40} style={{ height: '40px', width: 'auto', opacity: 0.5, margin: '0 auto 20px' }} />
                <p style={{ color: '#5a6a80', fontSize: '0.9rem', fontWeight: 'bold' }}>© 2026 PayPol Foundation.</p>
            </footer>

            {/* CSS */}
            <style jsx global>{`
                /* ── Scroll Reveal Animations ── */
                .reveal {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                .reveal.revealed { opacity: 1; transform: translateY(0); }
                .reveal-child {
                    opacity: 0;
                    transform: translateY(24px);
                    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity, transform;
                }
                .reveal-child.revealed { opacity: 1; transform: translateY(0); }

                /* ── Gradient Text ── */
                .gradient-text {
                    background: linear-gradient(135deg, #34d399 0%, #22d3ee 40%, #a78bfa 70%, #f472b6 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* ── Protocol Table ── */
                .protocol-row:hover {
                    background-color: rgba(255,255,255,0.03) !important;
                }

                /* ── CTA Section ── */
                .cta-glow {
                    background: radial-gradient(circle, rgba(16,185,129,0.20) 0%, rgba(99,102,241,0.12) 40%, transparent 70%);
                }
                .cta-button {
                    box-shadow: 0 0 40px rgba(255,255,255,0.25), 0 0 80px rgba(16,185,129,0.15);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .cta-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(16,185,129,0.25);
                }

                /* ── Pulse Dot ── */
                .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
                @keyframes pulse-dot {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(129,140,248,0.6); }
                    50% { box-shadow: 0 0 0 6px rgba(129,140,248,0); }
                }

                /* ── Base Utilities ── */
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

                /* ── Card Hover Effects ── */
                .bento-item, .resource-card { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .bento-item:hover, .resource-card:hover {
                    border-color: rgba(255,255,255,0.25) !important;
                    transform: translateY(-6px);
                    background-color: rgba(30, 42, 66, 1) !important;
                    box-shadow: 0 24px 48px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.15), 0 0 40px rgba(99,102,241,0.08) !important;
                }

                /* ── Existing Animations ── */
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.7s forwards; opacity: 0; }
                @keyframes slideRight { 0% { transform: translateX(-100px); } 100% { transform: translateX(250px); } }
                @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .animate-ticker { animation: ticker 30s linear infinite; }
                @keyframes pulse-slow { 0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); } 50% { box-shadow: 0 0 40px rgba(255,255,255,0.5); } }
                .animate-pulse-slow { animation: pulse-slow 3s infinite; }

                /* ── Hero Text (shimmer replaced with gradient) ── */
                .shimmer-text {
                    background: linear-gradient(135deg, #34d399 0%, #22d3ee 50%, #34d399 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gentle-shift 8s ease-in-out infinite;
                }
                @keyframes gentle-shift {
                    0%, 100% { background-position: 0% center; }
                    50% { background-position: 100% center; }
                }

                @keyframes bounce-slow-scroll { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
                .animate-bounce-slow-scroll { animation: bounce-slow-scroll 2s ease-in-out infinite; }
                .terminal-tilt { transform: perspective(2000px) rotateX(2deg); transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.5s ease, box-shadow 0.5s ease; }
                .terminal-tilt:hover { transform: perspective(2000px) rotateX(0deg); }

                /* ── Responsive Grids ── */
                .thesis-grid { grid-template-columns: 1fr; }
                .eco-grid-2 { grid-template-columns: 1fr; }
                .eco-grid-3 { grid-template-columns: 1fr; }
                @media (min-width: 768px) {
                    .thesis-grid { grid-template-columns: repeat(2, 1fr); }
                    .eco-grid-2 { grid-template-columns: repeat(2, 1fr); }
                    .eco-grid-3 { grid-template-columns: repeat(2, 1fr); }
                }
                @media (min-width: 1024px) {
                    .eco-grid-3 { grid-template-columns: repeat(3, 1fr); }
                }

                /* ── Default Navbar Sizing ── */
                .landing-logo-img { height: 40px; }
                .landing-cta-btn { padding: 12px 36px; font-size: 0.95rem; }

                /* ── Mobile Overrides ── */
                @media (max-width: 640px) {
                    .bento-item { padding: 20px 16px !important; gap: 12px !important; }
                    .bento-item p { font-size: 0.8rem !important; }
                    .bento-item:hover { transform: none !important; }
                    .resource-card:hover { transform: none !important; }
                    .terminal-tilt { transform: none !important; }
                    .terminal-tilt:hover { transform: none !important; }

                    /* Navbar mobile */
                    .landing-nav { padding: 8px 12px !important; }
                    .landing-logo-img { height: 34px !important; }
                    .landing-cta-btn { padding: 8px 18px !important; font-size: 0.75rem !important; }

                    /* Protocol table mobile */
                    .protocol-table { border-radius: 16px !important; }
                    .protocol-row {
                        padding: 14px 16px 14px 20px !important;
                        gap: 10px !important;
                        flex-wrap: wrap !important;
                    }
                    .protocol-row h3 { font-size: 0.82rem !important; white-space: normal !important; }
                    .protocol-row-desc { display: none; }
                    .protocol-row-stat {
                        width: 100% !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        justify-content: flex-start !important;
                        padding: 4px 10px;
                        background: rgba(255,255,255,0.03);
                        border-radius: 6px;
                        border: 1px solid rgba(255,255,255,0.05);
                        margin-top: -4px;
                    }
                    .protocol-row-stat span { font-size: 0.65rem !important; }
                    .protocol-header-stat { display: none; }
                    .protocol-table-header { padding: 12px 16px 12px 20px !important; }

                    .cta-button:hover { transform: none; }
                }
            `}</style>
        </div>
    );
}
