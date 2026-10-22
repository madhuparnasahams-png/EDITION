import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/site';

// Built from the database on request. Hidden, taken-down and held-account
// content never appears here.
export const dynamic = 'force-dynamic';

const STATIC_PATHS = ['/', '/discovery', '/help', '/contact', '/legal/terms', '/legal/privacy'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: absoluteUrl(p),
    changeFrequency: p === '/' ? 'daily' : 'monthly',
    priority: p === '/' ? 1 : 0.5,
  }));

  try {
    const visibleArticle = { publishedAt: { not: null }, takenDown: false, hidden: false } as const;

    const [articles, creators, issues] = await Promise.all([
      prisma.article.findMany({
        where: { ...visibleArticle, author: { hiddenByAdmin: false } },
        select: { slug: true, updatedAt: true, author: { select: { username: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 20000,
      }),
      prisma.user.findMany({
        where: { hiddenByAdmin: false, articles: { some: visibleArticle } },
        select: { username: true, updatedAt: true },
        take: 10000,
      }),
      prisma.issue.findMany({
        where: { publishedAt: { not: null }, author: { hiddenByAdmin: false }, articles: { some: visibleArticle } },
        select: { id: true, updatedAt: true, author: { select: { username: true } } },
        take: 10000,
      }),
    ]);

    for (const c of creators) {
      entries.push({ url: absoluteUrl(`/c/${c.username}`), lastModified: c.updatedAt, changeFrequency: 'weekly', priority: 0.6 });
    }
    for (const a of articles) {
      entries.push({
        url: absoluteUrl(`/c/${a.author.username}/p/${a.slug}`),
        lastModified: a.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }
    for (const i of issues) {
      entries.push({ url: absoluteUrl(`/c/${i.author.username}/issue/${i.id}`), lastModified: i.updatedAt, changeFrequency: 'weekly', priority: 0.6 });
    }
  } catch (error) {
    console.error('Sitemap: database unavailable, serving static entries only', error);
  }

  return entries;
}
