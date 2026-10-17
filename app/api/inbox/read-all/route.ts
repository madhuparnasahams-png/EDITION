import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    await Promise.all([
      prisma.mention.updateMany({ where: { mentionedUserId: user.id, read: false }, data: { read: true } }),
      prisma.notice.updateMany({ where: { userId: user.id, read: false }, data: { read: true } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marking inbox read:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
