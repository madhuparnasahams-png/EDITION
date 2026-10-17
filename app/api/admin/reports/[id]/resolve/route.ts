import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// POST /api/admin/reports/[id]/resolve - dismiss a report, no action taken
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAdminWithPassword();
    if ('error' in r) return r.error;

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
