import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/search?q= - username autocomplete for @-mentions (signed-in only)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json([], { status: 401 });
    const q = (request.nextUrl.searchParams.get('q') || '').trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 30);
    if (q.length < 1) return NextResponse.json([]);
    const users = await prisma.user.findMany({
      where: { username: { startsWith: q, mode: 'insensitive' }, hiddenByAdmin: false },
      select: { username: true, avatar: true },
      orderBy: { username: 'asc' },
      take: 6,
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([]);
  }
}
