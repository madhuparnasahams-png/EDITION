import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasValidAdminCookie, adminPasswordRequiredResponse } from '@/lib/adminAuth';

// Double security: isAdmin flag in the DB AND a valid, unexpired password cookie.
export async function requireAdminWithPassword() {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin?.isAdmin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  if (!(await hasValidAdminCookie())) return { error: adminPasswordRequiredResponse() } as const;
  return { admin } as const;
}
