import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasValidAdminCookie, adminPasswordRequiredResponse } from '@/lib/adminAuth';

// DELETE /api/comments/[id] - the commenter, the article's author, or an admin (with password cookie)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id }, include: { article: { select: { authorId: true } } } });
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowedWithoutAdmin = comment.authorId === user.id || comment.article.authorId === user.id;
    if (!allowedWithoutAdmin) {
      if (!user.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!(await hasValidAdminCookie())) return adminPasswordRequiredResponse();
    }

    await prisma.comment.delete({ where: { id } });
    await prisma.mention.deleteMany({ where: { sourceType: 'COMMENT', sourceId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
