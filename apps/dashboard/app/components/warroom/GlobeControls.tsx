'use client';

import React from 'react';
import { OrbitControls } from '@react-three/drei';

interface Props {
    autoRotate: boolean;
}

export default function GlobeControls({ autoRotate }: Props) {
    return (
        <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={0.3}
            enableZoom={true}
            minDistance={2.2}
            maxDistance={4.5}
            enablePan={false}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.6}
        />
    );
}
