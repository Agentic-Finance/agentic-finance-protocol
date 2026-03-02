'use client';

import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVector3 } from '../../lib/globe-helpers';
import type { AgentGeoNode } from '../../lib/warroom-types';

interface Props {
    agents: AgentGeoNode[];
    quality: 'low' | 'medium' | 'high';
    selectedAgentId: string | null;
    onSelectAgent: (id: string | null) => void;
}

const STATUS_COLORS = {
    active: new THREE.Color('#10b981'),
    idle: new THREE.Color('#f59e0b'),
    offline: new THREE.Color('#ef4444'),
};

export default function AgentNodes({ agents, quality, selectedAgentId, onSelectAgent }: Props) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const glowMeshRef = useRef<THREE.InstancedMesh>(null);
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const { camera, raycaster, pointer } = useThree();

    const agentCount = agents.length || 1; // At least 1 to avoid errors
    const sphereSegments = quality === 'high' ? 16 : 8;

    // Update instances each frame
    useFrame(({ clock }) => {
        if (!meshRef.current || agents.length === 0) return;
        const t = clock.getElapsedTime();

        agents.forEach((agent, i) => {
            const pos = latLngToVector3(agent.lat, agent.lng, 1.02);

            // Pulse for active agents
            const pulse = agent.status === 'active'
                ? 1 + Math.sin(t * 3 + i * 0.5) * 0.15
                : 1;

            // Selected agent is larger
            const selectedScale = agent.id === selectedAgentId ? 1.5 : 1;

            const baseSize = 0.018 * pulse * selectedScale;

            tempObject.position.copy(pos);
            tempObject.lookAt(0, 0, 0);
            tempObject.scale.setScalar(baseSize);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            // Color by status
            tempColor.copy(STATUS_COLORS[agent.status]);
            meshRef.current!.setColorAt(i, tempColor);

            // Glow (larger, more transparent)
            if (glowMeshRef.current) {
                tempObject.scale.setScalar(baseSize * 3);
                tempObject.updateMatrix();
                glowMeshRef.current.setMatrixAt(i, tempObject.matrix);
                glowMeshRef.current.setColorAt(i, tempColor);
            }
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        if (glowMeshRef.current) {
            glowMeshRef.current.instanceMatrix.needsUpdate = true;
            if (glowMeshRef.current.instanceColor) glowMeshRef.current.instanceColor.needsUpdate = true;
        }
    });

    // Click handler via raycasting
    const handleClick = useCallback((event: any) => {
        if (!meshRef.current || agents.length === 0) return;
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId !== undefined && instanceId < agents.length) {
            const clickedAgent = agents[instanceId];
            onSelectAgent(clickedAgent.id === selectedAgentId ? null : clickedAgent.id);
        }
    }, [agents, selectedAgentId, onSelectAgent]);

    return (
        <>
            {/* Agent node spheres */}
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, agentCount]}
                onClick={handleClick}
            >
                <sphereGeometry args={[1, sphereSegments, sphereSegments]} />
                <meshStandardMaterial
                    emissive="#10b981"
                    emissiveIntensity={0.8}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Glow halos */}
            {quality !== 'low' && (
                <instancedMesh
                    ref={glowMeshRef}
                    args={[undefined, undefined, agentCount]}
                >
                    <sphereGeometry args={[1, 8, 8]} />
                    <meshBasicMaterial
                        transparent
                        opacity={0.12}
                        toneMapped={false}
                        depthWrite={false}
                    />
                </instancedMesh>
            )}
        </>
    );
}
