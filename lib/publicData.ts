import { prisma, publicAuthorSelect } from '@/lib/prisma';

// Public (not per-viewer) data for server-rendered pages. These mirror what
// the API routes return to a signed-out visitor, so Google and first paint see
// real content. Per-viewer extras (liked, cached, own profile, admin tools)
// are filled in by the client after load.

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const visibleArticle = { publishedAt: { not: null }, takenDown: false, hidden: false } as const;

export type Loaded<T> =
  | { state: 'ok'; data: T }
  | { state: 'restricted' } // exists but hidden / taken down: only owner and admin may see it
  | { state: 'missing' }
  | { state: 'error' };

export async function getPublicArticle(username: string, slug: string): Promise<Loaded<any>> {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return { state: 'missing' };

    const article = await prisma.article.findUnique({
      where: { authorId_slug: { authorId: user.id, slug } },
      include: { author: publicAuthorSelect },
    });
    if (!article || !article.publishedAt) return { state: 'missing' };
    if (article.takenDown || article.hidden || user.hiddenByAdmin) return { state: 'restricted' };

    let prevArticle = null;
    let nextArticle = null;
    if (article.issueId) {
      [prevArticle, nextArticle] = await Promise.all([
        prisma.article.findFirst({
          where: { issueId: article.issueId, ...visibleArticle, publishedAt: { lt: article.publishedAt } },
          orderBy: { publishedAt: 'desc' },
          select: { slug: true, title: true },
        }),
        prisma.article.findFirst({
          where: { issueId: article.issueId, ...visibleArticle, publishedAt: { gt: article.publishedAt } },
          orderBy: { publishedAt: 'asc' },
          select: { slug: true, title: true },
        }),
      ]);
    }

    return {
      state: 'ok',
      data: plain({
        ...article,
        prevArticle,
        nextArticle,
        isLiked: false,
        isCached: false,
        isAuthor: false,
        isAdmin: false,
        repostedByFollowed: [],
        repostedByFollowedCount: 0,
      }),
    };
  } catch (error) {
    console.error('getPublicArticle failed', error);
    return { state: 'error' };
  }
}

export async function getSpread(username: string): Promise<Loaded<{ creator: any; articles: any[]; issues: any[] }>> {
  try {
    const creator = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        bio: true,
        avatar: true,
        tagline: true,
        cardColor: true,
        createdAt: true,
        hiddenByAdmin: true,
        _count: { select: { followers: true } },
      },
    });
    if (!creator) return { state: 'missing' };
    if (creator.hiddenByAdmin) return { state: 'restricted' };

    const [articles, issues] = await Promise.all([
      prisma.article.findMany({
        where: { authorId: creator.id, ...visibleArticle },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.issue.findMany({
        where: { authorId: creator.id, publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        include: { _count: { select: { articles: { where: visibleArticle } } } },
      }),
    ]);

    const { _count, hiddenByAdmin: _h, ...rest } = creator;
    return {
      state: 'ok',
      data: plain({
        creator: { ...rest, followerCount: _count.followers, isFollowing: false, isOwnProfile: false },
        articles: articles.map((a) => ({ ...a, isLiked: false, isCached: false })),
        issues: issues.map(({ _count: c, ...i }) => ({ ...i, itemCount: c.articles })),
      }),
    };
  } catch (error) {
    console.error('getSpread failed', error);
    return { state: 'error' };
  }
}

export async function getIssuePublic(id: string): Promise<Loaded<any>> {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        author: { select: { ...publicAuthorSelect.select, hiddenByAdmin: true } },
        articles: { where: visibleArticle, orderBy: { publishedAt: 'asc' } },
      },
    });
    if (!issue) return { state: 'missing' };
    if (issue.author.hiddenByAdmin) return { state: 'restricted' };
    const { hiddenByAdmin: _h, ...author } = issue.author;
    return {
      state: 'ok',
      data: plain({ ...issue, author, articles: issue.articles.map((a) => ({ ...a, isLiked: false, isCached: false })) }),
    };
  } catch (error) {
    console.error('getIssuePublic failed', error);
    return { state: 'error' };
  }
}

export async function getFeaturedItems(): Promise<any[]> {
  try {
    const items = await prisma.featuredItem.findMany({
      orderBy: { order: 'asc' },
      include: {
        article: {
          select: {
            id: true, slug: true, title: true, description: true, featuredImage: true,
            takenDown: true, hidden: true, publishedAt: true,
            author: { select: { username: true, hiddenByAdmin: true } },
          },
        },
      },
    });
    return plain(
      items
        .filter((i) => i.type === 'IMAGE' || (i.article && !i.article.takenDown && !i.article.hidden && i.article.publishedAt && !i.article.author.hiddenByAdmin))
        .map((i) => ({
          id: i.id,
          type: i.type,
          imageUrl: i.imageUrl,
          title: i.title,
          linkUrl: i.linkUrl,
          article: i.article
            ? { id: i.article.id, slug: i.article.slug, title: i.article.title, description: i.article.description, featuredImage: i.article.featuredImage, author: { username: i.article.author.username } }
            : null,
        }))
    );
  } catch (error) {
    console.error('getFeaturedItems failed', error);
    return [];
  }
}

// Signed-out version of the Home feed (articles + issues). Comm posts only
// ever appear for readers who follow the poster, so there are none here.
export async function getAnonFeed(): Promise<any[]> {
  try {
    const [articles, issues] = await Promise.all([
      prisma.article.findMany({
        where: { ...visibleArticle, issueId: null, author: { hiddenByAdmin: false } },
        include: { author: publicAuthorSelect },
        orderBy: { publishedAt: 'desc' },
        take: 30,
      }),
      prisma.issue.findMany({
        where: { publishedAt: { not: null }, author: { hiddenByAdmin: false } },
        include: {
          author: publicAuthorSelect,
          _count: { select: { articles: { where: visibleArticle } } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 15,
      }),
    ]);
    const items = [
      ...articles.map((a) => ({ kind: 'article' as const, sortDate: a.publishedAt!, data: { ...a, isLiked: false, isCached: false } })),
      ...issues.map(({ _count, ...issue }) => ({ kind: 'issue' as const, sortDate: issue.publishedAt!, data: { ...issue, itemCount: _count.articles } })),
    ]
      .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
      .slice(0, 40)
      .map(({ sortDate, ...item }) => item);
    return plain(items);
  } catch (error) {
    console.error('getAnonFeed failed', error);
    return [];
  }
}
