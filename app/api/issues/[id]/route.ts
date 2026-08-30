import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/issues/[id] - single issue with its curated pieces, in publish order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        author: publicAuthorSelect,
        articles: {
          where: { publishedAt: { not: null }, takenDown: false },
          orderBy: { publishedAt: 'asc' },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    let likedIds = new Set<string>();
    let cachedIds = new Set<string>();

    const { userId } = await auth();
    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (currentUser) {
        const articleIds = issue.articles.map((a) => a.id);
        const [likes, cacheEntries] = await Promise.all([
          prisma.like.findMany({ where: { userId: currentUser.id, articleId: { in: articleIds } } }),
          prisma.cache.findMany({ where: { userId: currentUser.id, articleId: { in: articleIds } } }),
        ]);
        likedIds = new Set(likes.map((l) => l.articleId));
        cachedIds = new Set(cacheEntries.map((c) => c.articleId));
      }
    }

    const enrichedArticles = issue.articles.map((article) => ({
      ...article,
      isLiked: likedIds.has(article.id),
      isCached: cachedIds.has(article.id),
    }));

    return NextResponse.json({ ...issue, articles: enrichedArticles });
  } catch (error) {
    console.error('Error fetching issue:', error);
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 });
  }
}
