'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { FlowEdge, TopAgent, AgentGeoNode } from '../../lib/warroom-types';

interface Props {
    flowEdges: FlowEdge[];
    topAgents: TopAgent[];
    agents: AgentGeoNode[];
    selectedAgentId: string | null;
    onSelectAgent: (id: string | null) => void;
}

interface ForceNode {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    wallet: string;
    label: string;
    size: number;
    color: string;
    connections: number;
    volume: number;
}

interface ForceEdge {
    from: number;
    to: number;
    volume: number;
    color: string;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

const EDGE_COLORS = ['#06b6d4', '#d946ef', '#f59e0b', '#10b981', '#8b5cf6'];

export default function SwarmTopology({ flowEdges, topAgents, agents, selectedAgentId, onSelectAgent }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<ForceNode[]>([]);
    const edgesRef = useRef<ForceEdge[]>([]);
    const animRef = useRef<number>(0);
    const sizeRef = useRef({ w: 0, h: 0 });
    const mouseRef = useRef({ x: -999, y: -999 });
    const hoveredRef = useRef<number>(-1);
    const [isHovering, setIsHovering] = useState(false);
    const dprRef = useRef(1);

    // ── Build force graph from data ──
    useEffect(() => {
        if (topAgents.length === 0) return;
        const cx = sizeRef.current.w / 2 || 300;
        const cy = sizeRef.current.h / 2 || 150;

        const walletToIdx: Record<string, number> = {};
        const nodes: ForceNode[] = topAgents.slice(0, 16).map((ta, i) => {
            walletToIdx[ta.wallet] = i;
            const angle = (i / Math.min(topAgents.length, 16)) * Math.PI * 2;
            const radius = 80 + Math.random() * 60;
            return {
                id: `topo-${i}`,
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
                vx: 0, vy: 0,
                wallet: ta.wallet,
                label: ta.wallet.slice(0, 6) + '...' + ta.wallet.slice(-4),
                size: 6 + (ta.totalVolume / Math.max(...topAgents.map(t => t.totalVolume), 1)) * 12,
                color: i < 4 ? '#d946ef' : i < 8 ? '#3b82f6' : i < 12 ? '#f59e0b' : '#10b981',
                connections: ta.connections,
                volume: ta.totalVolume,
            };
        });

        const edges: ForceEdge[] = [];
        for (const fe of flowEdges.slice(0, 30)) {
            const fi = walletToIdx[fe.from];
            const ti = walletToIdx[fe.to];
            if (fi !== undefined && ti !== undefined) {
                edges.push({
                    from: fi, to: ti,
                    volume: fe.volume,
                    color: EDGE_COLORS[edges.length % EDGE_COLORS.length],
                });
            }
        }

        nodesRef.current = nodes;
        edgesRef.current = edges;
    }, [topAgents, flowEdges]);

    // ── Force simulation + drawing ──
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = dprRef.current;
        const w = sizeRef.current.w;
        const h = sizeRef.current.h;
        const cx = w / 2;
        const cy = h / 2;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const nodes = nodesRef.current;
        const edges = edgesRef.current;

        // ── Force simulation step ──
        // Gravity toward center
        for (const n of nodes) {
            n.vx += (cx - n.x) * 0.0005;
            n.vy += (cy - n.y) * 0.0005;
        }

        // Repulsion between nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[j].x - nodes[i].x;
                const dy = nodes[j].y - nodes[i].y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                const force = 400 / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                nodes[i].vx -= fx;
                nodes[i].vy -= fy;
                nodes[j].vx += fx;
                nodes[j].vy += fy;
            }
        }

        // Attraction along edges
        for (const e of edges) {
            const a = nodes[e.from];
            const b = nodes[e.to];
            if (!a || !b) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = (dist - 100) * 0.002;
            a.vx += (dx / dist) * force;
            a.vy += (dy / dist) * force;
            b.vx -= (dx / dist) * force;
            b.vy -= (dy / dist) * force;
        }

        // Apply velocity with damping
        for (const n of nodes) {
            n.vx *= 0.85;
            n.vy *= 0.85;
            n.x += n.vx;
            n.y += n.vy;
            // Bounds
            n.x = Math.max(30, Math.min(w - 30, n.x));
            n.y = Math.max(30, Math.min(h - 30, n.y));
        }

        // ── Draw edges ──
        for (const e of edges) {
            const a = nodes[e.from];
            const b = nodes[e.to];
            if (!a || !b) continue;

            const maxVol = Math.max(...edges.map(ed => ed.volume), 1);
            const thickness = 0.5 + (e.volume / maxVol) * 2;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = e.color + '30';
            ctx.lineWidth = thickness;
            ctx.stroke();

            // Animated dot along edge
            const t = (Date.now() * 0.0005 + e.from * 0.3) % 1;
            const dotX = lerp(a.x, b.x, t);
            const dotY = lerp(a.y, b.y, t);
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
            ctx.fillStyle = e.color + '80';
            ctx.fill();
        }

        // ── Draw nodes ──
        let hovered = -1;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const dist = Math.sqrt((mx - n.x) ** 2 + (my - n.y) ** 2);
            const isHovered = dist < n.size + 4;
            if (isHovered) hovered = i;

            const scale = isHovered ? 1.3 : 1;
            const drawSize = n.size * scale;

            // Glow
            const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, drawSize * 2.5);
            glow.addColorStop(0, n.color + '20');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(n.x - drawSize * 2.5, n.y - drawSize * 2.5, drawSize * 5, drawSize * 5);

            // Body
            ctx.beginPath();
            ctx.arc(n.x, n.y, drawSize, 0, Math.PI * 2);
            const bodyGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, drawSize);
            bodyGrad.addColorStop(0, n.color + '60');
            bodyGrad.addColorStop(1, n.color + '15');
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            // Border
            ctx.strokeStyle = n.color + (isHovered ? '80' : '40');
            ctx.lineWidth = isHovered ? 2 : 1;
            ctx.stroke();

            // Label
            if (isHovered || n.size > 12) {
                ctx.font = '8px system-ui';
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.textAlign = 'center';
                ctx.fillText(n.label, n.x, n.y + drawSize + 12);
            }
        }

        if (hoveredRef.current !== hovered) {
            hoveredRef.current = hovered;
            setIsHovering(hovered >= 0);
        }
        ctx.restore();

        animRef.current = requestAnimationFrame(draw);
    }, []);

    // ── Resize ──
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

    // ── Mouse ──
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }, []);

    const handleClick = useCallback(() => {
        const idx = hoveredRef.current;
        if (idx >= 0 && nodesRef.current[idx]) {
            const wallet = nodesRef.current[idx].wallet;
            const agent = agents.find(a => a.wallet === wallet);
            if (agent) onSelectAgent(agent.id === selectedAgentId ? null : agent.id);
        }
    }, [agents, selectedAgentId, onSelectAgent]);

    // ── Lifecycle ──
    useEffect(() => {
        handleResize();
        animRef.current = requestAnimationFrame(draw);
        const obs = new ResizeObserver(handleResize);
        if (containerRef.current) obs.observe(containerRef.current);
        return () => {
            cancelAnimationFrame(animRef.current);
            obs.disconnect();
        };
    }, [handleResize, draw]);

    return (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs">🕸️</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Swarm Topology</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-600">
                    <span>{topAgents.length} nodes</span>
                    <span>•</span>
                    <span>{flowEdges.length} edges</span>
                </div>
            </div>
            <div ref={containerRef} className="relative" style={{ height: '280px' }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ cursor: isHovering ? 'pointer' : 'default' }}
                    onMouseMove={handleMouseMove}
                    onClick={handleClick}
                />
            </div>
        </div>
    );
}
