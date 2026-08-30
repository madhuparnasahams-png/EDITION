'use client';

import { useState } from 'react';
import Nav from '@/components/Nav';

const FAQS = [
  {
    q: 'How do I create an article?',
    a: 'Go to Create, choose Article or AV, use the Block Editor to add text, images, videos and more. Click "Publish" when ready.',
  },
  {
    q: 'How do I save articles to Cache?',
    a: 'Click the cache icon on any piece. Your saved items appear in your Cache library organized by date.',
  },
  {
    q: 'How do I follow a creator?',
    a: 'Visit a creator\u2019s Spread (profile) and click the "Follow" button. Their new articles will appear in your Feed.',
  },
  {
    q: 'How does the algorithm work?',
    a: 'Edition curates content based on your interests and reading habits, blending creators/topics you follow with serendipitous discovery.',
  },
  {
    q: 'Can I earn money from my articles?',
    a: 'Monetization is planned for a later phase. For now, all content is free.',
  },
];

export default function HelpCenter() {
  const [query, setQuery] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filtered = FAQS.filter(
    (item) =>
      item.q.toLowerCase().includes(query.toLowerCase()) ||
      item.a.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-5">
        <h1 className="text-2xl font-bold mb-1">Help Center</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Find answers to common questions</p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help topics..."
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm mb-6 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black"
        />

        <div className="mb-6">
          {filtered.map((item) => (
            <div key={item.q} className="border-b border-gray-200 dark:border-gray-800 py-4 last:border-none">
              <button
                onClick={() => setOpenQuestion((prev) => (prev === item.q ? null : item.q))}
                className="w-full flex justify-between items-center text-left bg-transparent border-none cursor-pointer p-0"
              >
                <span className="text-sm font-bold">{item.q}</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">{openQuestion === item.q ? '\u2212' : '+'}</span>
              </button>
              {openQuestion === item.q && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2">{item.a}</p>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-sm font-bold mb-2">Still need help?</div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            Can&apos;t find what you&apos;re looking for? Contact our support team.
          </p>
          <a
            href="/contact"
            className="inline-block bg-black text-white dark:bg-white dark:text-black text-xs font-semibold px-4 py-2 hover:opacity-80 transition"
          >
            Contact Support
          </a>
        </div>
      </main>
    </div>
  );
}
