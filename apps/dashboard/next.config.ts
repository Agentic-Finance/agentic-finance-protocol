import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output - self-contained server for Docker (~150MB vs ~800MB)
  output: 'standalone',

  // Exclude ZK cryptography + native modules from bundling
  serverExternalPackages: [
    "snarkjs", "circomlibjs", "ffjavascript",
    "@noir-lang/backend_barretenberg", "@noir-lang/noir_js",
  ],

  // Image optimization - auto WebP/AVIF conversion
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Silence Next.js 16 Turbopack compatibility warnings
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Enable WebAssembly support required for Zero-Knowledge proofs
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Prevent Webpack from trying to bundle Node.js core modules on the Client-side Browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;