'use client';
import { useEffect, useRef } from 'react';

const IDLE_MS = 15 * 60 * 1000;
const PING_EVERY_MS = 2 * 60 * 1000;

// While `active`, re-locks the admin UI after 15 minutes without activity
// and keeps the server-side idle window alive while the admin is working.
export function useAdminIdleLock(active: boolean, onLock: () => void) {
  const last = useRef(Date.now());
  const lastPing = useRef(0);
  const cb = useRef(onLock);
  cb.current = onLock;

  useEffect(() => {
    if (!active) return;
    last.current = Date.now();
    const bump = () => {
      const now = Date.now();
      last.current = now;
      if (now - lastPing.current > PING_EVERY_MS) {
        lastPing.current = now;
        fetch('/api/admin/ping', { method: 'POST' })
          .then((r) => { if (r.status === 403) cb.current(); })
          .catch(() => {});
      }
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - last.current > IDLE_MS) cb.current();
    }, 15_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [active]);
}
