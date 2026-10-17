import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// POST /api/admin/articles/[id]/takedown - hide an article app-wide.
// Reversible: sets takenDown, doesn't delete anything or touch publishedAt,
// so chapter ordering and the article's own history stay intact if restored.
// Also marks any open reports on it resolved.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAdminWithPassword();
    if ('error' in r) return r.error;

    const { id } = await params;
    const { takenDown, reason } = await request.json();

    if (typeof takenDown !== 'boolean') {
      return NextResponse.json({ error: 'takenDown must be a boolean' }, { status: 400 });
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        takenDown,
        takedownReason: takenDown ? (typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 300) : 'Taken down by Edition') : null,
      },
    });

    if (takenDown) {
      await prisma.report.updateMany({
        where: { articleId: id, status: 'new' },
        data: { status: 'resolved' },
      });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error updating takedown status:', error);
    return NextResponse.json({ error: 'Failed to update takedown status' }, { status: 500 });
  }
}
