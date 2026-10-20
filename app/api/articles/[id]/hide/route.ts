import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminCookie, adminPasswordRequiredResponse } from '@/lib/adminAuth';

// POST /api/articles/[id]/hide - soft-hide/unhide. Author or admin. Reversible, nothing deleted.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = await params;
    const { hidden } = await request.json();
    if (typeof hidden !== 'boolean') return NextResponse.json({ error: 'hidden must be a boolean' }, { status: 400 });

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    const isAuthor = article.authorId === user.id;
    if (!isAuthor) {
      if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!(await hasValidAdminCookie())) return adminPasswordRequiredResponse();
    }

    if (isAuthor) {
      // An author can hide/unhide their own piece, but cannot undo an Edition takedown.
      if (article.takenDown) {
        return NextResponse.json({ error: 'Edition has taken this piece down. Contact us to appeal.' }, { status: 403 });
      }
      await prisma.article.update({ where: { id }, data: { hidden } });
    } else {
      // Admin action uses the takedown flag so the author cannot reverse it.
      await prisma.article.update({
        where: { id },
        data: { takenDown: hidden, takedownReason: hidden ? 'Taken down by Edition' : null },
      });
    }

    if (!isAuthor) {
      await prisma.notice.create({
        data: {
          userId: article.authorId,
          articleId: article.id,
          type: hidden ? 'ARTICLE_HIDDEN' : 'ARTICLE_UNHIDDEN',
          message: hidden
            ? `Edition has hidden your piece "${article.title}" from public view while it is reviewed. Nothing has been deleted.`
            : `Your piece "${article.title}" is visible again.`,
        },
      });
    }
    return NextResponse.json({ ok: true, hidden });
  } catch (error) {
    console.error('Error hiding article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
