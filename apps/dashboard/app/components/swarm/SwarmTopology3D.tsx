'use client';

import React, { useRef, useMemo, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Float } from '@react-three/drei';
import * as THREE from 'three';

// ── Types ──────────────────────────────────────────────────

interface SwarmNode {
  id: string;
  name: string;
  type: 'core' | 'swarm' | 'agent';
  color: string;
  size: number;
  // Orbital params
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitTilt: number;
  // Data
  budget?: number;
  status?: string;
  role?: string;
  parentId?: string;
  agentCount?: number;
}

interface FlowParticle {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

interface SwarmStatsData {
  totalSwarms: number;
  activeSwarms: number;
  totalBudgetLocked: number;
  a2aVolume: number;
  a2aCount: number;
  intelCount: number;
  auditCount: number;
  totalReleased: number;
  totalFees: number;
}

interface SwarmStreamInfo {
  id: string;
  name: string;
  totalBudget: number;
  totalReleased: number;
  agentCount: number;
  status: string;
  streams: {
    id: string;
    role: string;
    allocatedBudget: number;
    status: string;
    streamJob: {
      agentWallet: string;
      agentName: string | null;
    };
  }[];
}

interface Props {
  stats: SwarmStatsData | null;
  onSelectTab?: (tab: string) => void;
}

// ── Colors ─────────────────────────────────────────────────

const COLORS = {
  core: '#f59e0b',
  swarm: '#3b82f6',
  agent: '#10b981',
  coordinator: '#f59e0b',
  worker: '#3b82f6',
  reviewer: '#10b981',
  transfer: '#8b5cf6',
  escrow: '#ef4444',
  glow: '#f59e0b',
};

// ── Glow Sphere ────────────────────────────────────────────

function GlowSphere({
  position,
  color,
  size,
  glowIntensity = 0.5,
  pulsate = false,
  onClick,
  label,
  emoji,
}: {
  position: [number, number, number];
  color: string;
  size: number;
  glowIntensity?: number;
  pulsate?: boolean;
  onClick?: () => void;
  label?: string;
  emoji?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (pulsate && meshRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.08;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      const glowScale = 1 + Math.sin(clock.elapsedTime * 1.5) * 0.15;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 2.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={glowIntensity * (hovered ? 0.15 : 0.06)}
          depthWrite={false}
        />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = onClick ? 'pointer' : 'default'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Ring for hovered */}
      {hovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 1.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      {label && (
        <Billboard position={[0, size + 0.6, 0]}>
          <Text
            fontSize={0.35}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {emoji ? `${emoji} ` : ''}{label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ── Orbital Ring ───────────────────────────────────────────

function OrbitalRing({ radius, color, tilt = 0 }: { radius: number; color: string; tilt?: number }) {
  const lineObj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.08 });
    return new THREE.Line(geometry, material);
  }, [radius, color]);

  return (
    <group rotation={[tilt, 0, 0]}>
      <primitive object={lineObj} />
    </group>
  );
}

// ── Flow Particles (GPU instanced) ────────────────────────

function FlowParticles({
  nodes,
  particleCount = 60,
}: {
  nodes: SwarmNode[];
  particleCount?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<FlowParticle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  // Initialize particles
  useEffect(() => {
    if (nodes.length < 2) return;
    const particles: FlowParticle[] = [];
    const swarmNodes = nodes.filter(n => n.type === 'swarm' || n.type === 'agent');

    for (let i = 0; i < particleCount; i++) {
      const from = Math.floor(Math.random() * swarmNodes.length);
      let to = Math.floor(Math.random() * swarmNodes.length);
      if (to === from) to = (to + 1) % swarmNodes.length;

      const fromGlobal = nodes.indexOf(swarmNodes[from]);
      const toGlobal = nodes.indexOf(swarmNodes[to]);

      particles.push({
        fromIdx: fromGlobal,
        toIdx: toGlobal,
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.005,
        color: [COLORS.transfer, COLORS.swarm, COLORS.agent, COLORS.core][Math.floor(Math.random() * 4)],
      });
    }
    particlesRef.current = particles;
  }, [nodes, particleCount]);

  useFrame(({ clock }) => {
    if (!meshRef.current || nodes.length < 2) return;

    const t = clock.elapsedTime;

    particlesRef.current.forEach((p, i) => {
      p.progress += p.speed;
      if (p.progress > 1) {
        p.progress = 0;
        // Pick new random endpoints
        const swarmNodes = nodes.filter(n => n.type !== 'core');
        if (swarmNodes.length >= 2) {
          const from = Math.floor(Math.random() * swarmNodes.length);
          let to = Math.floor(Math.random() * swarmNodes.length);
          if (to === from) to = (to + 1) % swarmNodes.length;
          p.fromIdx = nodes.indexOf(swarmNodes[from]);
          p.toIdx = nodes.indexOf(swarmNodes[to]);
        }
      }

      const fromNode = nodes[p.fromIdx];
      const toNode = nodes[p.toIdx];
      if (!fromNode || !toNode) return;

      // Calculate positions
      const fromAngle = fromNode.orbitAngle + t * fromNode.orbitSpeed;
      const toAngle = toNode.orbitAngle + t * toNode.orbitSpeed;

      const fx = Math.cos(fromAngle) * fromNode.orbitRadius;
      const fy = Math.sin(fromNode.orbitTilt) * Math.sin(fromAngle) * fromNode.orbitRadius * 0.3;
      const fz = Math.sin(fromAngle) * fromNode.orbitRadius;

      const tx = Math.cos(toAngle) * toNode.orbitRadius;
      const ty = Math.sin(toNode.orbitTilt) * Math.sin(toAngle) * toNode.orbitRadius * 0.3;
      const tz = Math.sin(toAngle) * toNode.orbitRadius;

      // Bezier curve through center
      const prog = p.progress;
      const midX = (fx + tx) * 0.3;
      const midY = (fy + ty) * 0.5 + 1.5;
      const midZ = (fz + tz) * 0.3;

      const x = (1 - prog) * (1 - prog) * fx + 2 * (1 - prog) * prog * midX + prog * prog * tx;
      const y = (1 - prog) * (1 - prog) * fy + 2 * (1 - prog) * prog * midY + prog * prog * ty;
      const z = (1 - prog) * (1 - prog) * fz + 2 * (1 - prog) * prog * midZ + prog * prog * tz;

      const scale = 0.05 + Math.sin(prog * Math.PI) * 0.08;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      colorObj.set(p.color);
      meshRef.current!.setColorAt(i, colorObj);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial transparent opacity={0.7} />
    </instancedMesh>
  );
}

// ── Orbiting Node ──────────────────────────────────────────

function OrbitingNode({
  node,
  onClick,
  showLabel,
}: {
  node: SwarmNode;
  onClick?: () => void;
  showLabel?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const angle = node.orbitAngle + t * node.orbitSpeed;
    const x = Math.cos(angle) * node.orbitRadius;
    const y = Math.sin(node.orbitTilt) * Math.sin(angle) * node.orbitRadius * 0.3;
    const z = Math.sin(angle) * node.orbitRadius;
    groupRef.current.position.set(x, y, z);
  });

  const roleEmoji = node.role === 'coordinator' ? '👑' : node.role === 'reviewer' ? '🔍' : node.type === 'swarm' ? '🐝' : '🤖';

  return (
    <group ref={groupRef}>
      <GlowSphere
        position={[0, 0, 0]}
        color={node.color}
        size={node.size}
        glowIntensity={node.type === 'swarm' ? 0.6 : 0.3}
        pulsate={node.status === 'ACTIVE'}
        onClick={onClick}
        label={showLabel ? node.name : undefined}
        emoji={showLabel ? roleEmoji : undefined}
      />
    </group>
  );
}

// ── Background Stars ───────────────────────────────────────

function Stars() {
  const starsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 1500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = radius * Math.cos(phi);

      const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.3, 0.5 + Math.random() * 0.5);
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;
    }

    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = clock.elapsedTime * 0.005;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ── Scene ──────────────────────────────────────────────────

function SwarmScene({ stats, onNodeClick }: { stats: SwarmStatsData | null; onNodeClick?: (type: string) => void }) {
  const [swarms, setSwarms] = useState<SwarmStreamInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<SwarmNode | null>(null);

  // Fetch swarm data for the visualization
  useEffect(() => {
    fetch('/api/swarm/stream')
      .then(r => r.json())
      .then(data => {
        if (data.success) setSwarms(data.swarms || []);
      })
      .catch(() => {});
  }, []);

  // Build node graph from real data
  const nodes = useMemo<SwarmNode[]>(() => {
    const result: SwarmNode[] = [];

    // Core node
    result.push({
      id: 'core',
      name: 'PayPol Nexus',
      type: 'core',
      color: COLORS.core,
      size: 1.0,
      orbitRadius: 0,
      orbitSpeed: 0,
      orbitAngle: 0,
      orbitTilt: 0,
      budget: stats?.totalBudgetLocked,
      status: 'ACTIVE',
    });

    // Swarm session nodes
    swarms.forEach((swarm, i) => {
      const angle = (i / Math.max(swarms.length, 1)) * Math.PI * 2;
      const radius = 5 + (i % 3) * 1.5;
      const tilt = (Math.random() - 0.5) * 0.4;
      const speed = 0.15 + Math.random() * 0.1;

      result.push({
        id: swarm.id,
        name: swarm.name.length > 20 ? swarm.name.slice(0, 18) + '…' : swarm.name,
        type: 'swarm',
        color: swarm.status === 'COMPLETED' ? '#10b981' : swarm.status === 'ACTIVE' ? '#3b82f6' : '#f59e0b',
        size: 0.5 + Math.min(swarm.totalBudget / 500, 0.5),
        orbitRadius: radius,
        orbitSpeed: speed * (i % 2 === 0 ? 1 : -1),
        orbitAngle: angle,
        orbitTilt: tilt,
        budget: swarm.totalBudget,
        status: swarm.status,
        agentCount: swarm.agentCount,
      });

      // Agent nodes orbiting each swarm
      swarm.streams.forEach((stream, j) => {
        const agentAngle = (j / Math.max(swarm.streams.length, 1)) * Math.PI * 2;
        const roleColor = stream.role === 'coordinator' ? COLORS.coordinator :
                          stream.role === 'reviewer' ? COLORS.reviewer : COLORS.agent;

        result.push({
          id: stream.id,
          name: stream.streamJob.agentName || stream.streamJob.agentWallet.slice(0, 8),
          type: 'agent',
          color: roleColor,
          size: 0.25,
          orbitRadius: radius + 1.5 + j * 0.3,
          orbitSpeed: (speed + 0.1 + j * 0.05) * (j % 2 === 0 ? 1 : -1),
          orbitAngle: angle + agentAngle * 0.3,
          orbitTilt: tilt + (Math.random() - 0.5) * 0.3,
          role: stream.role,
          status: stream.status,
          parentId: swarm.id,
        });
      });
    });

    // If no swarms, add placeholder nodes for visual appeal
    if (swarms.length === 0) {
      const placeholders = [
        { name: 'Swarm Alpha', color: '#3b82f6' },
        { name: 'Swarm Beta', color: '#10b981' },
        { name: 'Swarm Gamma', color: '#8b5cf6' },
        { name: 'Swarm Delta', color: '#f59e0b' },
      ];
      placeholders.forEach((ph, i) => {
        const angle = (i / placeholders.length) * Math.PI * 2;
        result.push({
          id: `ph-${i}`,
          name: ph.name,
          type: 'swarm',
          color: ph.color,
          size: 0.5,
          orbitRadius: 5 + i * 0.8,
          orbitSpeed: 0.15 + i * 0.03,
          orbitAngle: angle,
          orbitTilt: (i - 2) * 0.15,
          status: 'DEMO',
        });
        // Agent sub-nodes
        for (let j = 0; j < 3; j++) {
          result.push({
            id: `ph-${i}-a${j}`,
            name: `Agent ${j + 1}`,
            type: 'agent',
            color: [COLORS.coordinator, COLORS.worker, COLORS.reviewer][j],
            size: 0.2,
            orbitRadius: 5 + i * 0.8 + 1.5 + j * 0.3,
            orbitSpeed: (0.2 + j * 0.05) * (j % 2 === 0 ? 1 : -1),
            orbitAngle: angle + j * 0.7,
            orbitTilt: (i - 2) * 0.15 + j * 0.1,
            role: ['coordinator', 'worker', 'reviewer'][j],
            parentId: `ph-${i}`,
          });
        }
      });
    }

    return result;
  }, [swarms, stats]);

  const handleNodeClick = useCallback((node: SwarmNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    if (node.type === 'swarm') {
      onNodeClick?.('streams');
    } else if (node.type === 'agent') {
      onNodeClick?.('a2a');
    }
  }, [onNodeClick]);

  // Unique orbit radii for rings
  const orbitRings = useMemo(() => {
    const radii = [...new Set(nodes.filter(n => n.type === 'swarm').map(n => n.orbitRadius))];
    return radii;
  }, [nodes]);

  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 5, 0]} intensity={1} color="#f59e0b" distance={30} />
      <pointLight position={[5, -3, 5]} intensity={0.5} color="#3b82f6" distance={20} />
      <pointLight position={[-5, 2, -5]} intensity={0.3} color="#8b5cf6" distance={20} />

      {/* Background stars */}
      <Stars />

      {/* Orbital rings */}
      {orbitRings.map((radius, i) => (
        <OrbitalRing
          key={i}
          radius={radius}
          color={COLORS.swarm}
          tilt={nodes.find(n => n.orbitRadius === radius)?.orbitTilt || 0}
        />
      ))}

      {/* Core node */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <GlowSphere
          position={[0, 0, 0]}
          color={COLORS.core}
          size={1.0}
          glowIntensity={0.8}
          pulsate
          onClick={() => onNodeClick?.('escrow')}
          label="PayPol Nexus"
          emoji="⚡"
        />
      </Float>

      {/* Orbiting nodes */}
      {nodes.filter(n => n.type !== 'core').map((node) => (
        <OrbitingNode
          key={node.id}
          node={node}
          showLabel={node.type === 'swarm'}
          onClick={() => handleNodeClick(node)}
        />
      ))}

      {/* Flow particles */}
      <FlowParticles
        nodes={nodes}
        particleCount={Math.min(nodes.length * 4, 80)}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={25}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
      />
    </>
  );
}

// ── Info Overlay ───────────────────────────────────────────

function InfoOverlay({ stats }: { stats: SwarmStatsData | null }) {
  if (!stats) return null;

  const items = [
    { label: 'Swarms', value: stats.totalSwarms, color: '#f59e0b' },
    { label: 'Active', value: stats.activeSwarms, color: '#10b981' },
    { label: 'A2A Vol', value: `$${stats.a2aVolume.toLocaleString()}`, color: '#3b82f6' },
    { label: 'Intel', value: stats.intelCount, color: '#8b5cf6' },
  ];

  return (
    <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 sm:gap-4 z-10 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-3 py-2 rounded-xl backdrop-blur-md border border-white/[0.08] pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="text-[9px] uppercase tracking-wider text-slate-500">{item.label}</div>
          <div className="text-sm font-black tabular-nums" style={{ color: item.color }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: COLORS.core, label: 'Nexus Core' },
    { color: COLORS.swarm, label: 'Swarm Session' },
    { color: COLORS.coordinator, label: 'Coordinator' },
    { color: COLORS.agent, label: 'Worker Agent' },
    { color: COLORS.reviewer, label: 'Reviewer' },
    { color: COLORS.transfer, label: 'A2A Flow' },
  ];

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="px-3 py-2 rounded-xl backdrop-blur-md border border-white/[0.08]" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">Legend</div>
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
              <span className="text-[10px] text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function SwarmTopology3D({ stats, onSelectTab }: Props) {
  return (
    <div className="w-full h-[420px] rounded-2xl border border-white/[0.06] overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at center, rgba(17,27,46,1) 0%, rgba(8,12,21,1) 100%)' }}>

      {/* Hint */}
      <div className="absolute top-4 left-4 z-10">
        <div className="px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/[0.08] flex items-center gap-2"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <span className="text-xs">🌐</span>
          <span className="text-[10px] text-slate-400">Drag to rotate • Scroll to zoom • Click nodes to explore</span>
        </div>
      </div>

      <Legend />

      <Canvas
        camera={{ position: [8, 5, 12], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SwarmScene stats={stats} onNodeClick={onSelectTab} />
        </Suspense>
      </Canvas>

      <InfoOverlay stats={stats} />
    </div>
  );
}
