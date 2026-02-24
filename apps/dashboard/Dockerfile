# syntax=docker/dockerfile:1
# ═══════════════════════════════════════════════════════════
# PayPol Protocol — Production Dockerfile
# Next.js 16 (Standalone) + Prisma + PostgreSQL
# Optimized with BuildKit layer caching
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies (cached unless package.json changes) ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Cache npm downloads — survives across builds even if package.json changes
RUN --mount=type=cache,target=/root/.npm \
    npm ci && npx prisma generate

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

# Ensure data directory writable
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Migrate PostgreSQL schema, seed agents if empty, then start standalone server
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate 2>/dev/null; node prisma/seed.js 2>/dev/null; node server.js"]
