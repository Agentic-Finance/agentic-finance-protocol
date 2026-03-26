'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// --- Animated counter hook ---
function useCounter(end: number, duration = 2000, start = 0) {
    const [count, setCount] = useState(start);
    const [triggered, setTriggered] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTriggered(true); }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!triggered) return;
        let frame: number;
        const t0 = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setCount(Math.floor(start + (end - start) * p));
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [triggered, end, duration, start]);

    return { count, ref };
}

// --- Particle background ---
function ParticleGrid() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
        const count = 60;

        const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(62, 221, 185, ${0.08 * (1 - dist / 200)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // Draw particles
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(62, 221, 185, 0.3)';
                ctx.fill();

                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            });

            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.6 }} />;
}

// --- TypeWriter ---
function TypeWriter({ texts, speed = 50 }: { texts: string[]; speed?: number }) {
    const [idx, setIdx] = useState(0);
    const [charIdx, setCharIdx] = useState(0);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const text = texts[idx];
        const timeout = setTimeout(() => {
            if (!deleting) {
                if (charIdx < text.length) {
                    setCharIdx(charIdx + 1);
                } else {
                    setTimeout(() => setDeleting(true), 2000);
                }
            } else {
                if (charIdx > 0) {
                    setCharIdx(charIdx - 1);
                } else {
                    setDeleting(false);
                    setIdx((idx + 1) % texts.length);
                }
            }
        }, deleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [charIdx, deleting, idx, texts, speed]);

    return (
        <span>
            {texts[idx].substring(0, charIdx)}
            <span className="animate-pulse" style={{ color: 'var(--agt-mint)' }}>|</span>
        </span>
    );
}

export default function LandingPage({ onLaunchApp }: { onLaunchApp: () => void }) {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const c1 = useCounter(21, 2000);
    const c2 = useCounter(96121, 2500);
    const c3 = useCounter(50, 1800);
    const c4 = useCounter(11, 1500);

    return (
        <div style={{ background: '#111827', color: '#fff', minHeight: '100vh', overflow: 'hidden' }}>

            {/* --- NAV --- */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                padding: '16px 24px',
                background: scrollY > 50 ? 'rgba(17, 24, 39, 0.95)' : 'transparent',
                backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
                borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'all 0.3s',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Image src="/logo-v2.png" alt="AF" width={36} height={36} style={{ borderRadius: '8px' }} />
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Agentic Finance</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href="https://github.com/Agentic-Finance/agentic-finance-protocol" target="_blank" rel="noopener"
                            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', transition: 'all 0.2s' }}>
                            GitHub
                        </a>
                        <button onClick={onLaunchApp} style={{
                            padding: '8px 20px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
                            background: 'linear-gradient(135deg, #FF2D87, #1BBFEC)', color: '#fff',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        }}>
                            Launch App
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════════════ */}
            {/* HERO                                               */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '40px 20px 40px', textAlign: 'center' }}>
                <ParticleGrid />

                {/* Radial glow */}
                <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(62,221,185,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px' }}>
                    {/* Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '9999px', border: '1px solid rgba(62,221,185,0.25)', background: 'rgba(62,221,185,0.06)', marginBottom: '28px', fontSize: '0.7rem', fontWeight: 700, color: '#3EDDB9', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3EDDB9', boxShadow: '0 0 10px #3EDDB9' }} className="animate-pulse" />
                        LIVE ON TEMPO L1
                    </div>

                    {/* 3D Logo Orb — floating with orbit rings */}
                    <div style={{ marginBottom: '32px', position: 'relative', width: '200px', height: '200px', margin: '0 auto 32px' }}>
                        {/* Outer glow */}
                        <div style={{ position: 'absolute', inset: '-40px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(62,221,185,0.12) 0%, rgba(255,45,135,0.06) 40%, transparent 70%)', animation: 'pulse-glow 4s ease-in-out infinite' }} />

                        {/* Orbit ring 1 */}
                        <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', border: '1px solid rgba(62,221,185,0.15)', animation: 'orbit-tilt-1 12s linear infinite', transformStyle: 'preserve-3d' }}>
                            <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#3EDDB9', boxShadow: '0 0 12px #3EDDB9' }} />
                        </div>

                        {/* Orbit ring 2 */}
                        <div style={{ position: 'absolute', inset: '-25px', borderRadius: '50%', border: '1px solid rgba(27,191,236,0.1)', animation: 'orbit-tilt-2 18s linear infinite reverse', transformStyle: 'preserve-3d' }}>
                            <div style={{ position: 'absolute', bottom: '-4px', right: '20%', width: '6px', height: '6px', borderRadius: '50%', background: '#1BBFEC', boxShadow: '0 0 10px #1BBFEC' }} />
                        </div>

                        {/* Orbit ring 3 */}
                        <div style={{ position: 'absolute', inset: '-40px', borderRadius: '50%', border: '1px solid rgba(255,45,135,0.08)', animation: 'orbit-tilt-3 25s linear infinite', transformStyle: 'preserve-3d' }}>
                            <div style={{ position: 'absolute', top: '30%', right: '-4px', width: '5px', height: '5px', borderRadius: '50%', background: '#FF2D87', boxShadow: '0 0 8px #FF2D87' }} />
                        </div>

                        {/* Logo center — gentle float */}
                        <div style={{
                            position: 'absolute', inset: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: 'logo-float 6s ease-in-out infinite',
                        }}>
                            <div style={{
                                width: '120px', height: '120px',
                                filter: 'drop-shadow(0 0 30px rgba(62,221,185,0.4)) drop-shadow(0 0 60px rgba(255,45,135,0.15))',
                            }}>
                                <Image src="/logo-v2.png" alt="Agentic Finance" width={120} height={120} style={{ borderRadius: '24px' }} />
                            </div>
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 20px' }}>
                        <span style={{ color: '#fff' }}>The Economy Runs on Trust.</span>
                        <br />
                        <span style={{ background: 'linear-gradient(135deg, #FF2D87, #1BBFEC, #3EDDB9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            We Built It for Machines.
                        </span>
                    </h1>

                    {/* Subtitle — shorter */}
                    <p style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)', color: '#94A3B8', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 36px' }}>
                        ZK compliance. Agent reputation. Private payments.<br />The trust layer x402 and MPP don&apos;t have.
                    </p>

                    {/* CTA Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
                        <button onClick={onLaunchApp} style={{
                            padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800,
                            background: '#fff', color: '#0A0E1A', border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 40px rgba(255,255,255,0.15)', transition: 'all 0.2s',
                        }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            Launch App →
                        </button>
                        <a href="/docs" style={{
                            padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
                            background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                            cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
                        }}>
                            Read Docs
                        </a>
                    </div>

                    {/* Typewriter */}
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#3EDDB9', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(62,221,185,0.15)', background: 'rgba(62,221,185,0.04)', display: 'inline-block' }}>
                        <span style={{ color: '#64748B' }}>$ </span>
                        <TypeWriter texts={[
                            'npx agtfi-mcp-server',
                            'zk.isCompliant(commitment)',
                            'wallet.transfer("0x...", "100")',
                            'zk.meetsRequirements(agent, 10, 50000)',
                            'Pay Alice 500 AlphaUSD with ZK Shield',
                        ]} />
                    </div>
                </div>

                {/* Scroll indicator */}
                <div style={{ marginTop: '48px', animation: 'bounce 2s infinite' }}>
                    <div style={{ width: '24px', height: '40px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center', paddingTop: '8px', margin: '0 auto' }}>
                        <div style={{ width: '3px', height: '8px', borderRadius: '2px', background: 'rgba(255,255,255,0.3)', animation: 'scrollDot 2s infinite' }} />
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* STATS BAR                                          */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,20,35,0.8)', padding: '40px 20px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'center' }}>
                    {[
                        { ref: c1.ref, val: `${c1.count}+`, label: 'Smart Contracts', sub: 'Deployed on Tempo L1', color: '#FF2D87' },
                        { ref: c2.ref, val: c2.count.toLocaleString(), label: 'ZK Constraints', sub: 'Across 5 circuits', color: '#1BBFEC' },
                        { ref: c3.ref, val: c3.count.toString(), label: 'Production Agents', sub: 'Web2 + Web3 hybrid', color: '#3EDDB9' },
                        { ref: c4.ref, val: `${c4.count}/11`, label: 'Tests Passing', sub: 'ZK circuit coverage', color: '#FF7D2C' },
                    ].map((s, i) => (
                        <div key={i} ref={s.ref}>
                            <div style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.val}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginTop: '4px' }}>{s.label}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* THE PROBLEM                                        */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '120px 20px', background: '#141B2D' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                        Every Protocol Solves <span style={{ color: '#FF2D87' }}>Payments</span>.
                        <br />None of Them Solve <span style={{ color: '#1BBFEC' }}>Trust</span>.
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '700px', margin: '0 auto 60px' }}>
                        x402, MPP, ACP, AP2 — every agent payment protocol answers &quot;how do agents pay?&quot; but none answer &quot;how do agents trust each other while paying?&quot;
                    </p>

                    {/* Comparison grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,45,135,0.15)', background: 'rgba(255,45,135,0.03)', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FF2D87', letterSpacing: '0.1em', marginBottom: '16px', textTransform: 'uppercase' }}>WITHOUT TRUST LAYER</div>
                            {['No OFAC compliance check', 'No agent reputation', 'All payments public on-chain', 'No fraud prevention', 'No dispute resolution'].map(t => (
                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.85rem', color: '#94A3B8' }}>
                                    <span style={{ color: '#EF4444', fontSize: '1rem' }}>&#10007;</span> {t}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '32px', borderRadius: '16px', border: '1px solid rgba(62,221,185,0.2)', background: 'rgba(62,221,185,0.03)', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3EDDB9', letterSpacing: '0.1em', marginBottom: '16px', textTransform: 'uppercase' }}>WITH AGENTIC FINANCE</div>
                            {['ZK compliance proofs (OFAC + AML)', 'Verifiable agent reputation', 'Privacy-preserving payments', 'On-chain fraud detection', 'Escrow + dispute resolution'].map(t => (
                                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.85rem', color: '#CBD5E1' }}>
                                    <span style={{ color: '#3EDDB9', fontSize: '1rem' }}>&#10003;</span> {t}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* THREE PILLARS                                      */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '120px 20px', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>
                            Three Capabilities.
                            <br /><span style={{ background: 'linear-gradient(135deg, #FF2D87, #1BBFEC, #3EDDB9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>No Other Protocol Has Them.</span>
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        {[
                            {
                                icon: '🔐', color: '#FF2D87', title: 'ZK Compliance',
                                desc: 'Agents prove OFAC non-membership and AML compliance without revealing identity. Sparse Merkle Tree + PLONK proofs. 13,591 constraints.',
                                stats: [{ k: 'Proof Time', v: '~15s' }, { k: 'Verification', v: '17ms' }],
                            },
                            {
                                icon: '⭐', color: '#1BBFEC', title: 'Agent Reputation',
                                desc: 'Anonymous credit scores for AI agents. Prove tx count, volume, and zero disputes — without revealing any transaction. Poseidon hash chain accumulator.',
                                stats: [{ k: 'Constraints', v: '41,265' }, { k: 'Claims/Proof', v: '32' }],
                            },
                            {
                                icon: '⚡', color: '#3EDDB9', title: 'Privacy Payments',
                                desc: 'ZK-shielded transfers, proof chaining for micropayments, MPP session compliance. 90%+ gas savings via incremental proof chains.',
                                stats: [{ k: 'Gas Savings', v: '90%+' }, { k: 'Batch Size', v: '16 tx' }],
                            },
                        ].map(p => (
                            <div key={p.title} style={{ padding: '36px', borderRadius: '20px', border: `1px solid ${p.color}20`, background: `${p.color}05`, transition: 'all 0.3s', cursor: 'default' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = `${p.color}40`; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = `${p.color}20`; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{p.icon}</div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: p.color, marginBottom: '12px' }}>{p.title}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.7, marginBottom: '20px' }}>{p.desc}</p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {p.stats.map(s => (
                                        <div key={s.k} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 900, color: p.color, fontFamily: 'monospace' }}>{s.v}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>{s.k}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* FOR DEVELOPERS                                     */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '120px 20px', background: '#141B2D', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>
                            Built for <span style={{ color: '#3EDDB9' }}>Developers</span>
                        </h2>
                        <p style={{ color: '#64748B', fontSize: '1rem', marginTop: '12px' }}>npm install. One line of code. Trust infrastructure ready.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {[
                            { title: 'MCP Payment Server', desc: 'Any AI agent (Claude Code, Cursor) gets payment capabilities', code: 'npx agtfi-mcp-server', badge: 'LIVE ON NPM', color: '#3EDDB9' },
                            { title: 'Compliance Middleware', desc: 'Drop-in Express middleware — one line adds ZK compliance', code: "app.use(complianceMiddleware({ ... }))", badge: 'SDK', color: '#1BBFEC' },
                            { title: 'Agent Wallet', desc: 'Full wallet with compliance + reputation built-in', code: "const wallet = new AgentWallet({ privateKey })", badge: 'SDK', color: '#FF2D87' },
                            { title: 'ZK Privacy API', desc: 'Check compliance, query reputation, verify proofs', code: "await zk.isCompliant(commitment)", badge: 'SDK', color: '#FF7D2C' },
                        ].map(d => (
                            <div key={d.title} style={{ padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#E2E8F0' }}>{d.title}</h4>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', color: d.color, border: `1px solid ${d.color}30`, background: `${d.color}08`, letterSpacing: '0.05em' }}>{d.badge}</span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '14px' }}>{d.desc}</p>
                                <div style={{ padding: '10px 16px', borderRadius: '8px', background: '#111827', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '0.78rem', color: '#3EDDB9' }}>
                                    <span style={{ color: '#64748B' }}>$ </span>{d.code}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <a href="https://github.com/Agentic-Finance/agentic-finance-protocol" target="_blank" rel="noopener"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', color: '#E2E8F0', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s' }}>
                            View on GitHub →
                        </a>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* AGENT MARKETPLACE PREVIEW                          */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '120px 20px', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '16px' }}>
                        <span style={{ color: '#FF7D2C' }}>50</span> Production Agents. Ready to Hire.
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1rem', marginBottom: '48px' }}>
                        From ZK-shielded payments to smart contract audits. Web2 + Web3 hybrid capabilities.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' }}>
                        {[
                            { emoji: '🔐', name: 'Shield Executor', cat: 'Privacy', price: '10' },
                            { emoji: '💼', name: 'Payroll Planner', cat: 'Payroll', price: '8' },
                            { emoji: '🚀', name: 'Token Deployer', cat: 'Deployment', price: '15' },
                            { emoji: '⚖️', name: 'Compliance Guardian', cat: 'Compliance', price: '12' },
                            { emoji: '📈', name: 'Trade Architect', cat: 'Trading', price: '20' },
                            { emoji: '🧭', name: 'Yield Navigator', cat: 'DeFi', price: '15' },
                            { emoji: '🔍', name: 'Code Sentinel', cat: 'Security', price: '18' },
                            { emoji: '🎨', name: 'NFT Studio', cat: 'Creative', price: '10' },
                        ].map(a => (
                            <div key={a.name} style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', transition: 'all 0.2s', cursor: 'pointer' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(62,221,185,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{a.emoji}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0' }}>{a.name}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>{a.cat}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3EDDB9', marginTop: '8px', fontFamily: 'monospace' }}>{a.price} aUSD</div>
                            </div>
                        ))}
                    </div>

                    <button onClick={onLaunchApp} style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, background: 'transparent', color: '#3EDDB9', border: '1px solid rgba(62,221,185,0.3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        Explore All 50 Agents →
                    </button>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* PROTOCOL STACK                                     */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '100px 20px', background: '#141B2D', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '48px' }}>
                        The <span style={{ color: '#1BBFEC' }}>Protocol Stack</span>
                    </h2>

                    {/* Clean layered stack */}
                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {[
                            { layer: 'Application', items: ['Dashboard', 'MCP Server', 'REST API', 'Agent SDK'], color: '#FF2D87' },
                            { layer: 'Trust', items: ['ZK Compliance', 'ZK Reputation', 'Agent Discovery', 'MPP Gateway'], color: '#1BBFEC' },
                            { layer: 'Protocol', items: ['Proof Chaining', 'Escrow', 'Streams', 'ZK Shield'], color: '#3EDDB9' },
                            { layer: 'Settlement', items: ['Tempo L1', 'ShieldVault', 'Multisend', 'NexusV2'], color: '#FF7D2C' },
                        ].map((l, i) => (
                            <div key={l.layer} style={{
                                display: 'flex', alignItems: 'center', padding: '18px 28px',
                                borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                background: `linear-gradient(90deg, ${l.color}08, transparent)`,
                            }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, marginRight: '16px', flexShrink: 0, boxShadow: `0 0 8px ${l.color}60` }} />
                                <span style={{ fontWeight: 800, color: l.color, fontSize: '0.8rem', width: '110px', textAlign: 'left', flexShrink: 0 }}>{l.layer}</span>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {l.items.map(item => (
                                        <span key={item} style={{
                                            fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px',
                                            background: `${l.color}10`, border: `1px solid ${l.color}20`,
                                            color: '#CBD5E1', fontWeight: 500,
                                        }}>{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* HOW IT WORKS                                        */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '120px 20px', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '16px' }}>
                        How It <span style={{ color: '#3EDDB9' }}>Works</span>
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1rem', marginBottom: '64px' }}>From zero to trusted agent in four steps</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0' }}>
                        {[
                            { step: '01', title: 'Install SDK', desc: 'npm install agtfi-mcp-server or import the SDK into your agent', icon: '📦', color: '#FF2D87' },
                            { step: '02', title: 'Prove Compliance', desc: 'Generate ZK proof showing OFAC non-membership + AML compliance', icon: '🔐', color: '#1BBFEC' },
                            { step: '03', title: 'Build Reputation', desc: 'Each successful payment adds to your verifiable on-chain history', icon: '⭐', color: '#3EDDB9' },
                            { step: '04', title: 'Transact Privately', desc: 'Pay, receive, and settle — all privacy-preserving, all autonomous', icon: '⚡', color: '#FF7D2C' },
                        ].map((s, i) => (
                            <div key={s.step} style={{ padding: '32px 24px', position: 'relative', textAlign: 'center' }}>
                                {i < 3 && <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '40px', height: '2px', background: `linear-gradient(90deg, ${s.color}40, transparent)` }} />}
                                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{s.icon}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: s.color, letterSpacing: '0.15em', marginBottom: '8px' }}>STEP {s.step}</div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#E2E8F0', marginBottom: '8px' }}>{s.title}</h4>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.6 }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* WHY AGENTIC FINANCE                                 */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '100px 20px', background: '#141B2D', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '56px' }}>
                        Why <span style={{ color: '#1BBFEC' }}>Agentic Finance</span>?
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {[
                            { q: 'Why can\'t I just use my own local agent?', a: 'You can — and should. Your local agent is the brain. Agentic Finance provides the on-chain hands: funded wallets, ZK proofs, escrow protection, and verifiable reputation that local agents can\'t generate alone.', icon: '🧠' },
                            { q: 'How is this different from x402 or MPP?', a: 'x402 and MPP solve payments. We solve trust. Our ZK compliance proofs and agent reputation layer plug into any payment protocol — including x402 and MPP. We\'re complementary, not competing.', icon: '🔗' },
                            { q: 'Is the ZK cryptography real?', a: 'Yes. Real Circom V2 circuits, real PLONK proofs, real on-chain verification. 11/11 circuit tests passing. Audited with Slither. 96,121 total constraints across 5 production circuits.', icon: '🔐' },
                            { q: 'What happens if an agent fails a task?', a: 'Escrow protection via NexusV2. Funds are locked in smart contracts until the task is completed. Dispute resolution and timeout-based refunds are built into the protocol.', icon: '🛡️' },
                            { q: 'Can I use this on other chains?', a: 'Currently on Tempo L1 (testnet). Cross-chain ZK verification via LayerZero DVN is built. Mainnet deployment planned after full audit completion.', icon: '⛓️' },
                            { q: 'Is this open source?', a: 'Yes. MIT license. All contracts, circuits, SDK, and specs on GitHub. The trust infrastructure for the agentic economy should be a public good.', icon: '📂' },
                        ].map(f => (
                            <div key={f.q} style={{ padding: '24px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: '2px' }}>{f.icon}</span>
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#E2E8F0', marginBottom: '8px', lineHeight: 1.3 }}>{f.q}</h4>
                                        <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.7 }}>{f.a}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* BLOG PREVIEW                                        */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '100px 20px', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Latest <span style={{ color: '#1BBFEC' }}>Insights</span></h2>
                        <a href="/community" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1BBFEC', textDecoration: 'none' }}>View all →</a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {[
                            { title: 'Building the Trust Layer for Machine Payments', desc: 'ZK compliance proofs, agent reputation, and privacy payments — the infrastructure no other protocol has.', tag: 'Technical', date: 'Mar 2026', href: '/community/blog/zk-trust-layer', color: '#3EDDB9' },
                            { title: 'Security Standard for Open Agentic Commerce', desc: '10 security requirements for autonomous agent transactions at machine speed.', tag: 'Security', date: 'Mar 2026', href: '/community/blog/security-standard', color: '#FF2D87' },
                        ].map(b => (
                            <a key={b.title} href={b.href} style={{ padding: '28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', textDecoration: 'none', display: 'block', transition: 'all 0.2s' }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = `${b.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', color: b.color, border: `1px solid ${b.color}30`, background: `${b.color}08` }}>{b.tag}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>{b.date}</span>
                                </div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#E2E8F0', marginBottom: '8px', lineHeight: 1.3 }}>{b.title}</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.6 }}>{b.desc}</p>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* FINAL CTA                                          */}
            {/* ═══════════════════════════════════════════════════ */}
            <section style={{ padding: '160px 20px', background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Glow */}
                <div style={{ position: 'absolute', bottom: '-200px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,45,135,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 10 }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '20px' }}>
                        Ready to Build?
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1.05rem', marginBottom: '36px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                        The trust infrastructure for autonomous commerce is live. Open source. MIT license.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={onLaunchApp} style={{
                            padding: '16px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 800,
                            background: 'linear-gradient(135deg, #FF2D87, #1BBFEC)', color: '#fff',
                            border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(255,45,135,0.2)',
                        }}>
                            Launch App →
                        </button>
                        <a href="https://github.com/Agentic-Finance/agentic-finance-protocol" target="_blank" rel="noopener"
                            style={{ padding: '16px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none' }}>
                            GitHub
                        </a>
                        <a href="/docs" style={{ padding: '16px 36px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none' }}>
                            Documentation
                        </a>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════ */}
            {/* FOOTER                                             */}
            {/* ═══════════════════════════════════════════════════ */}
            <footer style={{ padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0F1629' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Image src="/logo-v2.png" alt="AF" width={24} height={24} style={{ borderRadius: '6px' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748B' }}>Agentic Finance</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                        The Economy Runs on Trust. We Built It for Machines.
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.75rem' }}>
                        <a href="https://github.com/Agentic-Finance" target="_blank" rel="noopener" style={{ color: '#64748B', textDecoration: 'none' }}>GitHub</a>
                        <a href="https://www.npmjs.com/package/agtfi-mcp-server" target="_blank" rel="noopener" style={{ color: '#64748B', textDecoration: 'none' }}>npm</a>
                        <a href="/docs" style={{ color: '#64748B', textDecoration: 'none' }}>Docs</a>
                        <a href="/community" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</a>
                    </div>
                </div>
            </footer>

            {/* CSS Animations */}
            <style>{`
                @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(8px); } }
                @keyframes scrollDot { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(8px); } }
                @keyframes logo-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes pulse-glow { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
                @keyframes orbit-tilt-1 { 0% { transform: rotateX(60deg) rotateZ(0deg); } 100% { transform: rotateX(60deg) rotateZ(360deg); } }
                @keyframes orbit-tilt-2 { 0% { transform: rotateX(75deg) rotateY(20deg) rotateZ(0deg); } 100% { transform: rotateX(75deg) rotateY(20deg) rotateZ(360deg); } }
                @keyframes orbit-tilt-3 { 0% { transform: rotateX(45deg) rotateY(-30deg) rotateZ(0deg); } 100% { transform: rotateX(45deg) rotateY(-30deg) rotateZ(360deg); } }
                @media (max-width: 768px) {
                    section > div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
                    section > div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
                    section > div > div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
                    section > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
