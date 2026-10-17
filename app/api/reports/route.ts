import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const VALID_REASONS = new Set(['copyright', 'dmca', 'inappropriate', 'spam', 'other']);

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 20;

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

    const { articleId, commentId, reason, message } = await request.json();

    if ((!articleId && !commentId) || (articleId && commentId)) {
      return NextResponse.json({ error: 'Provide either articleId or commentId' }, { status: 400 });
    }
    if ((articleId && typeof articleId !== 'string') || (commentId && typeof commentId !== 'string')) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    if (!VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }
    if (message !== undefined && message !== null && (typeof message !== 'string' || message.length > 1000)) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const recent = await prisma.report.count({
      where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) } },
    });
    if (recent >= RATE_MAX) {
      return NextResponse.json({ error: 'Too many reports recently. Please try again later.' }, { status: 429 });
    }

    const data = { reason, message: message?.trim() || null };
    let report;
    if (articleId) {
      const article = await prisma.article.findUnique({ where: { id: articleId } });
      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      report = await prisma.report.upsert({
        where: { reporterId_articleId: { reporterId: user.id, articleId } },
        create: { ...data, reporterId: user.id, articleId },
        update: { ...data, status: 'new' },
      });
    } else {
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }
      report = await prisma.report.upsert({
        where: { reporterId_commentId: { reporterId: user.id, commentId } },
        create: { ...data, reporterId: user.id, commentId },
        update: { ...data, status: 'new' },
      });
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
