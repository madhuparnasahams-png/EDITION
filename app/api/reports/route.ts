import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const VALID_REASONS = new Set(['copyright', 'dmca', 'inappropriate', 'spam', 'other']);

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

    const { articleId, reason, message } = await request.json();

    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }
    if (!VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }
    if (message && message.length > 1000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const report = await prisma.report.upsert({
      where: { reporterId_articleId: { reporterId: user.id, articleId } },
      create: {
        reason,
        message: message?.trim() || null,
        reporterId: user.id,
        articleId,
      },
      update: {
        reason,
        message: message?.trim() || null,
        status: 'new',
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
