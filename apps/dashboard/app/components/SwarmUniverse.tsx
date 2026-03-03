'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────

interface AuditEvent {
    id: string;
    agentName: string | null;
    eventType: string;
    title: string;
    severity: string;
    createdAt: string;
    txHash: string | null;
}

interface SwarmStats {
    totalSwarms: number;
    activeSwarms: number;
    totalBudgetLocked: number;
    a2aVolume: number;
    a2aCount: number;
    intelCount: number;
    auditCount: number;
    totalReleased: number;
}

interface ChartPoint {
    name: string;
    volume: number;
}

// ── Node Types ─────────────────────────────────────────────

interface OrbitNode {
    id: string;
    label: string;
    emoji: string;
    ring: number; // 0=core, 1=inner, 2=mid, 3=outer
    angle: number;
    speed: number;
    radius: number;
    color: string;
    pulsePhase: number;
    size: number;
    z: number; // depth 0.3-1.0
    type: 'core' | 'swarm' | 'agent' | 'intel' | 'escrow' | 'transfer';
    // Ghost trail for agents
    trail: { x: number; y: number; opacity: number }[];
    // Data fields for click panel
    budget?: number;
    status?: string;
    wallet?: string;
    role?: string;
}

interface Particle {
    fromNode: number;
    toNode: number;
    progress: number;
    speed: number;
    color: string;
    size: number;
    trail: { x: number; y: number }[];
    // Bezier control point
    cpx: number;
    cpy: number;
    isComet: boolean;
}

interface Star {
    x: number;
    y: number;
    size: number;
    brightness: number;
    twinkleSpeed: number;
    twinklePhase: number;
    layer: number; // 0=far, 1=mid, 2=near
    driftX: number;
    driftY: number;
}

interface ShootingStar {
    x: number;
    y: number;
    vx: number;
    vy: number;
    trail: { x: number; y: number; opacity: number }[];
    life: number;
    maxLife: number;
    size: number;
}

interface Nebula {
    x: number;
    y: number;
    radius: number;
    color1: string;
    color2: string;
    rotation: number;
    rotationSpeed: number;
    pulsePhase: number;
    opacity: number;
}

interface GravWave {
    radius: number;
    maxRadius: number;
    opacity: number;
    birth: number;
}

interface DustParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    life: number;
    maxLife: number;
}

interface LiveEvent {
    id: string;
    text: string;
    icon: string;
    color: string;
    time: string;
    opacity: number;
}

interface SelectedNode {
    node: OrbitNode;
    screenX: number;
    screenY: number;
}

// ── Constants ──────────────────────────────────────────────

const RING_RADII = [0, 120, 210, 290];
const COLORS = {
    core: '#d946ef',
    swarm: '#f59e0b',
    agent: '#3b82f6',
    transfer: '#10b981',
    intel: '#8b5cf6',
    escrow: '#ef4444',
    a2a: '#06b6d4',
    milestone: '#22c55e',
};

const EVENT_ICONS: Record<string, string> = {
    SWARM_CREATED: '🐝', SWARM_COMPLETED: '🎉', AGENT_JOINED: '🤖',
    MILESTONE_SUBMITTED: '📤', MILESTONE_APPROVED: '✅', MILESTONE_REJECTED: '❌',
    A2A_TRANSFER: '⚡', INTEL_SUBMITTED: '🛡️', INTEL_VERIFIED: '🔬',
    INTEL_PURCHASED: '💰', ESCROW_LOCKED: '🔐', ESCROW_RELEASED: '🔓',
    ESCROW_SETTLED: '💎', STREAM_CREATED: '🔄', BUDGET_ALLOCATED: '💵',
    SYSTEM_EVENT: '⚙️',
};

const SEVERITY_COLORS: Record<string, string> = {
    INFO: '#3b82f6', SUCCESS: '#10b981', WARNING: '#f59e0b', ERROR: '#ef4444',
};

const PARTICLE_COLORS = [COLORS.a2a, COLORS.swarm, COLORS.intel, COLORS.milestone, COLORS.core];

// ── Helpers ────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function quadBezier(p0: number, p1: number, p2: number, t: number) {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ── Component ──────────────────────────────────────────────

function SwarmUniverse() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number>(0);
    const nodesRef = useRef<OrbitNode[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const starsRef = useRef<Star[]>([]);
    const shootingStarsRef = useRef<ShootingStar[]>([]);
    const nebulaeRef = useRef<Nebula[]>([]);
    const gravWavesRef = useRef<GravWave[]>([]);
    const dustRef = useRef<DustParticle[]>([]);
    const liveEventsRef = useRef<LiveEvent[]>([]);
    const statsRef = useRef<SwarmStats | null>(null);
    const chartRef = useRef<ChartPoint[]>([]);
    const mouseRef = useRef<{ x: number; y: number }>({ x: -999, y: -999 });
    const timeRef = useRef(0);
    const sizeRef = useRef({ w: 0, h: 0 });
    const dprRef = useRef(1);
    const hoveredNodeRef = useRef<number>(-1);
    const nodeResonanceRef = useRef<number[]>([]);
    const cameraRef = useRef({ x: 0, y: 0 });

    const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
    const [stats, setStats] = useState<SwarmStats | null>(null);
    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

    // ── Initialize Stars ──────────────────────────────────

    const initStars = useCallback(() => {
        const stars: Star[] = [];
        // Layer 0 (far): 400 tiny dim stars
        for (let i = 0; i < 400; i++) {
            stars.push({
                x: Math.random(), y: Math.random(),
                size: 0.3 + Math.random() * 0.5,
                brightness: 0.15 + Math.random() * 0.25,
                twinkleSpeed: 0.005 + Math.random() * 0.01,
                twinklePhase: Math.random() * Math.PI * 2,
                layer: 0,
                driftX: (Math.random() - 0.5) * 0.00003,
                driftY: (Math.random() - 0.5) * 0.00003,
            });
        }
        // Layer 1 (mid): 150 medium stars
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random(), y: Math.random(),
                size: 0.8 + Math.random() * 0.7,
                brightness: 0.3 + Math.random() * 0.3,
                twinkleSpeed: 0.01 + Math.random() * 0.02,
                twinklePhase: Math.random() * Math.PI * 2,
                layer: 1,
                driftX: (Math.random() - 0.5) * 0.00008,
                driftY: (Math.random() - 0.5) * 0.00008,
            });
        }
        // Layer 2 (near): 50 bright stars
        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random(), y: Math.random(),
                size: 1.5 + Math.random() * 1.0,
                brightness: 0.5 + Math.random() * 0.5,
                twinkleSpeed: 0.02 + Math.random() * 0.03,
                twinklePhase: Math.random() * Math.PI * 2,
                layer: 2,
                driftX: (Math.random() - 0.5) * 0.00015,
                driftY: (Math.random() - 0.5) * 0.00015,
            });
        }
        starsRef.current = stars;
    }, []);

    // ── Initialize Nebulae ────────────────────────────────

    const initNebulae = useCallback(() => {
        nebulaeRef.current = [
            { x: 0.25, y: 0.3, radius: 250, color1: 'rgba(217,70,239,0.04)', color2: 'rgba(217,70,239,0)', rotation: 0, rotationSpeed: 0.00008, pulsePhase: 0, opacity: 0.04 },
            { x: 0.75, y: 0.6, radius: 200, color1: 'rgba(99,102,241,0.035)', color2: 'rgba(99,102,241,0)', rotation: Math.PI / 3, rotationSpeed: -0.00006, pulsePhase: 1.5, opacity: 0.035 },
            { x: 0.5, y: 0.2, radius: 280, color1: 'rgba(245,158,11,0.03)', color2: 'rgba(245,158,11,0)', rotation: Math.PI, rotationSpeed: 0.00005, pulsePhase: 3, opacity: 0.03 },
            { x: 0.6, y: 0.8, radius: 180, color1: 'rgba(139,92,246,0.03)', color2: 'rgba(139,92,246,0)', rotation: Math.PI * 1.5, rotationSpeed: -0.00007, pulsePhase: 4.5, opacity: 0.03 },
        ];
    }, []);

    // ── Initialize Dust ─────────────────────────────────

    const initDust = useCallback(() => {
        const dust: DustParticle[] = [];
        for (let i = 0; i < 80; i++) {
            dust.push({
                x: Math.random(), y: Math.random(),
                vx: (Math.random() - 0.5) * 0.00005,
                vy: (Math.random() - 0.5) * 0.00005,
                size: 0.3 + Math.random() * 0.7,
                opacity: 0.05 + Math.random() * 0.07,
                life: Math.random() * 2000,
                maxLife: 2000 + Math.random() * 3000,
            });
        }
        dustRef.current = dust;
    }, []);

    // ── Initialize Nodes ──────────────────────────────────

    const initNodes = useCallback(() => {
        const nodes: OrbitNode[] = [];

        // Core node — the "sun"
        nodes.push({
            id: 'core', label: 'PayPol', emoji: '⚡', ring: 0,
            angle: 0, speed: 0, radius: 0, color: COLORS.core,
            pulsePhase: 0, size: 32, z: 1.0,
            type: 'core', trail: [],
            budget: 0, status: 'ACTIVE',
        });

        // Inner ring — swarm sessions
        const swarmDefs = [
            { name: 'DeFi Audit', budget: 18000, status: 'ACTIVE' },
            { name: 'Token Launch', budget: 25000, status: 'ACTIVE' },
            { name: 'DAO Gov', budget: 12000, status: 'COMPLETED' },
            { name: 'MEV Guard', budget: 15000, status: 'ACTIVE' },
            { name: 'Bridge Scan', budget: 8000, status: 'ACTIVE' },
        ];
        swarmDefs.forEach((def, i) => {
            nodes.push({
                id: `swarm-${i}`, label: def.name, emoji: '🐝',
                ring: 1, angle: (i / swarmDefs.length) * Math.PI * 2,
                speed: 0.0003 + Math.random() * 0.0002,
                radius: RING_RADII[1] + (Math.random() - 0.5) * 20,
                color: COLORS.swarm, pulsePhase: Math.random() * Math.PI * 2,
                size: 18 + (def.budget / 25000) * 4,
                z: 0.6 + Math.random() * 0.3,
                type: 'swarm', trail: [],
                budget: def.budget, status: def.status,
            });
        });

        // Middle ring — agents
        const agentDefs = [
            { name: 'Guard', role: 'Security', wallet: '0x33F7..0793' },
            { name: 'Sentinel', role: 'Monitor', wallet: '0xA1B2..C3D4' },
            { name: 'Forge', role: 'Builder', wallet: '0xE5F6..7890' },
            { name: 'Scout', role: 'Recon', wallet: '0x1234..5678' },
            { name: 'Proof', role: 'Verifier', wallet: '0xABCD..EF01' },
            { name: 'Analyzer', role: 'Intel', wallet: '0x2345..6789' },
            { name: 'Optimizer', role: 'Gas', wallet: '0x9876..5432' },
            { name: 'Manager', role: 'Ops', wallet: '0xFEDC..BA98' },
        ];
        agentDefs.forEach((def, i) => {
            nodes.push({
                id: `agent-${i}`, label: def.name, emoji: '🤖',
                ring: 2, angle: (i / agentDefs.length) * Math.PI * 2 + 0.2,
                speed: 0.0005 + Math.random() * 0.0003,
                radius: RING_RADII[2] + (Math.random() - 0.5) * 25,
                color: COLORS.agent, pulsePhase: Math.random() * Math.PI * 2,
                size: 12 + Math.random() * 4,
                z: 0.4 + Math.random() * 0.4,
                type: 'agent', trail: [],
                wallet: def.wallet, role: def.role,
            });
        });

        // Outer ring — intel, escrow, transfer nodes
        const outerDefs = [
            { name: 'Intel-Alpha', type: 'intel' as const, emoji: '🛡️' },
            { name: 'Intel-Beta', type: 'intel' as const, emoji: '🛡️' },
            { name: 'Escrow-Main', type: 'escrow' as const, emoji: '🔐' },
            { name: 'Escrow-Stream', type: 'escrow' as const, emoji: '🔐' },
            { name: 'ZK-Verify', type: 'transfer' as const, emoji: '⚡' },
            { name: 'A2A-Hub', type: 'transfer' as const, emoji: '⚡' },
        ];
        outerDefs.forEach((def, i) => {
            nodes.push({
                id: `outer-${i}`, label: def.name, emoji: def.emoji,
                ring: 3, angle: (i / outerDefs.length) * Math.PI * 2 + 0.5,
                speed: 0.0002 + Math.random() * 0.00015,
                radius: RING_RADII[3] + (Math.random() - 0.5) * 20,
                color: def.type === 'intel' ? COLORS.intel : def.type === 'escrow' ? COLORS.escrow : COLORS.transfer,
                pulsePhase: Math.random() * Math.PI * 2,
                size: 8 + Math.random() * 4,
                z: 0.3 + Math.random() * 0.3,
                type: def.type, trail: [],
            });
        });

        nodesRef.current = nodes;
        nodeResonanceRef.current = new Array(nodes.length).fill(0);
    }, []);

    // ── Spawn Particle (Bezier) ──────────────────────────

    const spawnParticle = useCallback(() => {
        const nodes = nodesRef.current;
        if (nodes.length < 2) return;
        if (particlesRef.current.length >= 80) return;

        const from = Math.floor(Math.random() * nodes.length);
        let to = Math.floor(Math.random() * nodes.length);
        while (to === from) to = Math.floor(Math.random() * nodes.length);

        const isComet = Math.random() < 0.05 && particlesRef.current.filter(p => p.isComet).length < 3;

        particlesRef.current.push({
            fromNode: from, toNode: to, progress: 0,
            speed: isComet ? 0.002 : 0.003 + Math.random() * 0.004,
            color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            size: isComet ? 4 + Math.random() * 2 : 1.5 + Math.random() * 2,
            trail: [],
            cpx: (Math.random() - 0.5) * 160, // Bezier control point offset
            cpy: (Math.random() - 0.5) * 160,
            isComet,
        });
    }, []);

    // ── Fetch Data ──────────────────────────────────────

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, chartRes, auditRes] = await Promise.all([
                fetch('/api/swarm/stats'),
                fetch('/api/stats/chart'),
                fetch('/api/audit/timeline?limit=8'),
            ]);
            const [statsData, chartData, auditData] = await Promise.all([
                statsRes.json(), chartRes.json(), auditRes.json(),
            ]);

            if (statsData.success) {
                statsRef.current = statsData.stats;
                setStats(statsData.stats);
            }
            if (chartData.success) chartRef.current = chartData.data;
            if (auditData.success) {
                const newEvents: LiveEvent[] = auditData.events.slice(0, 8).map((e: AuditEvent) => ({
                    id: e.id,
                    text: e.title,
                    icon: EVENT_ICONS[e.eventType] || '📋',
                    color: SEVERITY_COLORS[e.severity] || '#3b82f6',
                    time: new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    opacity: 1,
                }));
                liveEventsRef.current = newEvents;
                setLiveEvents(newEvents);
            }
        } catch (err) {
            console.error('SwarmUniverse fetch error:', err);
        }
    }, []);

    // ── Get Node Position (3D Perspective) ────────────────

    const getNodePos = useCallback((node: OrbitNode, cx: number, cy: number, camX: number, camY: number) => {
        if (node.ring === 0) return { x: cx + camX, y: cy + camY };
        const scale = 0.4 + node.z * 0.6;
        const ry = node.radius * 0.55 * node.z; // perspective squash
        return {
            x: cx + Math.cos(node.angle) * node.radius * scale + camX * (0.5 + node.z * 0.5),
            y: cy + Math.sin(node.angle) * ry * scale + camY * (0.5 + node.z * 0.5),
        };
    }, []);

    // ── Draw Stars ──────────────────────────────────────

    const drawStars = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
        for (const star of starsRef.current) {
            // Update drift
            star.x += star.driftX;
            star.y += star.driftY;
            // Wrap around
            if (star.x < 0) star.x = 1;
            if (star.x > 1) star.x = 0;
            if (star.y < 0) star.y = 1;
            if (star.y > 1) star.y = 0;

            star.twinklePhase += star.twinkleSpeed;
            const twinkle = star.brightness * (0.5 + 0.5 * Math.sin(star.twinklePhase));

            const sx = star.x * w;
            const sy = star.y * h;

            ctx.globalAlpha = twinkle;
            ctx.fillStyle = star.layer === 2 ? '#e2e8f0' : star.layer === 1 ? '#94a3b8' : '#64748b';
            ctx.fillRect(sx, sy, star.size, star.size);
        }
        ctx.globalAlpha = 1;
    }, []);

    // ── Draw Shooting Stars ─────────────────────────────

    const drawShootingStars = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Spawn
        if (Math.random() < 0.003) {
            shootingStarsRef.current.push({
                x: Math.random() * w * 0.8,
                y: Math.random() * h * 0.3,
                vx: 3 + Math.random() * 4,
                vy: 1 + Math.random() * 2,
                trail: [],
                life: 0, maxLife: 30 + Math.random() * 30,
                size: 1.5 + Math.random() * 1.5,
            });
        }

        const alive: ShootingStar[] = [];
        for (const ss of shootingStarsRef.current) {
            ss.x += ss.vx;
            ss.y += ss.vy;
            ss.life++;
            ss.trail.push({ x: ss.x, y: ss.y, opacity: 1 });
            if (ss.trail.length > 30) ss.trail.shift();

            // Fade trail
            ss.trail.forEach((tp, i) => {
                tp.opacity = (i / ss.trail.length) * (1 - ss.life / ss.maxLife);
            });

            if (ss.life < ss.maxLife) {
                // Draw trail
                if (ss.trail.length > 1) {
                    for (let i = 1; i < ss.trail.length; i++) {
                        const prev = ss.trail[i - 1];
                        const curr = ss.trail[i];
                        ctx.beginPath();
                        ctx.moveTo(prev.x, prev.y);
                        ctx.lineTo(curr.x, curr.y);
                        ctx.strokeStyle = `rgba(255,255,255,${curr.opacity * 0.6})`;
                        ctx.lineWidth = ss.size * (i / ss.trail.length);
                        ctx.stroke();
                    }
                }
                // Draw head
                ctx.beginPath();
                ctx.arc(ss.x, ss.y, ss.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - ss.life / ss.maxLife)})`;
                ctx.fill();

                alive.push(ss);
            }
        }
        shootingStarsRef.current = alive;
    }, []);

    // ── Draw Nebulae ────────────────────────────────────

    const drawNebulae = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
        for (const neb of nebulaeRef.current) {
            neb.rotation += neb.rotationSpeed;
            neb.pulsePhase += 0.003;
            const pulse = 0.7 + 0.3 * Math.sin(neb.pulsePhase);
            const nx = neb.x * w;
            const ny = neb.y * h;
            const r = neb.radius * pulse;

            ctx.save();
            ctx.translate(nx, ny);
            ctx.rotate(neb.rotation);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, neb.color1);
            grad.addColorStop(1, neb.color2);
            ctx.fillStyle = grad;
            ctx.beginPath();
            // Slightly elliptical nebula
            ctx.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }, []);

    // ── Draw Dust ───────────────────────────────────────

    const drawDust = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
        for (const d of dustRef.current) {
            d.x += d.vx;
            d.y += d.vy;
            d.life++;
            if (d.life > d.maxLife) {
                d.x = Math.random();
                d.y = Math.random();
                d.life = 0;
            }
            // Wrap
            if (d.x < 0) d.x = 1;
            if (d.x > 1) d.x = 0;
            if (d.y < 0) d.y = 1;
            if (d.y > 1) d.y = 0;

            const fadeIn = Math.min(d.life / 100, 1);
            const fadeOut = Math.max(1 - (d.life - d.maxLife + 100) / 100, 0);
            const alpha = d.opacity * fadeIn * fadeOut;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(d.x * w, d.y * h, d.size, d.size);
        }
        ctx.globalAlpha = 1;
    }, []);

    // ── Draw Gravitational Waves ────────────────────────

    const drawGravWaves = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, camX: number, camY: number) => {
        const alive: GravWave[] = [];
        for (const gw of gravWavesRef.current) {
            gw.radius += 1.8;
            gw.opacity -= 0.006;

            if (gw.opacity > 0) {
                const progress = gw.radius / gw.maxRadius;
                // Color shifts: fuchsia → amber → blue
                let color: string;
                if (progress < 0.33) {
                    color = hexToRgba('#d946ef', gw.opacity);
                } else if (progress < 0.66) {
                    color = hexToRgba('#f59e0b', gw.opacity);
                } else {
                    color = hexToRgba('#3b82f6', gw.opacity);
                }

                ctx.beginPath();
                ctx.ellipse(cx + camX, cy + camY, gw.radius, gw.radius * 0.55, 0, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Check if wave passes through nodes — resonate
                const nodes = nodesRef.current;
                for (let ni = 1; ni < nodes.length; ni++) {
                    const pos = getNodePos(nodes[ni], cx, cy, camX, camY);
                    const dist = Math.sqrt((pos.x - cx - camX) ** 2 + ((pos.y - cy - camY) / 0.55) ** 2);
                    if (Math.abs(dist - gw.radius) < 5) {
                        nodeResonanceRef.current[ni] = 1;
                    }
                }

                alive.push(gw);
            }
        }
        gravWavesRef.current = alive;
    }, [getNodePos]);

    // ── Draw Core (Sun with Corona) ─────────────────────

    const drawCore = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number) => {
        // Outer glow
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 5);
        outerGlow.addColorStop(0, 'rgba(217,70,239,0.12)');
        outerGlow.addColorStop(0.3, 'rgba(217,70,239,0.05)');
        outerGlow.addColorStop(0.7, 'rgba(245,158,11,0.02)');
        outerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(x - size * 5, y - size * 5, size * 10, size * 10);

        // Corona rays
        const rayCount = 8;
        const rayRotation = t * 0.0003;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + rayRotation;
            const rayLen = size * 2.5 + Math.sin(t * 0.002 + i) * size * 0.8;
            const rayWidth = size * 0.3;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(size * 0.8, -rayWidth / 2);
            ctx.lineTo(rayLen, 0);
            ctx.lineTo(size * 0.8, rayWidth / 2);
            ctx.closePath();

            const rayGrad = ctx.createLinearGradient(size * 0.8, 0, rayLen, 0);
            rayGrad.addColorStop(0, 'rgba(217,70,239,0.3)');
            rayGrad.addColorStop(0.5, 'rgba(245,158,11,0.1)');
            rayGrad.addColorStop(1, 'rgba(245,158,11,0)');
            ctx.fillStyle = rayGrad;
            ctx.fill();
            ctx.restore();
        }

        // Inner lens flare
        const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
        innerGlow.addColorStop(0, 'rgba(255,255,255,0.4)');
        innerGlow.addColorStop(0.15, 'rgba(217,70,239,0.35)');
        innerGlow.addColorStop(0.5, 'rgba(217,70,239,0.08)');
        innerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Core body
        const coreGrad = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, 0, x, y, size);
        coreGrad.addColorStop(0, '#fde68a');
        coreGrad.addColorStop(0.3, '#d946ef');
        coreGrad.addColorStop(0.8, '#7c3aed');
        coreGrad.addColorStop(1, '#4c1d95');
        ctx.beginPath();
        ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Bright center spot
        ctx.beginPath();
        ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
    }, []);

    // ── Draw Frame ──────────────────────────────────────

    const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
        const w = sizeRef.current.w;
        const h = sizeRef.current.h;
        const dpr = dprRef.current;
        const cx = w / 2;
        const cy = h / 2 + 10;

        // Camera breathing
        cameraRef.current.x = Math.sin(t * 0.0002) * 5;
        cameraRef.current.y = Math.cos(t * 0.00015) * 3;
        const camX = cameraRef.current.x;
        const camY = cameraRef.current.y;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // ── Deep space background ──
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, 'rgba(20,10,40,0.3)');
        bgGrad.addColorStop(0.4, 'rgba(10,8,25,0.1)');
        bgGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // ── Draw nebulae (behind everything) ──
        drawNebulae(ctx, w, h, t);

        // ── Draw stars ──
        drawStars(ctx, w, h, t);

        // ── Draw dust ──
        drawDust(ctx, w, h);

        // ── Draw shooting stars ──
        drawShootingStars(ctx, w, h);

        // ── Draw orbit rings with perspective ──
        [1, 2, 3].forEach((ring) => {
            const r = RING_RADII[ring];
            const ry = r * 0.55;
            ctx.beginPath();
            ctx.ellipse(cx + camX, cy + camY, r, ry, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${0.035 - ring * 0.007})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // ── Draw gravitational waves ──
        drawGravWaves(ctx, cx, cy, camX, camY);

        // ── Compute all node positions ──
        const nodes = nodesRef.current;
        const positions: { x: number; y: number; z: number; idx: number }[] = [];

        nodes.forEach((node, i) => {
            node.angle += node.speed * 16;
            node.pulsePhase += 0.02;
            const pos = getNodePos(node, cx, cy, camX, camY);
            positions.push({ x: pos.x, y: pos.y, z: node.z, idx: i });
        });

        // Sort by z (far first for painter's algorithm)
        const sortedPositions = [...positions].sort((a, b) => a.z - b.z);

        // ── Constellation lines (agents in same swarm) ──
        // Connect swarm nodes to their agent nodes
        for (let si = 1; si <= 5; si++) { // swarm indices
            const swarmPos = positions[si];
            // Connect to 2 agents based on index
            const agentIdx1 = 6 + ((si - 1) * 2) % 8;
            const agentIdx2 = 6 + ((si - 1) * 2 + 1) % 8;
            [agentIdx1, agentIdx2].forEach(ai => {
                if (ai < positions.length) {
                    const agentPos = positions[ai];
                    ctx.beginPath();
                    ctx.moveTo(swarmPos.x, swarmPos.y);
                    ctx.lineTo(agentPos.x, agentPos.y);
                    ctx.strokeStyle = 'rgba(245,158,11,0.04)';
                    ctx.lineWidth = 0.5;
                    ctx.setLineDash([2, 6]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            });
        }

        // ── Draw nodes (sorted by depth) ──
        let hoveredIdx = -1;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        for (const sp of sortedPositions) {
            const i = sp.idx;
            const node = nodes[i];
            const pos = sp;
            const zScale = 0.4 + node.z * 0.6;
            const zOpacity = 0.3 + node.z * 0.7;
            const pulse = Math.sin(node.pulsePhase) * 0.2 + 0.8;
            const resonance = nodeResonanceRef.current[i] || 0;
            const effectiveSize = node.size * zScale * (1 + resonance * 0.3);

            // Check hover
            const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
            const isHovered = dist < effectiveSize * 1.5;
            if (isHovered) hoveredIdx = i;

            const hoverScale = isHovered ? 1.3 : 1;
            const drawSize = effectiveSize * pulse * hoverScale;

            // Decay resonance
            if (nodeResonanceRef.current[i] > 0) {
                nodeResonanceRef.current[i] *= 0.95;
                if (nodeResonanceRef.current[i] < 0.01) nodeResonanceRef.current[i] = 0;
            }

            // Core node — special rendering
            if (node.ring === 0) {
                drawCore(ctx, pos.x, pos.y, drawSize, t);
                // Label
                ctx.font = 'bold 12px system-ui';
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.textAlign = 'center';
                ctx.fillText(node.label, pos.x, pos.y + drawSize + 18);
                continue;
            }

            // Ghost trail for agent nodes
            if (node.type === 'agent') {
                node.trail.push({ x: pos.x, y: pos.y, opacity: 0.3 });
                if (node.trail.length > 20) node.trail.shift();
                for (let ti = 0; ti < node.trail.length; ti++) {
                    const tp = node.trail[ti];
                    const trailOpacity = (ti / node.trail.length) * 0.08 * zOpacity;
                    ctx.globalAlpha = trailOpacity;
                    ctx.beginPath();
                    ctx.arc(tp.x, tp.y, drawSize * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = node.color;
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            ctx.globalAlpha = zOpacity;

            // Atmospheric halo for swarm nodes
            if (node.ring === 1) {
                const haloR = drawSize * 2.5;
                const halo = ctx.createRadialGradient(pos.x, pos.y, drawSize * 0.8, pos.x, pos.y, haloR);
                halo.addColorStop(0, hexToRgba(node.color, 0.15 + resonance * 0.2));
                halo.addColorStop(0.5, hexToRgba(node.color, 0.04));
                halo.addColorStop(1, 'transparent');
                ctx.fillStyle = halo;
                ctx.fillRect(pos.x - haloR, pos.y - haloR, haloR * 2, haloR * 2);

                // Halo ring
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, drawSize * 1.6, 0, Math.PI * 2);
                ctx.strokeStyle = hexToRgba(node.color, 0.12 + resonance * 0.15);
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Outer ring — twinkle
            if (node.ring === 3) {
                const twinkle = Math.sin(t * 0.003 + node.pulsePhase) * 0.4 + 0.6;
                ctx.globalAlpha = zOpacity * twinkle;
            }

            // Glow
            if (node.ring <= 2) {
                const glowSize = drawSize * (node.ring === 1 ? 3 : 2.2);
                const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
                glow.addColorStop(0, hexToRgba(node.color, 0.1 + resonance * 0.15));
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(pos.x - glowSize, pos.y - glowSize, glowSize * 2, glowSize * 2);
            }

            // Node body
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, drawSize, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(pos.x - drawSize * 0.2, pos.y - drawSize * 0.2, 0, pos.x, pos.y, drawSize);
            grad.addColorStop(0, hexToRgba(node.color, 0.6));
            grad.addColorStop(0.6, hexToRgba(node.color, 0.25));
            grad.addColorStop(1, hexToRgba(node.color, 0.08));
            ctx.fillStyle = grad;
            ctx.fill();

            // Border
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, drawSize, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(node.color, isHovered ? 0.8 : 0.3);
            ctx.lineWidth = isHovered ? 2 : 1;
            ctx.stroke();

            // Label for inner ring nodes
            if (node.ring <= 1) {
                ctx.font = '9px system-ui';
                ctx.fillStyle = `rgba(255,255,255,${0.5 * zOpacity})`;
                ctx.textAlign = 'center';
                ctx.fillText(node.label, pos.x, pos.y + drawSize + 14);
            }

            // Emoji
            const emojiSize = Math.max(Math.round(drawSize * 0.85), 8);
            ctx.font = `${emojiSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.emoji, pos.x, pos.y);

            ctx.globalAlpha = 1;
        }

        hoveredNodeRef.current = hoveredIdx;

        // ── Connection Lines (Core to inner) ──
        for (let i = 1; i < Math.min(nodes.length, 6); i++) {
            ctx.beginPath();
            ctx.moveTo(positions[0].x, positions[0].y);
            ctx.lineTo(positions[i].x, positions[i].y);
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.04)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // ── Update & Draw Particles (Bezier arcs) ──
        const aliveParticles: Particle[] = [];
        for (const p of particlesRef.current) {
            p.progress += p.speed;
            if (p.progress >= 1) continue;

            const from = positions[p.fromNode];
            const to = positions[p.toNode];
            if (!from || !to) continue;

            // Bezier curve position
            const midX = (from.x + to.x) / 2 + p.cpx;
            const midY = (from.y + to.y) / 2 + p.cpy;
            const x = quadBezier(from.x, midX, to.x, p.progress);
            const y = quadBezier(from.y, midY, to.y, p.progress);

            // Trail
            p.trail.push({ x, y });
            const maxTrail = p.isComet ? 40 : 20;
            if (p.trail.length > maxTrail) p.trail.shift();

            // Draw trail
            if (p.trail.length > 1) {
                for (let j = 1; j < p.trail.length; j++) {
                    const alpha = (j / p.trail.length) * (p.isComet ? 0.5 : 0.25);
                    const width = p.size * (j / p.trail.length) * (p.isComet ? 1.2 : 0.6);
                    ctx.beginPath();
                    ctx.moveTo(p.trail[j - 1].x, p.trail[j - 1].y);
                    ctx.lineTo(p.trail[j].x, p.trail[j].y);
                    ctx.strokeStyle = hexToRgba(p.color, alpha);
                    ctx.lineWidth = width;
                    ctx.stroke();
                }
            }

            // Draw head
            if (p.isComet) {
                // Lens flare head for comets
                const cometGlow = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
                cometGlow.addColorStop(0, hexToRgba(p.color, 0.6));
                cometGlow.addColorStop(0.3, hexToRgba(p.color, 0.2));
                cometGlow.addColorStop(1, 'transparent');
                ctx.fillStyle = cometGlow;
                ctx.fillRect(x - p.size * 4, y - p.size * 4, p.size * 8, p.size * 8);

                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = hexToRgba(p.color, 0.8);
                ctx.fill();

                // Small glow
                ctx.beginPath();
                ctx.arc(x, y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = hexToRgba(p.color, 0.1);
                ctx.fill();
            }

            aliveParticles.push(p);
        }
        particlesRef.current = aliveParticles;

        // ── Mini volume chart (bottom-left) ──
        const chartData = chartRef.current;
        if (chartData.length > 0) {
            const maxVol = Math.max(...chartData.map(d => d.volume), 1);
            const chartW = 140;
            const chartH = 40;
            const chartX = 20;
            const chartY = h - 70;

            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            chartData.forEach((d, i) => {
                const x = chartX + (i / (chartData.length - 1)) * chartW;
                const y = chartY + chartH - (d.volume / maxVol) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = '#d946ef';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const lastX = chartX + chartW;
            ctx.lineTo(lastX, chartY + chartH);
            ctx.lineTo(chartX, chartY + chartH);
            ctx.closePath();
            const fillGrad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
            fillGrad.addColorStop(0, 'rgba(217, 70, 239, 0.12)');
            fillGrad.addColorStop(1, 'rgba(217, 70, 239, 0)');
            ctx.fillStyle = fillGrad;
            ctx.fill();

            ctx.font = '9px system-ui';
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.textAlign = 'left';
            ctx.fillText('7-Day Volume', chartX, chartY - 6);
            ctx.restore();
        }

        ctx.restore();
    }, [getNodePos, drawStars, drawShootingStars, drawNebulae, drawDust, drawGravWaves, drawCore]);

    // ── Animation Loop ──────────────────────────────────

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        timeRef.current += 16;
        const t = timeRef.current;

        // Spawn particles periodically
        if (Math.random() < 0.1) spawnParticle();

        // Spawn gravitational waves every ~3 seconds
        if (t % 3000 < 20 && gravWavesRef.current.length < 3) {
            gravWavesRef.current.push({
                radius: 0,
                maxRadius: Math.max(sizeRef.current.w, sizeRef.current.h) * 0.6,
                opacity: 0.4,
                birth: t,
            });
        }

        draw(ctx, t);
        animRef.current = requestAnimationFrame(animate);
    }, [draw, spawnParticle]);

    // ── Resize Handler ──────────────────────────────────

    const handleResize = useCallback(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;
        sizeRef.current = { w: rect.width, h: rect.height };
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    }, []);

    // ── Mouse Interaction ───────────────────────────────

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, []);

    const handleMouseLeave = useCallback(() => {
        mouseRef.current = { x: -999, y: -999 };
    }, []);

    const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const nodes = nodesRef.current;
        const cx = sizeRef.current.w / 2;
        const cy = sizeRef.current.h / 2 + 10;
        const camX = cameraRef.current.x;
        const camY = cameraRef.current.y;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const pos = getNodePos(node, cx, cy, camX, camY);
            const zScale = 0.4 + node.z * 0.6;
            const nodeSize = node.size * zScale;
            const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
            if (dist < nodeSize * 1.5) {
                setSelectedNode({
                    node,
                    screenX: Math.min(pos.x + 20, sizeRef.current.w - 340),
                    screenY: Math.max(pos.y - 50, 10),
                });
                return;
            }
        }
        // Click on empty space — close panel
        setSelectedNode(null);
    }, [getNodePos]);

    // ── Lifecycle ───────────────────────────────────────

    useEffect(() => {
        initStars();
        initNebulae();
        initDust();
        initNodes();
        handleResize();
        fetchData();

        const resizeObs = new ResizeObserver(handleResize);
        if (containerRef.current) resizeObs.observe(containerRef.current);

        animRef.current = requestAnimationFrame(animate);
        const dataInterval = setInterval(() => { if (!document.hidden) fetchData(); }, 30000);

        return () => {
            cancelAnimationFrame(animRef.current);
            resizeObs.disconnect();
            clearInterval(dataInterval);
        };
    }, [initStars, initNebulae, initDust, initNodes, handleResize, fetchData, animate]);

    // ── Render ──────────────────────────────────────────

    return (
        <div className="relative w-full h-[420px] sm:h-[600px]">
            {/* Canvas */}
            <div ref={containerRef} className="absolute inset-0">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ cursor: hoveredNodeRef.current >= 0 ? 'pointer' : 'default' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                />
            </div>

            {/* Stats Overlay — Top Right */}
            {stats && (
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                    {[
                        { label: 'Swarms', value: stats.totalSwarms, color: '#f59e0b' },
                        { label: 'A2A Vol', value: `$${Math.round(stats.a2aVolume).toLocaleString()}`, color: '#06b6d4' },
                        { label: 'Intel', value: stats.intelCount, color: '#8b5cf6' },
                        { label: 'Events', value: stats.auditCount, color: '#10b981' },
                        { label: 'Released', value: `$${Math.round(stats.totalReleased).toLocaleString()}`, color: '#22c55e' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</span>
                            <span className="text-[10px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Live Events Feed — Bottom Right */}
            <div className="absolute bottom-3 right-3 z-10 max-h-[200px] overflow-hidden" style={{ width: '240px' }}>
                <div className="space-y-0.5">
                    {liveEvents.slice(0, 8).map((event, i) => (
                        <div key={event.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-500"
                            style={{
                                background: 'rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(12px)',
                                opacity: 1 - i * 0.1,
                                transform: `translateX(${i * 2}px)`,
                            }}>
                            <span className="text-[10px] flex-shrink-0">{event.icon}</span>
                            <span className="text-[9px] text-slate-300 truncate flex-1">{event.text}</span>
                            <span className="text-[8px] text-slate-600 flex-shrink-0">{event.time}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Title Overlay — Top Left */}
            <div className="absolute top-3 left-3 z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className="relative">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981, 0 0 20px #10b98140' }} />
                        <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ background: '#10b981', opacity: 0.3 }} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">LIVE</span>
                </div>
                <h4 className="text-sm font-black text-white/80 tracking-wide">SWARM UNIVERSE</h4>
                <p className="text-[9px] text-slate-500 mt-0.5">Agent Cosmos • Real-time</p>
            </div>

            {/* Budget Locked — Bottom Left */}
            {stats && (
                <div className="absolute bottom-3 left-3 z-10" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', borderRadius: '12px', padding: '8px 12px' }}>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Total Locked</div>
                    <div className="text-xl font-black tabular-nums"
                        style={{
                            background: 'linear-gradient(135deg, #d946ef, #f59e0b, #06b6d4)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                        ${Math.round(stats.totalBudgetLocked).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">
                        ${Math.round(stats.totalReleased).toLocaleString()} released
                    </div>
                </div>
            )}

            {/* Click-to-Inspect Node Detail Panel */}
            {selectedNode && (
                <div
                    className="absolute z-20 w-[300px] sm:w-[320px] rounded-2xl overflow-hidden"
                    style={{
                        top: `${Math.min(selectedNode.screenY, (typeof window !== 'undefined' ? 420 : 600) - 250)}px`,
                        right: '16px',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(24px)',
                        border: `1px solid ${selectedNode.node.color}30`,
                        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 60px ${selectedNode.node.color}10`,
                    }}
                >
                    {/* Panel Header */}
                    <div className="px-4 py-3 border-b border-white/[0.06]"
                        style={{ background: `linear-gradient(135deg, ${selectedNode.node.color}15, transparent)` }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{selectedNode.node.emoji}</span>
                                <div>
                                    <div className="text-sm font-bold text-white">{selectedNode.node.label}</div>
                                    <div className="text-[9px] uppercase tracking-wider" style={{ color: selectedNode.node.color }}>
                                        {selectedNode.node.type}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedNode(null); }}
                                className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.1] transition-all text-xs"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Panel Content */}
                    <div className="px-4 py-3 space-y-2.5">
                        {/* Status badge */}
                        {selectedNode.node.status && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 uppercase w-14">Status</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                    style={{
                                        background: selectedNode.node.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                        color: selectedNode.node.status === 'ACTIVE' ? '#10b981' : '#64748b',
                                    }}>
                                    {selectedNode.node.status}
                                </span>
                            </div>
                        )}

                        {/* Budget */}
                        {selectedNode.node.budget !== undefined && selectedNode.node.budget > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 uppercase w-14">Budget</span>
                                <span className="text-xs font-bold text-amber-400">
                                    ${selectedNode.node.budget.toLocaleString()}
                                </span>
                            </div>
                        )}

                        {/* Role */}
                        {selectedNode.node.role && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 uppercase w-14">Role</span>
                                <span className="text-xs text-blue-400">{selectedNode.node.role}</span>
                            </div>
                        )}

                        {/* Wallet */}
                        {selectedNode.node.wallet && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500 uppercase w-14">Wallet</span>
                                <span className="text-[10px] font-mono text-slate-400">{selectedNode.node.wallet}</span>
                            </div>
                        )}

                        {/* Ring / Depth info */}
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 uppercase w-14">Ring</span>
                            <span className="text-xs text-slate-400">
                                {['Core', 'Inner (Swarms)', 'Mid (Agents)', 'Outer'][selectedNode.node.ring]}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-500 uppercase w-14">Depth</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${selectedNode.node.z * 100}%`,
                                        background: `linear-gradient(90deg, ${selectedNode.node.color}40, ${selectedNode.node.color})`,
                                    }} />
                            </div>
                            <span className="text-[10px] text-slate-500 tabular-nums">{(selectedNode.node.z * 100).toFixed(0)}%</span>
                        </div>

                        {/* Core-specific stats */}
                        {selectedNode.node.type === 'core' && stats && (
                            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Network Stats</div>
                                {[
                                    { l: 'Active Swarms', v: stats.activeSwarms, c: '#f59e0b' },
                                    { l: 'A2A Transfers', v: stats.a2aCount, c: '#06b6d4' },
                                    { l: 'Intel Items', v: stats.intelCount, c: '#8b5cf6' },
                                    { l: 'Audit Events', v: stats.auditCount, c: '#10b981' },
                                ].map((row, ri) => (
                                    <div key={ri} className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">{row.l}</span>
                                        <span className="text-[11px] font-bold tabular-nums" style={{ color: row.c }}>{row.v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(SwarmUniverse);
