import { PrismaClient } from '@prisma/client';
import path from 'node:path';

export * from '@prisma/client';

function getDbUrl(): string {
  const envUrl = process.env['DATABASE_URL'];
  if (envUrl) return envUrl;
  // The Prisma schema uses SQLite. Resolve the local default from this package,
  // independently of whether the caller is the web app, worker, or scheduler.
  return `file:${path.resolve(__dirname, '../prisma/dev.db').replace(/\\/g, '/')}`;
}

function createPrismaClient(): PrismaClient {
  const url = getDbUrl();
  return new PrismaClient({
    datasources: { db: { url } }
  });
}

let prisma: PrismaClient;

if (process.env['NODE_ENV'] === 'production') {
  prisma = createPrismaClient();
} else {
  // Prevent multiple instances of Prisma Client in development
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = createPrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
