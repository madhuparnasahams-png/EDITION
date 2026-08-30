import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/me - the signed-in user's own Prisma record. Internal links to
// /c/[username] must use THIS username, not Clerk's client-side user.username:
// the two can diverge, since our webhook de-duplicates with a numeric suffix
// on a collision (see lib deriveUniqueUsername in the Clerk webhook). Using
// Clerk's copy for self-links can silently 404 a creator's own Spread/article.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, username: true, avatar: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 });
  }
}
