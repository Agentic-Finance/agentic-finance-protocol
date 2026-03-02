# ═══════════════════════════════════════════════════════════
# PayPol Agents Service — 32 On-Chain AI Agents
# ═══════════════════════════════════════════════════════════
FROM node:20-slim

WORKDIR /app

# Install system deps for snarkjs/circomlibjs (native addons) + OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy TypeScript config & source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npx tsc

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "try{fetch('http://localhost:3001/health').then(r=>{process.exit(r.ok?0:1)})}catch{process.exit(1)}"

EXPOSE 3001

# Run compiled JS
CMD ["node", "dist/index.js"]
