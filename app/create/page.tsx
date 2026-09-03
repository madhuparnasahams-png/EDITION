'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Nav from '@/components/Nav';

const OPTIONS = [
  {
    key: 'article',
    label: 'Article',
    description: 'A blog post, essay, or written piece. Full Block Editor - text, images, quotes.',
  },
  {
    key: 'av',
    label: 'AV',
    description: 'Audio or video content - embed a track, episode, or clip.',
  },
  {
    key: 'comm',
    label: 'Comm',
    description: 'A short text post or quote - like a note. Shows up on your Comm tab.',
  },
] as const;

export default function CreatePicker() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  // Our own Prisma username, not Clerk's - the two can diverge if the
  // webhook had to de-duplicate on signup, and /c/[username] only
  // recognizes the Prisma one.
  const [ownUsername, setOwnUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
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

  const handleSelect = (key: (typeof OPTIONS)[number]['key']) => {
    if (key === 'comm') {
      if (!ownUsername) return;
      router.push(`/c/${ownUsername}?tab=Comm`);
    } else {
      router.push(`/dashboard?format=${key}`);
    }
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-white dark:bg-black" />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Nav />
        <p className="text-center py-12 text-black dark:text-white">Sign in to create.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">What are you creating?</h1>

        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className="text-left border border-gray-300 dark:border-gray-700 p-4 hover:border-black dark:hover:border-white transition"
            >
              <div className="text-base font-bold mb-1">{opt.label}</div>
              <div className="text-xs text-black dark:text-white">{opt.description}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
