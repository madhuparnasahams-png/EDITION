import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// POST /api/admin/users/[id]/hide - investigative hold on an account.
// Profile and all content disappear from public view; nothing is deleted.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  try {
    const { id } = await params;
    const { hidden } = await request.json();
    if (typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'hidden must be a boolean' }, { status: 400 });
    }
    if (id === r.admin.id) {
      return NextResponse.json({ error: 'You cannot hide your own account' }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.isAdmin) return NextResponse.json({ error: 'Admin accounts cannot be hidden' }, { status: 403 });

    await prisma.user.update({ where: { id }, data: { hiddenByAdmin: hidden } });
    await prisma.notice.create({
      data: {
        userId: id,
        type: hidden ? 'ACCOUNT_HIDDEN' : 'ACCOUNT_UNHIDDEN',
        message: hidden
          ? 'Your account has been hidden from public view by Edition while we review it. Nothing has been deleted. You can contact us from the Contact page.'
          : 'Your account is visible again. Thank you for your patience.',
      },
    });
    return NextResponse.json({ ok: true, hidden });
  } catch (error) {
    console.error('Error hiding user:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
