import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/featured - public hero carousel items, in admin-chosen order.
// Article items whose article was taken down/hidden (or whose author is held) are filtered out.
export async function GET() {
  try {
    const items = await prisma.featuredItem.findMany({
      orderBy: { order: 'asc' },
      include: {
        article: {
          select: {
            id: true, slug: true, title: true, description: true, featuredImage: true,
            takenDown: true, hidden: true, publishedAt: true,
            author: { select: { ...publicAuthorSelect.select, hiddenByAdmin: true } },
          },
        },
      },
    });
    const visible = items
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
      }));
    return NextResponse.json(visible);
  } catch (error) {
    console.error('Error fetching featured:', error);
    return NextResponse.json({ error: 'Failed to fetch featured' }, { status: 500 });
  }
}
