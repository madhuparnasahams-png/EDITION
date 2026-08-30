import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const MAX_TEXT_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 20;

// POST /api/comm - create a short text post, optionally quoting/reposting an article
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

    const { text, quotedArticleId } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Text must be under ${MAX_TEXT_LENGTH} characters` }, { status: 400 });
    }

    if (quotedArticleId) {
      const article = await prisma.article.findUnique({ where: { id: quotedArticleId } });
      if (!article) {
        return NextResponse.json({ error: 'Quoted article not found' }, { status: 404 });
      }
      if (!article.publishedAt) {
        return NextResponse.json({ error: 'Cannot repost an unpublished article' }, { status: 403 });
      }
    }

    const recentCount = await prisma.commPost.count({
      where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many posts recently. Please try again later.' },
        { status: 429 }
      );
    }

    const post = await prisma.commPost.create({
      data: {
        text: text.trim(),
        authorId: user.id,
        quotedArticleId: quotedArticleId || null,
      },
      include: {
        author: publicAuthorSelect,
        quotedArticle: {
          select: {
            id: true,
            slug: true,
            title: true,
            featuredImage: true,
            author: publicAuthorSelect,
          },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating comm post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
