import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import {
  checkAdminPassword,
  issueAdminCookie,
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/adminAuth';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// POST /api/admin/unlock - second factor. Must already be isAdmin.
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!admin?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (isLockedOut(admin)) {
      return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    if (!checkAdminPassword(body?.password)) {
      await recordFailedAttempt(admin.id, admin.adminFailedAttempts);
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    await clearFailedAttempts(admin.id);
    const res = NextResponse.json({ ok: true });
    issueAdminCookie(res);
    return res;
  } catch (error) {
    console.error('Admin unlock error:', error);
    return NextResponse.json({ error: 'Failed to unlock' }, { status: 500 });
  }
}

// GET /api/admin/unlock - is the current session already unlocked?
// 403 = not an admin at all; 200 { unlocked: false } = admin, password needed.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { clerkId: userId }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const r = await requireAdminWithPassword();
  return NextResponse.json({ unlocked: !('error' in r) });
}
