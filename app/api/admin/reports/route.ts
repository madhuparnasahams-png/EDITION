import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user?.isAdmin) return null;
  return user;
}

// GET /api/admin/reports - list all reports, newest first, admin-only
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
      },
      take: 200,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
