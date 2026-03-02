'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { createArcCurve } from '../../lib/globe-helpers';
import type { PaymentArc } from '../../lib/warroom-types';

interface Props {
    arcs: PaymentArc[];
    quality: 'low' | 'medium' | 'high';
}

// Individual arc with traveling dot animation
function SingleArc({ arc, quality, index }: { arc: PaymentArc; quality: string; index: number }) {
    const dotRef = useRef<THREE.Mesh>(null);
    const progressRef = useRef(Math.random()); // Stagger start positions

    const curve = useMemo(() =>
        createArcCurve(arc.fromLat, arc.fromLng, arc.toLat, arc.toLng),
        [arc.fromLat, arc.fromLng, arc.toLat, arc.toLng]
    );

    const points = useMemo(() => {
        const pts = quality === 'high' ? 50 : 30;
        return curve.getPoints(pts);
    }, [curve, quality]);

    // Animate traveling dot
    useFrame((_, delta) => {
        progressRef.current += delta * (0.15 + index * 0.01);
        if (progressRef.current > 1) progressRef.current = 0;

        if (dotRef.current) {
            const pos = curve.getPoint(progressRef.current);
            dotRef.current.position.copy(pos);

            // Pulse size
            const pulse = 1 + Math.sin(progressRef.current * Math.PI) * 0.5;
            dotRef.current.scale.setScalar(0.008 * pulse);
        }
    });

    return (
        <group>
            {/* Arc line using drei Line */}
            <Line
                points={points}
                color={arc.color}
                lineWidth={1}
                transparent
                opacity={0.25}
            />

            {/* Traveling dot */}
            <mesh ref={dotRef}>
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial
                    color={arc.color}
                    toneMapped={false}
                    transparent
                    opacity={0.9}
                />
            </mesh>
        </group>
    );
}

export default function PaymentArcs({ arcs, quality }: Props) {
    const maxArcs = quality === 'high' ? 30 : quality === 'medium' ? 20 : 12;
    const visibleArcs = arcs.slice(0, maxArcs);

    return (
        <group>
            {visibleArcs.map((arc, i) => (
                <SingleArc key={arc.id} arc={arc} quality={quality} index={i} />
            ))}
        </group>
    );
}
