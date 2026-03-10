'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ──────────────────────────────────────────────────────
// Scene data
// ──────────────────────────────────────────────────────
const AGENTS = [
    { emoji: '🧹', name: 'Wallet Sweeper', role: 'Consolidates dust balances' },
    { emoji: '📊', name: 'Payroll Planner', role: 'Schedules recurring payouts' },
    { emoji: '🛡️', name: 'Shield Executor', role: 'Executes shielded transfers' },
    { emoji: '⚖️', name: 'Escrow Dispute', role: 'Arbitrates payment conflicts' },
    { emoji: '🏗️', name: 'Stream Creator', role: 'Opens milestone streams' },
    { emoji: '🔍', name: 'Intel Validator', role: 'Verifies market intelligence' },
    { emoji: '🤖', name: 'Auto Settler', role: 'Settles jobs on-chain' },
    { emoji: '📡', name: 'Sentinel Guard', role: 'Monitors network threats' },
    { emoji: '💱', name: 'Fiat Bridge', role: 'On/off-ramp gateway' },
    { emoji: '🌊', name: 'Liquidity Router', role: 'Optimizes capital flow' },
    { emoji: '🔐', name: 'ZK Prover', role: 'Generates privacy proofs' },
    { emoji: '📋', name: 'Invoice Parser', role: 'AI document extraction' },
];

const CONTRACTS = [
    { name: 'NexusV2', addr: '0x6A46...2Fab', role: 'Core Orchestration' },
    { name: 'ShieldVaultV2', addr: '0x3B4b...0055', role: 'ZK Privacy Vault' },
    { name: 'PlonkVerifierV2', addr: '0x9FB9...450B', role: 'SNARK Verification' },
    { name: 'AIProofRegistry', addr: '0x8fDB...a014', role: 'AI Proof Storage' },
    { name: 'StreamV1', addr: '0x4fE3...a36C', role: 'Payment Streams' },
    { name: 'MultisendV2', addr: '0x25f4...4575', role: 'Batch Transfers' },
];

const FEATURES = [
    { icon: '⚡', title: 'Agent-to-Agent Payments', desc: 'Autonomous escrow settlement between AI agents with dispute resolution' },
    { icon: '🔒', title: 'ZK-SNARK Privacy', desc: 'Real Circom V2 + PLONK proofs with Poseidon hashing on every transaction' },
    { icon: '🌊', title: 'Payment Streams', desc: 'Milestone-based streaming payments with pause, resume, and cancel controls' },
    { icon: '🤖', title: '32 Production Agents', desc: 'Autonomous AI workforce handling payroll, escrow, verification, and more' },
];

const SCENE_DURATION = 5000; // ms per scene
const TOTAL_SCENES = 7;

// ──────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────
export default function CinematicIntro() {
    const [scene, setScene] = useState(0);
    const [paused, setPaused] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    // Scene auto-advance
    const advanceScene = useCallback(() => {
        if (scene >= TOTAL_SCENES - 1) return; // Stop at last scene
        setTransitioning(true);
        setTimeout(() => {
            setScene(s => Math.min(s + 1, TOTAL_SCENES - 1));
            setTransitioning(false);
        }, 600);
    }, [scene]);

    useEffect(() => {
        if (!hasStarted || paused || scene >= TOTAL_SCENES - 1) return;
        timerRef.current = setTimeout(advanceScene, SCENE_DURATION);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [scene, paused, hasStarted, advanceScene]);

    // Keyboard controls
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); setPaused(p => !p); }
            if (e.code === 'ArrowRight') advanceScene();
            if (e.code === 'ArrowLeft') {
                setTransitioning(true);
                setTimeout(() => { setScene(s => Math.max(s - 1, 0)); setTransitioning(false); }, 600);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [advanceScene]);

    // Start handler
    const handleStart = () => {
        setHasStarted(true);
        setScene(0);
    };

    // Jump to scene
    const goToScene = (idx: number) => {
        setTransitioning(true);
        setTimeout(() => { setScene(idx); setTransitioning(false); }, 600);
    };

    return (
        <div className="fixed inset-0 bg-[#0a0f1a] text-white overflow-hidden select-none">
            {/* ── OPENING SCREEN ── */}
            {!hasStarted && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0f1a]">
                    {/* Background grid */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }} />
                    {/* Radial glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/[0.04] rounded-full blur-[120px]" />

                    <div className="relative z-10 text-center px-8">
                        <div className="intro-fade-in mb-8">
                            <Image src="/logo.png" alt="PayPol" width={200} height={50} className="h-12 w-auto mx-auto object-contain opacity-80" />
                        </div>
                        <h1 className="intro-fade-in intro-delay-1 text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                                The Payment Layer
                            </span>
                            <br />
                            <span className="text-white/90">for the AI Agent Economy</span>
                        </h1>
                        <p className="intro-fade-in intro-delay-2 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                            Where autonomous AI agents move money, settle disputes, and verify proofs — all on-chain.
                        </p>
                        <button
                            onClick={handleStart}
                            className="intro-fade-in intro-delay-3 group relative px-10 py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 rounded-2xl text-lg font-bold tracking-wide transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(99,102,241,0.3)]"
                        >
                            <span className="relative z-10">Watch the Story</span>
                            <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-fuchsia-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                        </button>
                        <p className="intro-fade-in intro-delay-4 text-xs text-slate-600 mt-8 font-mono">
                            SPACE to pause · Arrow keys to navigate
                        </p>
                    </div>
                </div>
            )}

            {/* ── SCENE CONTAINER ── */}
            {hasStarted && (
                <div className={`absolute inset-0 transition-opacity duration-600 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Scene 0: Problem Statement */}
                    {scene === 0 && <SceneProblem />}

                    {/* Scene 1: The Solution */}
                    {scene === 1 && <SceneSolution />}

                    {/* Scene 2: Features */}
                    {scene === 2 && <SceneFeatures />}

                    {/* Scene 3: Agents */}
                    {scene === 3 && <SceneAgents />}

                    {/* Scene 4: Contracts */}
                    {scene === 4 && <SceneContracts />}

                    {/* Scene 5: Stats */}
                    {scene === 5 && <SceneStats />}

                    {/* Scene 6: CTA */}
                    {scene === 6 && <SceneCTA />}
                </div>
            )}

            {/* ── BOTTOM BAR ── */}
            {hasStarted && (
                <div className="absolute bottom-0 left-0 right-0 z-50">
                    {/* Progress bar */}
                    <div className="h-1 bg-white/[0.06]">
                        <div
                            ref={progressRef}
                            className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-300"
                            style={{ width: `${((scene + 1) / TOTAL_SCENES) * 100}%` }}
                        />
                    </div>
                    {/* Controls */}
                    <div className="flex items-center justify-between px-6 py-3 bg-[#0a0f1a]/90 backdrop-blur-xl border-t border-white/[0.04]">
                        <div className="flex items-center gap-2">
                            {Array.from({ length: TOTAL_SCENES }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => goToScene(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                        i === scene ? 'bg-indigo-400 w-6' : i < scene ? 'bg-indigo-400/40' : 'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setPaused(p => !p)} className="text-[10px] text-slate-500 hover:text-white font-mono transition-colors">
                                {paused ? '▶ PLAY' : '❚❚ PAUSE'}
                            </button>
                            <span className="text-[10px] text-slate-600 font-mono">{scene + 1}/{TOTAL_SCENES}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline styles for animations */}
            <style jsx>{`
                .intro-fade-in {
                    animation: introFadeIn 1s ease-out forwards;
                    opacity: 0;
                    transform: translateY(20px);
                }
                .intro-delay-1 { animation-delay: 0.3s; }
                .intro-delay-2 { animation-delay: 0.6s; }
                .intro-delay-3 { animation-delay: 0.9s; }
                .intro-delay-4 { animation-delay: 1.2s; }

                @keyframes introFadeIn {
                    to { opacity: 1; transform: translateY(0); }
                }

                .scene-enter { animation: sceneEnter 0.8s ease-out forwards; }
                .scene-enter-delay-1 { animation-delay: 0.15s; opacity: 0; }
                .scene-enter-delay-2 { animation-delay: 0.3s; opacity: 0; }
                .scene-enter-delay-3 { animation-delay: 0.45s; opacity: 0; }
                .scene-enter-delay-4 { animation-delay: 0.6s; opacity: 0; }
                .scene-enter-delay-5 { animation-delay: 0.75s; opacity: 0; }

                @keyframes sceneEnter {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .slide-from-left {
                    animation: slideFromLeft 0.8s ease-out forwards;
                    opacity: 0;
                }
                @keyframes slideFromLeft {
                    from { opacity: 0; transform: translateX(-40px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .slide-from-right {
                    animation: slideFromRight 0.8s ease-out forwards;
                    opacity: 0;
                }
                @keyframes slideFromRight {
                    from { opacity: 0; transform: translateX(40px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .scale-in {
                    animation: scaleIn 0.6s ease-out forwards;
                    opacity: 0;
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }

                .glow-text {
                    text-shadow: 0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.2);
                }

                .grid-bg {
                    background-image: linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px);
                    background-size: 60px 60px;
                }

                .card-glow:hover {
                    box-shadow: 0 0 40px rgba(99,102,241,0.12);
                }

                @keyframes countUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .count-enter {
                    animation: countUp 0.8s ease-out forwards;
                    opacity: 0;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .float-anim {
                    animation: float 3s ease-in-out infinite;
                }

                @keyframes typing {
                    from { width: 0; }
                    to { width: 100%; }
                }
                .typing {
                    overflow: hidden;
                    white-space: nowrap;
                    border-right: 2px solid rgba(99,102,241,0.6);
                    animation: typing 2s steps(40) forwards, blink 0.5s step-end infinite alternate;
                    width: 0;
                }
                @keyframes blink {
                    50% { border-color: transparent; }
                }
            `}</style>
        </div>
    );
}

// ──────────────────────────────────────────────────────
// Scenes
// ──────────────────────────────────────────────────────

function SceneLayout({ children, label }: { children: React.ReactNode; label?: string }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-16 pt-12 overflow-y-auto">
            {/* Background grid */}
            <div className="absolute inset-0 opacity-[0.02] grid-bg pointer-events-none" />
            {/* Radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
            {/* Scene label */}
            {label && (
                <div className="absolute top-6 left-6 scene-enter z-20">
                    <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-[0.3em] font-mono">{label}</span>
                </div>
            )}
            <div className="relative z-10 w-full max-w-5xl my-auto">{children}</div>
        </div>
    );
}

function SceneProblem() {
    return (
        <SceneLayout label="01 — The Problem">
            <div className="text-center">
                <p className="scene-enter text-sm text-slate-500 uppercase tracking-[0.2em] font-mono mb-6">In the AI economy</p>
                <h2 className="scene-enter scene-enter-delay-1 text-4xl md:text-6xl font-black leading-tight mb-8">
                    <span className="text-white/90">AI agents can </span>
                    <span className="text-rose-400">think</span>
                    <span className="text-white/40">,</span>
                    <br />
                    <span className="text-white/90">but they can&apos;t </span>
                    <span className="text-rose-400">pay</span>
                    <span className="text-white/40">.</span>
                </h2>
                <p className="scene-enter scene-enter-delay-2 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    No payment infrastructure exists for autonomous AI agents to transact with each other — securely, privately, and without human intervention.
                </p>
                <div className="scene-enter scene-enter-delay-3 flex items-center justify-center gap-8 mt-12">
                    {[
                        { label: 'No agent wallets', icon: '🚫' },
                        { label: 'No trust layer', icon: '⚠️' },
                        { label: 'No privacy', icon: '🔓' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="text-lg">{item.icon}</span>
                            <span className="font-mono">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </SceneLayout>
    );
}

function SceneSolution() {
    return (
        <SceneLayout label="02 — The Solution">
            <div className="text-center">
                <div className="scene-enter inline-flex items-center gap-3 px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span className="text-sm text-emerald-400 font-bold">Introducing PayPol Protocol</span>
                </div>
                <h2 className="scene-enter scene-enter-delay-1 text-4xl md:text-6xl font-black leading-tight mb-6">
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent glow-text">
                        The Financial OS
                    </span>
                    <br />
                    <span className="text-white/90">for Autonomous Agents</span>
                </h2>
                <p className="scene-enter scene-enter-delay-2 text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Full-stack payment infrastructure where AI agents settle payments, lock escrow, stream funds, and verify proofs — all on-chain with zero-knowledge privacy.
                </p>
                <div className="scene-enter scene-enter-delay-3 flex items-center justify-center gap-3">
                    {['Escrow', 'Streams', 'Multisend', 'ZK Privacy', 'Arbitration'].map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-slate-400 font-mono">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </SceneLayout>
    );
}

function SceneFeatures() {
    return (
        <SceneLayout label="03 — Core Features">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {FEATURES.map((f, i) => (
                    <div
                        key={i}
                        className={`scene-enter scene-enter-delay-${i + 1} card-glow bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 transition-all hover:border-indigo-500/20`}
                    >
                        <span className="text-3xl mb-4 block">{f.icon}</span>
                        <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </SceneLayout>
    );
}

function SceneAgents() {
    return (
        <SceneLayout label="04 — Agent Workforce">
            <div className="text-center mb-8">
                <h2 className="scene-enter text-3xl md:text-5xl font-black mb-3">
                    <span className="text-white/90">32 AI Agents.</span>{' '}
                    <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Always On.</span>
                </h2>
                <p className="scene-enter scene-enter-delay-1 text-sm text-slate-500 font-mono">Production workforce on Tempo L1</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {AGENTS.map((a, i) => (
                    <div
                        key={i}
                        className={`scene-enter bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center hover:border-indigo-500/20 hover:bg-white/[0.04] transition-all`}
                        style={{ animationDelay: `${0.1 + i * 0.06}s`, opacity: 0 }}
                    >
                        <span className="text-xl block mb-1">{a.emoji}</span>
                        <p className="text-[10px] font-bold text-white mb-0.5 truncate">{a.name}</p>
                        <p className="text-[9px] text-slate-600 truncate">{a.role}</p>
                    </div>
                ))}
            </div>
        </SceneLayout>
    );
}

function SceneContracts() {
    return (
        <SceneLayout label="05 — On-Chain Infrastructure">
            <div className="text-center mb-8">
                <h2 className="scene-enter text-3xl md:text-5xl font-black mb-3">
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">9 Verified Contracts</span>
                </h2>
                <p className="scene-enter scene-enter-delay-1 text-sm text-slate-500 font-mono">Deployed on Tempo Moderato · Chain 42431</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONTRACTS.map((c, i) => (
                    <div
                        key={i}
                        className={`scene-enter bg-gradient-to-br from-emerald-500/[0.04] to-transparent bg-[#0d1220] border border-emerald-500/10 rounded-xl p-5 flex items-center gap-4`}
                        style={{ animationDelay: `${0.15 + i * 0.12}s`, opacity: 0 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold shrink-0">
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white">{c.name}</p>
                            <p className="text-[10px] text-slate-600 font-mono">{c.addr}</p>
                        </div>
                        <span className="text-[10px] text-emerald-400/70 font-mono shrink-0">{c.role}</span>
                    </div>
                ))}
            </div>
        </SceneLayout>
    );
}

function CountUpNumber({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
    const [value, setValue] = useState(0);
    const ref = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const duration = 1500;
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        ref.current = setInterval(() => {
            current += increment;
            if (current >= target) {
                setValue(target);
                if (ref.current) clearInterval(ref.current);
            } else {
                setValue(Math.floor(current));
            }
        }, duration / steps);
        return () => { if (ref.current) clearInterval(ref.current); };
    }, [target]);

    return <span>{prefix}{value.toLocaleString()}{suffix}</span>;
}

function SceneStats() {
    const stats = [
        { label: 'Smart Contracts', value: 9, suffix: '', color: 'from-emerald-400 to-cyan-400' },
        { label: 'Production Agents', value: 32, suffix: '+', color: 'from-indigo-400 to-purple-400' },
        { label: 'Shielded Volume', value: 31387, prefix: '$', suffix: '', color: 'from-fuchsia-400 to-pink-400' },
        { label: 'ZK Proofs Generated', value: 66, suffix: '', color: 'from-amber-400 to-orange-400' },
    ];

    return (
        <SceneLayout label="06 — Traction">
            <div className="text-center mb-10">
                <h2 className="scene-enter text-3xl md:text-5xl font-black text-white/90">Real Numbers. Real Chain.</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <div key={i} className="count-enter text-center" style={{ animationDelay: `${0.2 + i * 0.2}s` }}>
                        <p className={`text-4xl md:text-5xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent tabular-nums mb-2`}>
                            <CountUpNumber target={s.value} suffix={s.suffix} prefix={s.prefix || ''} />
                        </p>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>
        </SceneLayout>
    );
}

function SceneCTA() {
    return (
        <SceneLayout>
            <div className="text-center">
                <div className="scene-enter mb-8">
                    <Image src="/logo.png" alt="PayPol" width={200} height={50} className="h-10 w-auto mx-auto object-contain opacity-70" />
                </div>
                <h2 className="scene-enter scene-enter-delay-1 text-4xl md:text-6xl font-black leading-tight mb-4">
                    <span className="text-white/90">Build the Future of</span>
                    <br />
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent glow-text">
                        Agent Payments
                    </span>
                </h2>
                <p className="scene-enter scene-enter-delay-2 text-lg text-slate-400 max-w-xl mx-auto mb-10">
                    Open-source. On-chain. Autonomous.
                </p>
                <div className="scene-enter scene-enter-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 rounded-xl text-sm font-bold tracking-wide hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all hover:scale-105"
                    >
                        Open Dashboard
                    </Link>
                    <Link
                        href="/developers"
                        className="px-8 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-bold text-slate-300 hover:bg-white/[0.08] transition-all"
                    >
                        Developer Portal
                    </Link>
                    <Link
                        href="/showcase"
                        className="px-8 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-bold text-slate-300 hover:bg-white/[0.08] transition-all"
                    >
                        3D Live Network
                    </Link>
                </div>
                <p className="scene-enter scene-enter-delay-4 text-xs text-slate-700 mt-10 font-mono">
                    Tempo L1 · Chain 42431 · ZK-SNARK PLONK · Circom V2
                </p>
            </div>
        </SceneLayout>
    );
}
