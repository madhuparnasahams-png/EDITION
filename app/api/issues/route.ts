import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cleanTitle, cleanDescription, MAX_URL_LENGTH } from '@/lib/validation';

// GET /api/issues - global feed of all published issues across creators
export async function GET() {
  try {
    const issues = await prisma.issue.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      include: {
        author: publicAuthorSelect,
        _count: { select: { articles: { where: { publishedAt: { not: null }, takenDown: false } } } },
      },
      take: 50,
    });

    const enriched = issues.map(({ _count, ...rest }) => ({
      ...rest,
      itemCount: _count.articles,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

// POST /api/issues - create a new Issue (board). Publishing an article into
// one is a separate step (POST /api/articles with issueId set).
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { title, description, coverImage } = await request.json();
    const cleanedTitle = cleanTitle(title);
    if (!cleanedTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const issue = await prisma.issue.create({
      data: {
        title: cleanedTitle,
        description: cleanDescription(description),
        coverImage: typeof coverImage === 'string' && coverImage.length <= MAX_URL_LENGTH ? coverImage : null,
        authorId: user.id,
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 });
  }
}