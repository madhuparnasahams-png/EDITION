'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Nav from '@/components/Nav';
import ContentActions from '@/components/ContentActions';

interface CacheItem {
  id: string;
  slug: string;
  title: string;
  creatorUsername: string;
  creatorCardColor?: string;
  savedAt: string;
  thumbnail?: string;
  type: 'issues' | 'av' | 'articles';
  isLiked?: boolean;
}

const TABS = ['Issues', 'AV', 'Articles'] as const;
type TabType = (typeof TABS)[number];

function bucketByTime(items: CacheItem[]) {
  const now = new Date();
  const buckets: Record<string, CacheItem[]> = {
    'This Week': [],
    'This Month': [],
    'Last Month': [],
    'Last 3 Months': [],
    Rest: [],
  };

  for (const item of items) {
    const saved = new Date(item.savedAt);
    const daysAgo = (now.getTime() - saved.getTime()) / (1000 * 60 * 60 * 24);

    if (daysAgo <= 7) buckets['This Week'].push(item);
    else if (daysAgo <= 30) buckets['This Month'].push(item);
    else if (daysAgo <= 60) buckets['Last Month'].push(item);
    else if (daysAgo <= 90) buckets['Last 3 Months'].push(item);
    else buckets['Rest'].push(item);
  }

  return buckets;
}

export default function Cache() {
  const { isSignedIn } = useUser();
  const [items, setItems] = useState<CacheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Issues');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchCache = async () => {
      try {
        const response = await fetch('/api/cache');
        if (response.ok) setItems(await response.json());
      } catch (error) {
        console.error('Failed to fetch cache:', error);
      } finally {
        setLoading(false);
      }
    };
    if (isSignedIn) fetchCache();
    else setLoading(false);
  }, [isSignedIn]);

  const filtered = items
    .filter((item) => item.type === activeTab.toLowerCase())
    .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  const buckets = bucketByTime(filtered);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="py-5">
        {/* Header + search */}
        <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold mb-4">Cache</h1>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your cache..."
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black"
          />
        </div>

        {/* Section tabs */}
        <div className="flex gap-4 px-4 py-4 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm whitespace-nowrap pb-2 border-b-2 transition ${
                activeTab === tab ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {!isSignedIn ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-12">Sign in to see your cache</p>
        ) : loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-12">Nothing saved here yet</p>
        ) : (
          Object.entries(buckets).map(([label, bucketItems]) =>
            bucketItems.length > 0 ? (
              <div key={label} className="mb-8">
                <h2 className="text-sm font-bold px-4 pb-3">{label}</h2>
                <div className="flex gap-3 px-4 overflow-x-auto pb-2">
                  {bucketItems.map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-[140px]">
                      <Link href={`/c/${item.creatorUsername}/p/${item.slug}`}>
                        <div
                          className="w-full aspect-[4/5] mb-2 overflow-hidden"
                          style={{ backgroundColor: item.thumbnail ? undefined : (item.creatorCardColor || '#3A3A3A') }}
                        >
                          {item.thumbnail && (
                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="text-sm font-bold leading-tight mb-1 truncate hover:opacity-60 transition">{item.title}</div>
                      </Link>
                      <Link
                        href={`/c/${item.creatorUsername}`}
                        className="text-xs text-gray-400 dark:text-gray-500 mb-2 block hover:text-black dark:hover:text-white transition"
                      >
                        {item.creatorUsername}
                      </Link>
                      <ContentActions
                        articleId={item.id}
                        initialLiked={item.isLiked}
                        initialCached={true}
                        onCacheChange={(isCached) => {
                          if (!isCached) {
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )
        )}
      </main>
    </div>
  );
}
