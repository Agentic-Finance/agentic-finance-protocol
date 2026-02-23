import { PrismaClient } from '@prisma/client';

// Prevent Next.js Hot-Reload from creating multiple Prisma instances and locking SQLite
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
