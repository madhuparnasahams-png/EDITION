import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const ARTICLE_TAKE = 30;
const ISSUE_TAKE = 15;
const COMM_TAKE = 20;
const TOTAL_TAKE = 40;

// GET /api/feed/mixed - the Home feed's main stream: articles, AV, and
// issues from everyone, interleaved by recency with Comm posts (quotes and
// reposts) but ONLY from creators the current reader follows. A reader who
// follows nobody simply sees no Comm posts here - the Comm tab on a
// creator's own Spread stays fully public regardless; this restriction is
// specific to this aggregated feed.
export async function GET() {
  try {
    const { userId } = await auth();
    let currentUserId: string | null = null;
    let followingIds: string[] = [];

    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (currentUser) {
        currentUserId = currentUser.id;
        const follows = await prisma.follow.findMany({
          where: { followerId: currentUser.id },
          select: { followingId: true },
        });
        followingIds = follows.map((f) => f.followingId);
      }
    }

    const [articles, issues, commPosts] = await Promise.all([
      prisma.article.findMany({
        where: { publishedAt: { not: null }, takenDown: false, issueId: null },
        include: { author: publicAuthorSelect },
        orderBy: { publishedAt: 'desc' },
        take: ARTICLE_TAKE,
      }),
      prisma.issue.findMany({
        where: { publishedAt: { not: null } },
        include: {
          author: publicAuthorSelect,
          _count: { select: { articles: { where: { publishedAt: { not: null }, takenDown: false } } } },
        },
        orderBy: { publishedAt: 'desc' },
        take: ISSUE_TAKE,
      }),
      followingIds.length > 0
        ? prisma.commPost.findMany({
            where: {
              authorId: { in: followingIds },
              OR: [{ quotedArticleId: null }, { quotedArticle: { takenDown: false } }],
            },
            include: {
              author: publicAuthorSelect,
              quotedArticle: {
                select: { id: true, slug: true, title: true, featuredImage: true, author: publicAuthorSelect },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: COMM_TAKE,
          })
        : Promise.resolve([]),
    ]);

    let likedIds = new Set<string>();
    let cachedIds = new Set<string>();
    if (currentUserId) {
      const articleIds = articles.map((a) => a.id);
      const [likes, cacheEntries] = await Promise.all([
        prisma.like.findMany({ where: { userId: currentUserId, articleId: { in: articleIds } } }),
        prisma.cache.findMany({ where: { userId: currentUserId, articleId: { in: articleIds } } }),
      ]);
      likedIds = new Set(likes.map((l) => l.articleId));
      cachedIds = new Set(cacheEntries.map((c) => c.articleId));
    }

    const items = [
      ...articles.map((a) => ({
        kind: 'article' as const,
        sortDate: a.publishedAt!,
        data: { ...a, isLiked: likedIds.has(a.id), isCached: cachedIds.has(a.id) },
      })),
      ...issues.map(({ _count, ...issue }) => ({
        kind: 'issue' as const,
        sortDate: issue.publishedAt!,
        data: { ...issue, itemCount: _count.articles },
      })),
      ...commPosts.map((post) => ({
        kind: 'comm' as const,
        sortDate: post.createdAt,
        data: post,
      })),
    ]
      .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
      .slice(0, TOTAL_TAKE)
      .map(({ sortDate, ...item }) => item); // sortDate was only for ordering, not needed by the client

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching mixed feed:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}
