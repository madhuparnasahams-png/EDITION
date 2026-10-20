import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/health - uptime check. Confirms the app is running and the
// database answers. Returns nothing sensitive. Point a free monitor
// (e.g. UptimeRobot) at this URL to be alerted when Edition goes down.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
