import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// GET /api/admin/reports - list all reports, newest first, admin-only
export async function GET() {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;

  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: publicAuthorSelect,
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            takenDown: true,
            takedownReason: true,
            author: publicAuthorSelect,
          },
        },
        comment: {
          select: {
            id: true,
            text: true,
            article: { select: { slug: true, title: true, author: { select: { username: true } } } },
            author: publicAuthorSelect,
          },
        },
      },
      take: 200,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
