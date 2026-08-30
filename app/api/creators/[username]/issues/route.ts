import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const creator = await prisma.user.findUnique({ where: { username } });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const issues = await prisma.issue.findMany({
      where: { authorId: creator.id, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      include: {
        _count: { select: { articles: { where: { publishedAt: { not: null }, takenDown: false } } } },
      },
    });

    const enriched = issues.map(({ _count, ...rest }) => ({
      ...rest,
      itemCount: _count.articles,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching creator issues:', error);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}
