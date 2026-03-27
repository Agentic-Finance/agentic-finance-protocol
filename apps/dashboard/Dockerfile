# syntax=docker/dockerfile:1
# ═══════════════════════════════════════════════════════════
# Agentic Finance — Production Dockerfile
# Next.js 16 (Standalone) + Prisma + PostgreSQL
# Optimized with BuildKit layer caching
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies (cached unless package.json changes) ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

# Install deps from scratch (no lock file — avoids macOS/Linux native binding conflicts)
RUN --mount=type=cache,target=/root/.npm \
    npm install --force && npx prisma generate

# ── Stage 2: Build the application ──────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy source code (this layer invalidates on code changes — that's OK)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Cache Next.js build artifacts — dramatically speeds up rebuilds
ENV NODE_OPTIONS="--max-old-space-size=6144"
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ── Stage 3: Production runtime (minimal ~150MB) ───────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server (includes only necessary node_modules)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma CLI + client for DB management
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Make startup script executable + ensure writable
RUN chmod +x ./prisma/start.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check — verifies app + DB connectivity
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Startup: wait for PostgreSQL, migrate schema, seed agents, start server
CMD ["./prisma/start.sh"]
