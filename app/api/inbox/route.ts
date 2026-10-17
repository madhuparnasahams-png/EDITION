import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/inbox - mentions + Edition notices, newest first
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [mentions, notices] = await Promise.all([
      prisma.mention.findMany({
        where: { mentionedUserId: user.id, author: { hiddenByAdmin: false } },
        include: {
          author: publicAuthorSelect,
          article: { select: { slug: true, title: true, takenDown: true, hidden: true, author: { select: { username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.notice.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    const items = [
      ...mentions.map((m) => ({
        kind: 'mention' as const,
        id: m.id,
        read: m.read,
        createdAt: m.createdAt,
        sourceType: m.sourceType,
        snippet: m.snippet,
        author: m.author,
        link:
          m.article && !m.article.takenDown && !m.article.hidden
            ? `/c/${m.article.author.username}/p/${m.article.slug}`
            : m.sourceType === 'COMM_POST'
              ? `/c/${m.author.username}`
              : null,
        articleTitle: m.article?.title ?? null,
      })),
      ...notices.map((n) => ({
        kind: 'notice' as const,
        id: n.id,
        read: n.read,
        createdAt: n.createdAt,
        type: n.type,
        message: n.message,
      })),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}
