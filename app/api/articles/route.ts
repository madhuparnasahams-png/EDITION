import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/articles
export async function GET(request: NextRequest) {
  try {
    const articles = await prisma.article.findMany({
      where: { publishedAt: { not: null }, takenDown: false },
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
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

// POST /api/articles
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, blocks, tags, format, isFree, price, issueId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If publishing into an Issue, make sure it exists and belongs to this author.
    // Silently ignoring a bad/foreign issueId would let an article vanish into
    // someone else's Issue (or a nonexistent one) with no error surfaced.
    if (issueId) {
      const issue = await prisma.issue.findUnique({ where: { id: issueId } });
      if (!issue) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      if (issue.authorId !== user.id) {
        return NextResponse.json({ error: 'You can only publish into your own issues' }, { status: 403 });
      }
    }

    const baseSlug =
      title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 50) || 'untitled';

    let slug = baseSlug;
    let suffix = 1;
    while (
      await prisma.article.findUnique({
        where: { authorId_slug: { authorId: user.id, slug } },
      })
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    // Every card across Home/Discovery/Spread/Cache/Issues reads featuredImage,
    // but nothing ever set it - derive it from the first image block so
    // published articles actually get a thumbnail instead of a permanent
    // placeholder. Blocks are locked after publish, so this is stable.
    const firstImageBlock = Array.isArray(blocks)
      ? blocks.find((b: any) => b?.type === 'image' && typeof b?.content?.url === 'string' && b.content.url)
      : null;
    const featuredImage = firstImageBlock?.content?.url || null;

    const article = await prisma.article.create({
      data: {
        title,
        description,
        slug,
        authorId: user.id,
        isFree,
        price,
        format: format === 'AV' ? 'AV' : 'ARTICLE',
        publishedAt: new Date(),
        blocks: blocks || [],
        tags: Array.isArray(tags) ? tags : [],
        issueId: issueId || null,
        featuredImage,
      },
      include: { author: publicAuthorSelect },
    });

    // If publishing into an Issue that doesn't have a cover yet, use this
    // piece's featured image as the Issue's cover - there's no separate UI
    // for setting one, so without this every Issue shows "No Cover" forever.
    if (issueId && featuredImage) {
      const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { coverImage: true } });
      if (issue && !issue.coverImage) {
        await prisma.issue.update({ where: { id: issueId }, data: { coverImage: featuredImage } });
      }
    }

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
