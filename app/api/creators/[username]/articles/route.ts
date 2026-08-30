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
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const articles = await prisma.article.findMany({
      where: {
        authorId: creator.id,
        publishedAt: { not: null },
        takenDown: false,
      },
      orderBy: { publishedAt: 'desc' },
    });

    let likedIds = new Set<string>();
    let cachedIds = new Set<string>();

    const { userId } = await auth();
    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (currentUser) {
        const articleIds = articles.map((a) => a.id);
        const [likes, cacheEntries] = await Promise.all([
          prisma.like.findMany({ where: { userId: currentUser.id, articleId: { in: articleIds } } }),
          prisma.cache.findMany({ where: { userId: currentUser.id, articleId: { in: articleIds } } }),
        ]);
        likedIds = new Set(likes.map((l) => l.articleId));
        cachedIds = new Set(cacheEntries.map((c) => c.articleId));
      }
    }

    const enriched = articles.map((article) => ({
      ...article,
      isLiked: likedIds.has(article.id),
      isCached: cachedIds.has(article.id),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
