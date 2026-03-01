# ═══════════════════════════════════════════════════════════
# PayPol Daemon — ZK Shield & A2A Escrow Processor
# ═══════════════════════════════════════════════════════════
FROM node:20-slim

WORKDIR /app

# Install system deps for snarkjs/circomlibjs (native addons) + OpenSSL 3.x
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY services/daemon/package.json services/daemon/package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy Prisma schema and generate client
COPY services/daemon/prisma ./prisma
RUN npx prisma generate

# Copy ZK circuit artifacts (V1 + V2)
RUN mkdir -p circuits
COPY packages/circuits/paypol_shield_v2_js/paypol_shield_v2.wasm ./circuits/
COPY packages/circuits/paypol_shield_v2_final.zkey ./circuits/
COPY packages/circuits/paypol_shield_js/paypol_shield.wasm ./circuits/
COPY packages/circuits/paypol_shield_final.zkey ./circuits/

# Copy daemon source
COPY services/daemon/daemon.ts ./
COPY services/daemon/tsconfig.json* ./

# Health check (daemon logs to stdout)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Run daemon with tsx (TypeScript execution)
CMD ["npx", "tsx", "daemon.ts"]
