import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const creator = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        bio: true,
        avatar: true,
        banner: true,
        tagline: true,
        cardColor: true,
        createdAt: true,
        articles: {
          where: { publishedAt: { not: null }, takenDown: false },
          orderBy: { publishedAt: 'desc' },
        },
        _count: {
          select: { followers: true },
        },
        // Deliberately not selected: email, clerkId - internal/private,
        // never exposed on the public Spread endpoint.
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const { _count, ...rest } = creator;

    let isFollowing = false;
    let isOwnProfile = false;
    const { userId } = await auth();
    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (currentUser) {
        isOwnProfile = currentUser.id === creator.id;
        if (!isOwnProfile) {
          const follow = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: currentUser.id, followingId: creator.id } },
          });
          isFollowing = !!follow;
        }
      }
    }

    return NextResponse.json({
      ...rest,
      followerCount: _count.followers,
      isFollowing,
      // Computed server-side against the Prisma record, not Clerk's
      // client-side username - the two can diverge (see /api/me), and a
      // client-side comparison could hide Spread-owner controls from the
      // real owner.
      isOwnProfile,
    });
  } catch (error) {
    console.error('Error fetching creator:', error);
    return NextResponse.json({ error: 'Failed to fetch creator' }, { status: 500 });
  }
}
