import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/admin/reports/[id]/resolve - dismiss a report, no action taken
export async function POST(
  request: Request,
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
    const report = await prisma.report.update({
      where: { id },
      data: { status: 'resolved' },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error resolving report:', error);
    return NextResponse.json({ error: 'Failed to resolve report' }, { status: 500 });
  }
}
