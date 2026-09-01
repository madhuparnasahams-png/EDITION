import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function deriveType(article: { issueId: string | null; format: string }): 'issues' | 'av' | 'articles' {
  if (article.issueId) return 'issues';
  if (article.format === 'AV') return 'av';
  return 'articles';
}

// GET /api/cache - list current user's saved items
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cached = await prisma.cache.findMany({
      where: { userId: user.id },
      include: { article: { include: { author: publicAuthorSelect } } },
      orderBy: { savedAt: 'desc' },
    });

    const likes = await prisma.like.findMany({
      where: { userId: user.id, articleId: { in: cached.map((c) => c.article.id) } },
    });
    const likedIds = new Set(likes.map((l) => l.articleId));

    const items = cached.map((c) => ({
      id: c.article.id,
      slug: c.article.slug,
      title: c.article.title,
      creatorUsername: c.article.author.username,
      creatorCardColor: c.article.author.cardColor,
      savedAt: c.savedAt,
      thumbnail: c.article.featuredImage,
      type: deriveType(c.article),
      isLiked: likedIds.has(c.article.id),
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching cache:', error);
    return NextResponse.json({ error: 'Failed to fetch cache' }, { status: 500 });
  }
}

// POST /api/cache - save an article to cache
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

    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const entry = await prisma.cache.upsert({
      where: { userId_articleId: { userId: user.id, articleId } },
      create: { userId: user.id, articleId },
      update: {},
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error saving to cache:', error);
    return NextResponse.json({ error: 'Failed to save to cache' }, { status: 500 });
  }
}

// DELETE /api/cache?articleId=xxx - remove from cache
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

    const articleId = request.nextUrl.searchParams.get('articleId');
    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    await prisma.cache.deleteMany({
      where: { userId: user.id, articleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from cache:', error);
    return NextResponse.json({ error: 'Failed to remove from cache' }, { status: 500 });
  }
}
