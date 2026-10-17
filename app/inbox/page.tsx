'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Nav from '@/components/Nav';

type InboxItem =
  | { kind: 'mention'; id: string; read: boolean; createdAt: string; sourceType: 'ARTICLE' | 'COMM_POST' | 'COMMENT'; snippet?: string | null; author: { username: string }; link: string | null; articleTitle: string | null }
  | { kind: 'notice'; id: string; read: boolean; createdAt: string; type: string; message: string };

const WHERE: Record<string, string> = { ARTICLE: 'a piece', COMM_POST: 'a Comm post', COMMENT: 'a comment' };

export default function InboxPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [items, setItems] = useState<InboxItem[] | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Fetch first, THEN mark read, so the list still shows what was unread.
    fetch('/api/inbox')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setItems(d);
        return fetch('/api/inbox/read-all', { method: 'POST' });
      })
      .catch(() => setItems([]));
  }, [isLoaded, isSignedIn]);

  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Nav />
        <p className="text-center py-12">Sign in to see your Inbox.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white animate-fade-in">
      <Nav />
      <main className="px-4 py-5 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Inbox</h1>
        {items === null ? (
          <p className="text-center py-12 opacity-60">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-center py-12">Nothing yet. When someone tags you with @ it shows up here.</p>
        ) : (
          <ul className="list-none flex flex-col">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className={`border-b border-gray-200 dark:border-gray-800 py-4 animate-slide-up ${item.read ? '' : 'border-l-2 border-l-red-700 pl-3'}`}>
                {item.kind === 'mention' ? (
                  <>
                    <p className="text-sm">
                      <Link href={`/c/${item.author.username}`} className="font-bold hover:underline">@{item.author.username}</Link>{' '}
                      mentioned you in {WHERE[item.sourceType]}
                      {item.articleTitle ? <> on <span className="italic">{item.articleTitle}</span></> : null}
                    </p>
                    {item.snippet && <p className="text-sm opacity-70 mt-1 break-words">&ldquo;{item.snippet}&rdquo;</p>}
                    {item.link && <Link href={item.link} className="text-xs underline mt-2 inline-block">Open</Link>}
                  </>
                ) : (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-red-700 mb-1">Edition</div>
                    <p className="text-sm">{item.message}</p>
                  </>
                )}
                <p className="text-xs opacity-50 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
