'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import ContentActions from '@/components/ContentActions';
import { THEMES, GENRES, TOPICS } from '@/lib/tags';

interface Article {
  id: string;
  slug: string;
  title: string;
  description?: string;
  featuredImage?: string;
  publishedAt: string;
  author: { username: string; cardColor?: string };
  isLiked?: boolean;
  isCached?: boolean;
}

function TagSection({ title, tags, active, onToggle }: { title: string; tags: string[]; active: Set<string>; onToggle: (tag: string) => void }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold mb-3">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`text-sm text-center py-2.5 px-3 border transition ${
              active.has(tag) ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'bg-gray-50 dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Discovery() {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  useEffect(() => {
    if (activeTags.size === 0 && !query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const tagsParam = Array.from(activeTags).join(',');
        const params = new URLSearchParams();
        if (tagsParam) params.set('tags', tagsParam);
        if (query.trim()) params.set('q', query.trim());
        const response = await fetch(`/api/articles/search?${params.toString()}`);
        if (response.ok && !cancelled) setResults(await response.json());
      } catch (error) {
        if (!cancelled) console.error('Failed to search articles:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [activeTags, query]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators, topics..."
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm mb-6 focus:outline-none focus:border-black dark:focus:border-white focus:bg-white dark:focus:bg-black"
        />

        <TagSection title="Themes" tags={THEMES} active={activeTags} onToggle={toggleTag} />
        <TagSection title="Genres" tags={GENRES} active={activeTags} onToggle={toggleTag} />
        <TagSection title="Topics" tags={TOPICS} active={activeTags} onToggle={toggleTag} />

        {/* Results - same single-column magazine card style as Home / Spread */}
        {(activeTags.size > 0 || query.trim().length > 0) && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-bold mb-4 text-gray-500 dark:text-gray-400">
              {loading ? 'Searching...' : `${results.length} result${results.length === 1 ? '' : 's'}`}
            </h2>

            {!loading && results.length === 0 && (
              <p className="text-center text-gray-400 dark:text-gray-500 py-8">
                Nothing matches this combination yet.
              </p>
            )}

            <div className="flex flex-col gap-8">
              {results.map((article) => (
                <div key={article.id}>
                  <Link href={`/c/${article.author.username}/p/${article.slug}`}>
                    <div
                      className="w-[70%] aspect-[4/5] mx-auto mb-3 overflow-hidden"
                      style={{ backgroundColor: article.featuredImage ? undefined : (article.author.cardColor || '#3A3A3A') }}
                    >
                      {article.featuredImage && (
                        <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                  </Link>

                  <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                    <h3 className="text-[21px] font-bold leading-tight self-end">
                      <Link href={`/c/${article.author.username}/p/${article.slug}`} className="hover:opacity-60 transition">
                        {article.title}
                      </Link>
                    </h3>
                    <span className="text-sm text-black dark:text-white text-right self-end">
                      {new Date(article.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>

                    <ContentActions
                      articleId={article.id}
                      initialLiked={article.isLiked}
                      initialCached={article.isCached}
                    />
                    <div className="self-center text-sm text-black dark:text-white text-right">
                      {article.author.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
