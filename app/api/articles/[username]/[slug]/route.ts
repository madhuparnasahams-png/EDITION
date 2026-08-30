import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  try {
    const { username, slug } = await params;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const article = await prisma.article.findUnique({
      where: {
        authorId_slug: {
          authorId: user.id,
          slug,
        },
      },
      include: { author: publicAuthorSelect },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Unpublished drafts are only visible to their author. Every current
    // creation path publishes immediately, but this guards against a
    // future draft/unpublish feature leaking content via a known slug.
    const { userId } = await auth();
    let requesterIsAuthor = false;
    if (userId) {
      const requester = await prisma.user.findUnique({ where: { clerkId: userId } });
      requesterIsAuthor = requester?.id === article.authorId;
    }
    if (!article.publishedAt && !requesterIsAuthor) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    let requesterIsAdmin = false;
    if (userId) {
      const requester = await prisma.user.findUnique({ where: { clerkId: userId }, select: { isAdmin: true } });
      requesterIsAdmin = !!requester?.isAdmin;
    }
    if (article.takenDown && !requesterIsAuthor && !requesterIsAdmin) {
      return NextResponse.json({ error: 'This article is no longer available' }, { status: 404 });
    }

    // Chapter navigation: only applies when this article belongs to an Issue
    // (serialized novels/zines). Ordered by publishedAt since articles are
    // immutable once published - that order never shifts under a reader.
    let prevArticle = null;
    let nextArticle = null;

    if (article.issueId && article.publishedAt) {
      [prevArticle, nextArticle] = await Promise.all([
        prisma.article.findFirst({
          where: {
            issueId: article.issueId,
            publishedAt: { lt: article.publishedAt },
            takenDown: false,
          },
          orderBy: { publishedAt: 'desc' },
          select: { slug: true, title: true },
        }),
        prisma.article.findFirst({
          where: {
            issueId: article.issueId,
            publishedAt: { gt: article.publishedAt },
            takenDown: false,
          },
          orderBy: { publishedAt: 'asc' },
          select: { slug: true, title: true },
        }),
      ]);
    }

    let isLiked = false;
    let isCached = false;
    let repostedByFollowed: string[] = [];
    let repostedByFollowedCount = 0;
    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (currentUser) {
        const [like, cacheEntry, following, reposts] = await Promise.all([
          prisma.like.findUnique({ where: { userId_articleId: { userId: currentUser.id, articleId: article.id } } }),
          prisma.cache.findUnique({ where: { userId_articleId: { userId: currentUser.id, articleId: article.id } } }),
          prisma.follow.findMany({ where: { followerId: currentUser.id }, select: { followingId: true } }),
          prisma.commPost.findMany({
            where: { quotedArticleId: article.id },
            select: { authorId: true, author: { select: { username: true } } },
          }),
        ]);
        isLiked = !!like;
        isCached = !!cacheEntry;
        const followingIds = new Set(following.map((f) => f.followingId));
        const matches = reposts.filter((r) => followingIds.has(r.authorId));
        repostedByFollowedCount = matches.length;
        repostedByFollowed = matches.slice(0, 3).map((r) => r.author.username);
      }
    }

    return NextResponse.json({
      ...article,
      prevArticle,
      nextArticle,
      isLiked,
      isCached,
      isAuthor: requesterIsAuthor,
      repostedByFollowed,
      repostedByFollowedCount,
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
