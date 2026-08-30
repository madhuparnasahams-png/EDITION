import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

// Reusable select fragment for embedding an author on articles/cache/etc.
// Never includes email or clerkId - those are private and must never appear
// in a response to anyone other than the account owner themselves.
export const publicAuthorSelect = {
  select: {
    id: true,
    username: true,
    avatar: true,
    bio: true,
    tagline: true,
  },
} as const;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  let globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
