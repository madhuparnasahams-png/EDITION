import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/articles/[id]/feature - toggle whether an article shows
// in the Home feed's hero carousel. This is deliberately manual, not
// algorithmic - the only curation mechanism Edition has right now.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { featured } = await request.json();

    if (typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'featured must be a boolean' }, { status: 400 });
    }

    const article = await prisma.article.update({
      where: { id },
      data: { featured },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error updating featured status:', error);
    return NextResponse.json({ error: 'Failed to update featured status' }, { status: 500 });
  }
}
