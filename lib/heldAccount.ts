import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// An account under admin investigative hold is invisible to everyone except
// the owner and admins.
export async function canViewAccount(target: { id: string; hiddenByAdmin: boolean }): Promise<boolean> {
  if (!target.hiddenByAdmin) return true;
  const { userId } = await auth();
  if (!userId) return false;
  const viewer = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, isAdmin: true } });
  return !!viewer && (viewer.id === target.id || viewer.isAdmin);
}
