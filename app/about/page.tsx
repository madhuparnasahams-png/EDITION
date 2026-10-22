import Nav from '@/components/Nav';

import type { Metadata } from 'next';

// Intentionally blank for now, and kept out of search results until it has content.
export const metadata: Metadata = {
  title: 'About',
  robots: { index: false, follow: true },
};

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />
      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="sr-only">About Edition</h1>
      </main>
    </div>
  );
}
