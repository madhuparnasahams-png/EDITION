import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ count: 0 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ count: 0 });
    const [m, n] = await Promise.all([
      prisma.mention.count({ where: { mentionedUserId: user.id, read: false } }),
      prisma.notice.count({ where: { userId: user.id, read: false } }),
    ]);
    return NextResponse.json({ count: m + n });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
