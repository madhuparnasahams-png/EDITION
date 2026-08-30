import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/articles/search?tags=Minimalism,Fiction&q=text - matches articles with
// ALL given tags, optionally further filtered by free-text query against title,
// description, or author username.
export async function GET(request: NextRequest) {
  try {
    const tagsParam = request.nextUrl.searchParams.get('tags');
    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    const tags = tagsParam
      ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    if (tags.length === 0 && !q) {
      return NextResponse.json([]);
    }

    const where: any = { publishedAt: { not: null }, takenDown: false };
    if (tags.length > 0) where.tags = { hasEvery: tags };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { author: { username: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const articles = await prisma.article.findMany({
      where,
      include: { author: publicAuthorSelect },
      orderBy: { publishedAt: 'desc' },
      take: 50,
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
    console.error('Error searching articles:', error);
    return NextResponse.json({ error: 'Failed to search articles' }, { status: 500 });
  }
}
