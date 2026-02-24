#!/bin/sh
# PayPol Production Startup Script
# Waits for PostgreSQL, runs migrations, seeds agents, starts Next.js

# Prisma CLI path (node_modules/.bin/ symlinks not available in standalone build)
PRISMA="node node_modules/prisma/build/index.js"

echo "[startup] Waiting for PostgreSQL to be ready..."

# Retry prisma db push up to 10 times (PostgreSQL might still be starting)
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "[startup] Attempt $i/10: Running prisma db push..."
  if $PRISMA db push --skip-generate --accept-data-loss 2>&1; then
    echo "[startup] Database schema synced successfully!"
    break
  fi
  echo "[startup] PostgreSQL not ready yet, waiting 3s..."
  sleep 3
done

echo "[startup] Running agent seeder..."
node prisma/seed.js 2>&1 || echo "[startup] Seed completed (or skipped)"

echo "[startup] Starting Next.js server..."
exec node server.js
