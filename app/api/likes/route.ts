import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/likes - like an article
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

    const { articleId } = await request.json();
    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true } });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const like = await prisma.like.upsert({
      where: { userId_articleId: { userId: user.id, articleId } },
      create: { userId: user.id, articleId },
      update: {},
    });

    return NextResponse.json(like, { status: 201 });
  } catch (error) {
    console.error('Error liking article:', error);
    return NextResponse.json({ error: 'Failed to like article' }, { status: 500 });
  }
}

// DELETE /api/likes?articleId=xxx - unlike an article
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const articleId = request.nextUrl.searchParams.get('articleId');
    if (!articleId) {
      return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
    }

    await prisma.like.deleteMany({
      where: { userId: user.id, articleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unliking article:', error);
    return NextResponse.json({ error: 'Failed to unlike article' }, { status: 500 });
  }
}
