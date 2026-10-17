import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { MAX_COMMENT_LENGTH } from '@/lib/validation';
import { createMentions } from '@/lib/mentions';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 15;

async function visibleArticle(id: string) {
  const a = await prisma.article.findUnique({
    where: { id },
    select: { id: true, publishedAt: true, takenDown: true, hidden: true, author: { select: { hiddenByAdmin: true } } },
  });
  if (!a || !a.publishedAt || a.takenDown || a.hidden || a.author.hiddenByAdmin) return null;
  return a;
}

// GET /api/articles/[id]/comments - flat list, oldest first
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await visibleArticle(id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const comments = await prisma.comment.findMany({
      where: { articleId: id, author: { hiddenByAdmin: false } },
      include: { author: publicAuthorSelect },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/articles/[id]/comments - flat, no replies, no notifications
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.hiddenByAdmin) return NextResponse.json({ error: 'Your account is under review' }, { status: 403 });

    const { id } = await params;
    if (!(await visibleArticle(id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { text } = await request.json();
    if (typeof text !== 'string' || !text.trim()) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    if (text.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `Comments must be under ${MAX_COMMENT_LENGTH} characters` }, { status: 400 });
    }

    const recent = await prisma.comment.count({
      where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    });
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: 'You are commenting too fast. Please wait a few minutes.' }, { status: 429 });
    }

    const comment = await prisma.comment.create({
      data: { text: text.trim(), authorId: user.id, articleId: id },
      include: { author: publicAuthorSelect },
    });
    await createMentions({ texts: [comment.text], authorId: user.id, sourceType: 'COMMENT', sourceId: comment.id, articleId: id });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
