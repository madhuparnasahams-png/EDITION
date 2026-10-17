import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// GET /api/admin/users?q= - search accounts (admin-only)
export async function GET(request: NextRequest) {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 50);
    const users = await prisma.user.findMany({
      where: q ? { username: { contains: q, mode: 'insensitive' } } : { hiddenByAdmin: true },
      select: { id: true, username: true, avatar: true, hiddenByAdmin: true, isAdmin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
