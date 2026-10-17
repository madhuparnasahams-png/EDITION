import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Second factor for the admin panel: isAdmin (DB flag) AND a server-verified
// password cookie. The cookie is HMAC-signed and carries BOTH expiry stamps
// inside the signed payload, so neither can be extended by editing it.
//   - idle window: 15 minutes, slides forward on every verified admin call
//   - absolute cap: 8 hours from unlock, never slides

export const ADMIN_COOKIE = 'edition_admin';
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
export const IDLE_MS = 15 * 60 * 1000;
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

function secret() {
  const s = process.env.ADMIN_PANEL_SECRET;
  if (!s || s.length < 16) throw new Error('ADMIN_PANEL_SECRET must be set (16+ chars)');
  return s;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(`${process.env.ADMIN_PANEL_PASSWORD ?? ''}.${payload}`).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function makeToken(absExp: number, idleExp: number) {
  const payload = `${absExp}.${idleExp}`;
  return `${payload}.${sign(payload)}`;
}

function parseToken(token: string | undefined): { absExp: number; idleExp: number } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [a, i, sig] = parts;
  const absExp = Number(a);
  const idleExp = Number(i);
  if (!Number.isFinite(absExp) || !Number.isFinite(idleExp)) return null;
  try {
    if (!safeEqual(sig, sign(`${a}.${i}`))) return null;
  } catch {
    return null;
  }
  const now = Date.now();
  if (now > absExp || now > idleExp) return null;
  return { absExp, idleExp };
}

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.max(1, Math.floor(maxAgeMs / 1000)),
  };
}

export function issueAdminCookie(res: NextResponse) {
  const now = Date.now();
  const absExp = now + ABSOLUTE_MS;
  const idleExp = Math.min(now + IDLE_MS, absExp);
  res.cookies.set(ADMIN_COOKIE, makeToken(absExp, idleExp), cookieOptions(IDLE_MS));
}

export function checkAdminPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PANEL_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  return safeEqual(
    createHmac('sha256', 'pw').update(input).digest('hex'),
    createHmac('sha256', 'pw').update(expected).digest('hex')
  );
}

export function isLockedOut(user: { adminLockedUntil: Date | null }): boolean {
  return !!user.adminLockedUntil && user.adminLockedUntil.getTime() > Date.now();
}

export async function recordFailedAttempt(userId: string, currentCount: number) {
  const next = currentCount + 1;
  await prisma.user.update({
    where: { id: userId },
    data:
      next >= MAX_FAILED
        ? { adminFailedAttempts: 0, adminLockedUntil: new Date(Date.now() + LOCK_MS) }
        : { adminFailedAttempts: next },
  });
}

export async function clearFailedAttempts(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { adminFailedAttempts: 0, adminLockedUntil: null } });
}

// Verifies the cookie; on success slides the idle window (never past the cap).
export async function hasValidAdminCookie(_request?: Request): Promise<boolean> {
  try {
    const store = await cookies();
    const parsed = parseToken(store.get(ADMIN_COOKIE)?.value);
    if (!parsed) return false;
    const idleExp = Math.min(Date.now() + IDLE_MS, parsed.absExp);
    store.set(ADMIN_COOKIE, makeToken(parsed.absExp, idleExp), cookieOptions(IDLE_MS));
    return true;
  } catch {
    return false;
  }
}

export function adminPasswordRequiredResponse() {
  return NextResponse.json(
    { error: 'Admin password required', code: 'ADMIN_PASSWORD_REQUIRED' },
    { status: 403 }
  );
}
