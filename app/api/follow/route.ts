import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/follow - follow a creator
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { creatorId } = await request.json();
    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }

    if (creatorId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { allowFollowers: true },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (!creator.allowFollowers) {
      return NextResponse.json({ error: 'This creator is not accepting new followers' }, { status: 403 });
    }

    const follow = await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: user.id, followingId: creatorId } },
      create: { followerId: user.id, followingId: creatorId },
      update: {},
    });

    return NextResponse.json(follow, { status: 201 });
  } catch (error) {
    console.error('Error following creator:', error);
    return NextResponse.json({ error: 'Failed to follow creator' }, { status: 500 });
  }
}

// DELETE /api/follow?creatorId=xxx - unfollow a creator
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const creatorId = request.nextUrl.searchParams.get('creatorId');
    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }

    await prisma.follow.deleteMany({
      where: { followerId: user.id, followingId: creatorId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfollowing creator:', error);
    return NextResponse.json({ error: 'Failed to unfollow creator' }, { status: 500 });
  }
}
