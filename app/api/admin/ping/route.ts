import { NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';

// POST /api/admin/ping - heartbeat; verifying the cookie slides the idle window.
export async function POST() {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  return NextResponse.json({ ok: true });
}
