'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
    startPosition?: [number, number, number];
    endPosition?: [number, number, number];
    duration?: number; // seconds
}

export default function CameraDolly({
    startPosition = [0, 0.5, 8],
    endPosition = [0, 0.3, 2.8],
    duration = 3,
}: Props) {
    const { camera } = useThree();
    const progressRef = useRef(0);
    const startVec = useRef(new THREE.Vector3(...startPosition));
    const endVec = useRef(new THREE.Vector3(...endPosition));
    const initialized = useRef(false);

    useFrame((_, delta) => {
        if (!initialized.current) {
            camera.position.copy(startVec.current);
            initialized.current = true;
        }

        if (progressRef.current >= 1) return;

        progressRef.current = Math.min(progressRef.current + delta / duration, 1);

        // Smooth ease-out cubic
        const t = 1 - Math.pow(1 - progressRef.current, 3);

        camera.position.lerpVectors(startVec.current, endVec.current, t);
    });

    return null;
}
