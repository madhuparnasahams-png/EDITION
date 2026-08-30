'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser, useClerk, SignOutButton } from '@clerk/nextjs';

interface NavProps {
  tabs?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Nav({ tabs, activeTab, onTabChange }: NavProps) {
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Our own Prisma username, not Clerk's - the two can diverge when the
  // webhook had to de-duplicate a username on signup, and /c/[username]
  // routes only recognize the Prisma one.
  const [ownUsername, setOwnUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setOwnUsername(null);
      return;
    }
    let cancelled = false;
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.username) setOwnUsername(data.username);
      })
      .catch((error) => console.error('Failed to fetch current user:', error));
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return (
    <>
      <nav className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-black z-50">
        <div className="px-4 py-4 grid grid-cols-3 items-center">
          {/* Hamburger */}
          <div className="flex justify-start">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              className="flex flex-col justify-around w-6 h-5 bg-transparent border-none cursor-pointer p-0"
            >
              <span className="w-full h-0.5 bg-black dark:bg-white block" />
              <span className="w-full h-0.5 bg-black dark:bg-white block" />
              <span className="w-full h-0.5 bg-black dark:bg-white block" />
            </button>
          </div>

          {/* Logo - truly centered via grid, not flex justify-between (which
              only centers when both side columns happen to be equal width,
              and the right side changes width between signed-in/out) */}
          <Link href="/" className="text-2xl font-bold text-black dark:text-white text-center">
            Edition
          </Link>

          {/* Search + sign-out (signed in only). Sign in/up intentionally
              don't live here - they're reachable from the hamburger menu -
              keeping this row uncluttered for anonymous visitors. */}
          <div className="flex items-center justify-end gap-2">
            <Link href="/discovery" aria-label="Search" className="p-2 bg-transparent border-none cursor-pointer inline-block">
              🔍
            </Link>
            {isSignedIn && (
              <SignOutButton>
                <button className="bg-black text-white dark:bg-white dark:text-black text-xs font-semibold px-3 py-2">
                  Out
                </button>
              </SignOutButton>
            )}
          </div>
        </div>

        {/* Optional second row - controlled by the parent page */}
        {tabs && tabs.length > 0 && (
          <div className="flex justify-around border-t border-gray-200 dark:border-gray-800">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`flex-1 text-center py-3 text-sm border-b-2 transition ${
                  tab === activeTab
                    ? 'border-black text-black dark:border-white dark:text-white'
                    : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Hamburger Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-white dark:bg-black z-[60] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="text-2xl bg-transparent border-none cursor-pointer text-black dark:text-white">
              ✕
            </button>
            <div className="text-2xl font-bold text-black dark:text-white">Edition</div>
            <div className="w-6" />
          </div>
          <ul className="list-none">
            {[
              { label: 'Home', href: '/' },
              { label: 'Discovery', href: '/discovery' },
              { label: 'Cache', href: '/cache' },
              { label: 'gap' },
              { label: 'Create', href: '/create' },
              ...(isSignedIn && ownUsername
                ? [{ label: 'Spread (Profile)', href: `/c/${ownUsername}` }]
                : []),
              { label: 'gap' },
              { label: 'Settings', href: '/settings' },
              { label: 'Help Center', href: '/help' },
              { label: 'Contact', href: '/contact' },
              { label: 'About Edition', href: '/about' },
              { label: 'gap' },
              // Sign in/up now live only here, not in the top row - keep
              // that the sole, clearly-labeled entry point for signed-out
              // visitors (was previously a mislabeled "Spread (Profile)"
              // link pointing at /sign-in).
              ...(isSignedIn ? [{ label: 'Sign Out', href: null }] : [
                { label: 'Sign In', href: '/sign-in' },
                { label: 'Sign Up', href: '/sign-up' },
              ]),
            ].map((item, i) =>
              item.label === 'gap' ? (
                <li key={i} className="py-2" />
              ) : item.href === null ? (
                <li key={i} className="border-b border-gray-200 dark:border-gray-800 px-4 py-4 text-sm">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut(() => router.push('/'));
                    }}
                    className="block w-full text-left hover:opacity-60 transition text-black dark:text-white bg-transparent border-none p-0 cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ) : (
                <li key={i} className="border-b border-gray-200 dark:border-gray-800 px-4 py-4 text-sm">
                  <Link href={item.href!} onClick={() => setMenuOpen(false)} className="block hover:opacity-60 transition text-black dark:text-white">
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </>
  );
}