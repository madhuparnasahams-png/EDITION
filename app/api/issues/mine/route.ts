import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/issues/mine - current user's own issues, used by the Dashboard
// when publishing an article into an Issue (chapter grouping)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const issues = await prisma.issue.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, coverImage: true },
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error('Error fetching own issues:', error);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}
