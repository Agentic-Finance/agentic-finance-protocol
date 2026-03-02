'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
    quality: 'low' | 'medium' | 'high';
}

// Fresnel atmosphere shader — glowing blue/cyan halo
const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmosphereFragmentShader = `
uniform vec3 glowColor;
uniform float intensity;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0) * intensity;
    gl_FragColor = vec4(glowColor, fresnel * 0.5);
}
`;

export default function GlobeCore({ quality }: Props) {
    const globeRef = useRef<THREE.Group>(null);
    const segments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;

    // Load textures — blue marble shows continents clearly
    const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth-blue-marble.jpg');
    const bumpTexture = useLoader(THREE.TextureLoader, '/textures/earth-topology.png');

    // Configure texture quality
    useMemo(() => {
        if (earthTexture) {
            earthTexture.colorSpace = THREE.SRGBColorSpace;
            earthTexture.anisotropy = quality === 'high' ? 8 : 4;
            earthTexture.minFilter = THREE.LinearMipmapLinearFilter;
            earthTexture.magFilter = THREE.LinearFilter;
        }
        if (bumpTexture) {
            bumpTexture.minFilter = THREE.LinearMipmapLinearFilter;
        }
    }, [earthTexture, bumpTexture, quality]);

    // Slow rotation
    useFrame((_, delta) => {
        if (globeRef.current) {
            globeRef.current.rotation.y += delta * 0.015;
        }
    });

    // Atmosphere glow uniforms
    const atmoUniforms1 = useMemo(() => ({
        glowColor: { value: new THREE.Color('#38bdf8') },
        intensity: { value: 1.2 },
    }), []);

    const atmoUniforms2 = useMemo(() => ({
        glowColor: { value: new THREE.Color('#6366f1') },
        intensity: { value: 0.5 },
    }), []);

    return (
        <group ref={globeRef}>
            {/* Main Earth sphere — blue marble with dark treatment */}
            <mesh>
                <sphereGeometry args={[1, segments, segments]} />
                <meshStandardMaterial
                    map={earthTexture}
                    bumpMap={quality !== 'low' ? bumpTexture : undefined}
                    bumpScale={0.04}
                    roughness={0.85}
                    metalness={0.05}
                    emissiveMap={earthTexture}
                    emissive="#4488cc"
                    emissiveIntensity={0.25}
                />
            </mesh>

            {/* Atmosphere glow — inner ring */}
            {quality !== 'low' && (
                <mesh scale={1.03}>
                    <sphereGeometry args={[1, 32, 32]} />
                    <shaderMaterial
                        transparent
                        side={THREE.BackSide}
                        depthWrite={false}
                        vertexShader={atmosphereVertexShader}
                        fragmentShader={atmosphereFragmentShader}
                        uniforms={atmoUniforms1}
                    />
                </mesh>
            )}

            {/* Atmosphere glow — outer soft ring */}
            {quality === 'high' && (
                <mesh scale={1.08}>
                    <sphereGeometry args={[1, 24, 24]} />
                    <shaderMaterial
                        transparent
                        side={THREE.BackSide}
                        depthWrite={false}
                        vertexShader={atmosphereVertexShader}
                        fragmentShader={atmosphereFragmentShader}
                        uniforms={atmoUniforms2}
                    />
                </mesh>
            )}
        </group>
    );
}
