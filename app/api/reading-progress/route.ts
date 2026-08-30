import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const COMPLETED_THRESHOLD = 0.9;
const MIN_PROGRESS_TO_SURFACE = 0.05; // ignore accidental opens with barely any scroll

// POST /api/reading-progress - save/update scroll progress for an article
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

    const { articleId, progress } = await request.json();
    if (!articleId || typeof progress !== 'number' || !Number.isFinite(progress)) {
      return NextResponse.json({ error: 'articleId and progress are required' }, { status: 400 });
    }

    const clamped = Math.max(0, Math.min(1, progress));

    const existing = await prisma.readingProgress.findUnique({
      where: { userId_articleId: { userId: user.id, articleId } },
      select: { progress: true, completed: true },
    });

    // Progress only ever moves forward - if a reader scrolls back up to
    // reread something, we don't want that to erase their furthest point
    // or un-mark a finished article as incomplete.
    const finalProgress = existing ? Math.max(existing.progress, clamped) : clamped;
    const finalCompleted = (existing?.completed ?? false) || finalProgress >= COMPLETED_THRESHOLD;

    const entry = await prisma.readingProgress.upsert({
      where: { userId_articleId: { userId: user.id, articleId } },
      create: {
        userId: user.id,
        articleId,
        progress: finalProgress,
        completed: finalCompleted,
      },
      update: {
        progress: finalProgress,
        completed: finalCompleted,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving reading progress:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}

// GET /api/reading-progress - list current user's in-progress (not completed) articles
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const entries = await prisma.readingProgress.findMany({
      where: {
        userId: user.id,
        completed: false,
        progress: { gte: MIN_PROGRESS_TO_SURFACE },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        article: {
          select: {
            id: true,
            slug: true,
            title: true,
            featuredImage: true,
            author: publicAuthorSelect,
          },
        },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching reading progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
