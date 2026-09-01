import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const SUGGEST_TAKE = 10;

// GET /api/creators/suggested - a handful of creators the current reader
// doesn't already follow, for the swipeable "follow" cards interspersed in
// the Home feed. Signed-out visitors get the same list minus the
// follow-status exclusion (nothing to exclude yet).
export async function GET() {
  try {
    const { userId } = await auth();
    let excludeIds: string[] = [];

    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (currentUser) {
        const follows = await prisma.follow.findMany({
          where: { followerId: currentUser.id },
          select: { followingId: true },
        });
        excludeIds = [currentUser.id, ...follows.map((f) => f.followingId)];
      }
    }

    const creators = await prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        tagline: true,
        cardColor: true,
        _count: { select: { followers: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: SUGGEST_TAKE,
    });

    const enriched = creators.map(({ _count, ...c }) => ({ ...c, followerCount: _count.followers }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching suggested creators:', error);
    return NextResponse.json({ error: 'Failed to fetch suggested creators' }, { status: 500 });
  }
}
