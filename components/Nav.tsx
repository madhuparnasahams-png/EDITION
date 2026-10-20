'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { Menu, Search, Mail, X } from '@/components/Icons';
import SlidingTabs from '@/components/SlidingTabs';

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
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      setOwnUsername(null);
      return;
    }
    let cancelled = false;
    fetch('/api/inbox/unread-count')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled && d) setUnread(d.count || 0); })
      .catch(() => {});
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
              className="bg-transparent border-none cursor-pointer p-0 text-black dark:text-white"
            >
              <Menu size={22} strokeWidth={1.8} />
            </button>
          </div>

          {/* Logo - truly centered via grid, not flex justify-between (which
              only centers when both side columns happen to be equal width,
              and the right side changes width between signed-in/out) */}
          <Link href="/" className="text-2xl font-bold text-black dark:text-white text-center">
            Edition
          </Link>

          {/* Search only - sign in/up/out all live in the hamburger menu,
              keeping this row uncluttered regardless of auth state. */}
          <div className="flex items-center justify-end gap-2">
            {isSignedIn && (
              <Link href="/inbox" aria-label="Inbox" className="relative p-2 inline-block">
                <Mail size={20} strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute top-1 right-0 min-w-[16px] h-4 px-1 bg-red-700 text-white text-[10px] font-bold leading-4 text-center animate-pop">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            )}
            <Link href="/discovery" aria-label="Search" className="p-2 bg-transparent border-none cursor-pointer inline-block">
              <Search size={20} strokeWidth={1.8} />
            </Link>
          </div>
        </div>

        {/* Optional second row - controlled by the parent page. Sliding
            underline (SlidingTabs) shows which tab is active - no color
            distinction needed since the label color stays the same. */}
        {tabs && tabs.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800">
            <SlidingTabs tabs={tabs} activeTab={activeTab || tabs[0]} onChange={(t) => onTabChange?.(t)} />
          </div>
        )}
      </nav>

      {/* Hamburger Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-white dark:bg-black z-[60] overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="bg-transparent border-none cursor-pointer text-black dark:text-white p-0">
              <X size={24} strokeWidth={1.8} />
            </button>
            <div className="text-2xl font-bold text-black dark:text-white">Edition</div>
            <div className="w-6" />
          </div>
          <ul className="list-none">
            {[
              { label: 'Home', href: '/' },
              { label: 'Discovery', href: '/discovery' },
              { label: 'Cache', href: '/cache' },
              ...(isSignedIn ? [{ label: unread > 0 ? `Inbox (${unread})` : 'Inbox', href: '/inbox' }] : []),
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
                    className="block w-full text-left hover:opacity-60 text-black dark:text-white bg-transparent border-none p-0 cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ) : (
                <li key={i} className="border-b border-gray-200 dark:border-gray-800 px-4 py-4 text-sm">
                  <Link href={item.href!} onClick={() => setMenuOpen(false)} className="block hover:opacity-60 text-black dark:text-white">
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
