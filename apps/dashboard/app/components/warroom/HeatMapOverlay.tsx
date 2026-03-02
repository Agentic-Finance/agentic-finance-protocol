'use client';

// HeatMapOverlay — Globe heat map for transaction density
// This is a simplified version using colored point sprites on the globe surface

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLngToVector3 } from '../../lib/globe-helpers';
import type { AgentGeoNode } from '../../lib/warroom-types';

interface Props {
    agents: AgentGeoNode[];
    quality: 'low' | 'medium' | 'high';
}

export default function HeatMapOverlay({ agents, quality }: Props) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObject = useMemo(() => new THREE.Object3D(), []);

    const maxHeatSpots = quality === 'high' ? 50 : quality === 'medium' ? 30 : 15;

    // Create heat spots from agent data
    const heatSpots = useMemo(() => {
        return agents.slice(0, maxHeatSpots).map(agent => ({
            pos: latLngToVector3(agent.lat, agent.lng, 1.01),
            intensity: Math.min(agent.totalVolume / 5000, 1), // Normalize
            status: agent.status,
        }));
    }, [agents, maxHeatSpots]);

    useFrame(({ clock }) => {
        if (!meshRef.current || heatSpots.length === 0) return;
        const t = clock.getElapsedTime();

        heatSpots.forEach((spot, i) => {
            tempObject.position.copy(spot.pos);
            tempObject.lookAt(0, 0, 0);
            const pulse = 1 + Math.sin(t * 2 + i) * 0.2;
            const size = 0.03 + spot.intensity * 0.05;
            tempObject.scale.setScalar(size * pulse);
            tempObject.updateMatrix();
            meshRef.current!.setMatrixAt(i, tempObject.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (heatSpots.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, heatSpots.length]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial
                color="#06b6d4"
                transparent
                opacity={0.08}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
            />
        </instancedMesh>
    );
}
