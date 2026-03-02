import * as THREE from 'three';

/**
 * Convert latitude/longitude to 3D position on a sphere.
 */
export function latLngToVector3(lat: number, lng: number, radius: number = 1): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

/**
 * Great circle distance between two points (in radians, multiply by R for meters).
 */
export function greatCircleDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLng = (lng2 - lng1) * toRad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute arc elevation height based on distance between endpoints.
 * Longer arcs get higher elevation.
 */
export function arcHeight(distanceRadians: number): number {
    return 1.0 + distanceRadians * 0.4; // Minimum 1.0 (surface), max ~1.5
}

/**
 * Create a Bezier arc curve between two points on a globe surface.
 */
export function createArcCurve(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    radius: number = 1.02
): THREE.QuadraticBezierCurve3 {
    const start = latLngToVector3(fromLat, fromLng, radius);
    const end = latLngToVector3(toLat, toLng, radius);

    // Control point elevated above the globe surface
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dist = start.distanceTo(end);
    mid.normalize().multiplyScalar(radius + dist * 0.35);

    return new THREE.QuadraticBezierCurve3(start, mid, end);
}

/**
 * Get latitude/longitude grid lines as arrays of points.
 */
export function getGridLines(segments: number = 24): { lat: THREE.Vector3[][]; lng: THREE.Vector3[][] } {
    const latLines: THREE.Vector3[][] = [];
    const lngLines: THREE.Vector3[][] = [];
    const r = 1.003; // Slightly above sphere surface

    // Latitude lines (every 30 degrees)
    for (let lat = -60; lat <= 60; lat += 30) {
        const points: THREE.Vector3[] = [];
        for (let lng = 0; lng <= 360; lng += 360 / segments) {
            points.push(latLngToVector3(lat, lng - 180, r));
        }
        latLines.push(points);
    }

    // Longitude lines (every 30 degrees)
    for (let lng = -180; lng < 180; lng += 30) {
        const points: THREE.Vector3[] = [];
        for (let lat = -90; lat <= 90; lat += 180 / segments) {
            points.push(latLngToVector3(lat, lng, r));
        }
        lngLines.push(points);
    }

    return { lat: latLines, lng: lngLines };
}
