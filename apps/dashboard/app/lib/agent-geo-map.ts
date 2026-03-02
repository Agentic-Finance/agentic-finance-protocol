// ── Agent Geo-Mapping ──────────────────────────────────────
// Maps agent wallets to virtual geographic locations for globe visualization.
// All 32 agents run on 1 VPS (Helsinki) but need distributed globe positions.

export interface GeoLocation {
    city: string;
    lat: number;
    lng: number;
    region: string;
}

// 12 global regions for agent distribution
const REGIONS: GeoLocation[] = [
    { city: 'New York', lat: 40.7128, lng: -74.006, region: 'US-East' },
    { city: 'San Francisco', lat: 37.7749, lng: -122.4194, region: 'US-West' },
    { city: 'Miami', lat: 25.7617, lng: -80.1918, region: 'US-South' },
    { city: 'London', lat: 51.5074, lng: -0.1278, region: 'EU-West' },
    { city: 'Frankfurt', lat: 50.1109, lng: 8.6821, region: 'EU-Central' },
    { city: 'Helsinki', lat: 60.1695, lng: 24.9354, region: 'EU-North' },
    { city: 'Dubai', lat: 25.2048, lng: 55.2708, region: 'Middle-East' },
    { city: 'Mumbai', lat: 19.076, lng: 72.8777, region: 'South-Asia' },
    { city: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'SE-Asia' },
    { city: 'Tokyo', lat: 35.6762, lng: 139.6503, region: 'East-Asia' },
    { city: 'Sydney', lat: -33.8688, lng: 151.2093, region: 'Oceania' },
    { city: 'Sao Paulo', lat: -23.5505, lng: -46.6333, region: 'South-America' },
];

// Simple hash function for deterministic assignment
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Get geographic location for an agent based on wallet address.
 * Deterministic: same wallet always maps to same location.
 * Adds slight random offset to avoid overlap within a region.
 */
export function getAgentGeo(wallet: string): GeoLocation {
    const hash = simpleHash(wallet);
    const region = REGIONS[hash % REGIONS.length];

    // Slight offset so agents in same region don't overlap
    const offsetLat = ((hash % 100) / 100 - 0.5) * 4;  // ±2 degrees
    const offsetLng = (((hash >> 8) % 100) / 100 - 0.5) * 4;

    return {
        city: region.city,
        lat: region.lat + offsetLat,
        lng: region.lng + offsetLng,
        region: region.region,
    };
}

// Predefined agent roles for visualization
const AGENT_ROLES = [
    'coordinator', 'worker', 'worker', 'reviewer', 'sentinel',
    'worker', 'optimizer', 'worker', 'coordinator', 'worker',
    'sentinel', 'worker', 'reviewer', 'optimizer', 'worker',
    'coordinator', 'worker', 'worker', 'sentinel', 'worker',
    'reviewer', 'optimizer', 'worker', 'coordinator', 'worker',
    'worker', 'sentinel', 'worker', 'reviewer', 'worker',
    'optimizer', 'worker',
] as const;

export function getAgentRole(index: number): typeof AGENT_ROLES[number] {
    return AGENT_ROLES[index % AGENT_ROLES.length];
}

export { REGIONS };
