'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Nav from '@/components/Nav';
import { useAdminIdleLock } from '@/lib/useAdminIdleLock';

type Gate = 'checking' | 'forbidden' | 'locked' | 'open';

// Second factor UI for every admin page. Requires isAdmin (server-checked)
// AND the admin password. Re-locks after 15 minutes idle (or the 8-hour cap,
// which the server enforces) and shows the password prompt again.
export default function AdminGate({ children }: { children: (api: { lock: () => void }) => React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [gate, setGate] = useState<Gate>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const lock = useCallback((msg?: string) => {
    setGate('locked');
    setNotice(msg ?? 'Session locked. Enter the password to continue.');
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setGate('forbidden');
      return;
    }
    fetch('/api/admin/unlock')
      .then(async (res) => {
        if (!res.ok) return setGate('forbidden');
        const d = await res.json();
        setGate(d.unlocked ? 'open' : 'locked');
      })
      .catch(() => setGate('forbidden'));
  }, [isLoaded, isSignedIn]);

  useAdminIdleLock(gate === 'open', () => lock('Locked after 15 minutes of inactivity. Enter the password to continue.'));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword('');
        setNotice('');
        setGate('open');
      } else if (res.status === 429) {
        setError('Too many failed attempts. Try again in 15 minutes.');
      } else {
        setError('Incorrect password.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (gate === 'checking') return <div className="min-h-screen bg-white dark:bg-black" />;

  if (gate === 'forbidden') {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Nav />
        <p className="text-center py-12">Not authorized.</p>
      </div>
    );
  }

  if (gate === 'locked') {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white animate-fade-in">
        <Nav />
        <form onSubmit={submit} className="max-w-sm mx-auto px-4 py-20">
          <h1 className="text-2xl font-bold mb-2">Admin</h1>
          <p className="text-sm mb-6 opacity-70">{notice || 'Enter the admin password.'}</p>
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-black dark:border-white bg-transparent px-3 py-2 mb-3 focus:outline-none"
          />
          {error && <p className="text-sm text-red-700 mb-3 animate-slide-down">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full bg-black text-white dark:bg-white dark:text-black py-2 disabled:opacity-40"
          >
            {busy ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return <>{children({ lock: () => lock('Session expired. Enter the password to continue.') })}</>;
}
