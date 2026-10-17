import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// DELETE /api/admin/featured/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  try {
    const { id } = await params;
    await prisma.featuredItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error removing featured item:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
