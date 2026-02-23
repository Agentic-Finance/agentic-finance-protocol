# ═══════════════════════════════════════════════════════════
# PayPol Protocol — Production Dockerfile
# Next.js 16 (Turbopack) + Prisma + SQLite
# ═══════════════════════════════════════════════════════════

# ── Stage 1: Install dependencies ─────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci && npx prisma generate

# ── Stage 2: Build the application ────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Production runtime ───────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy build artifacts and runtime deps
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Copy Prisma for DB management
COPY --from=builder /app/prisma ./prisma

# Ensure data directory writable
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Migrate SQLite schema then start Next.js
CMD ["sh", "-c", "npx prisma db push --skip-generate 2>/dev/null; npm start"]
