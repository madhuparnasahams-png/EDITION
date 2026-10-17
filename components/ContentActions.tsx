'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Heart } from 'lucide-react';
import ReportButton from '@/components/ReportButton';
import CacheIcon from '@/components/CacheIcon';

interface ContentActionsProps {
  articleId: string;
  initialLiked?: boolean;
  initialCached?: boolean;
  size?: 'sm' | 'md';
  forceDark?: boolean;
  onCacheChange?: (cached: boolean) => void;
}

export default function ContentActions({
  articleId,
  initialLiked = false,
  initialCached = false,
  size = 'sm',
  forceDark,
  onCacheChange,
}: ContentActionsProps) {
  const { isSignedIn } = useUser();
  const [liked, setLiked] = useState(initialLiked);
  const [cached, setCached] = useState(initialCached);
  const iconColor = forceDark === undefined ? 'text-black dark:text-white' : forceDark ? 'text-white' : 'text-black';
  const boxSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const cacheSize = size === 'md' ? 22 : 20;

  const requireAuth = () => {
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return true;
    }
    return false;
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requireAuth()) return;

    const wasLiked = liked;
    setLiked(!wasLiked);
    try {
      const res = wasLiked
        ? await fetch(`/api/likes?articleId=${articleId}`, { method: 'DELETE' })
        : await fetch('/api/likes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId }),
          });
      if (!res.ok) throw new Error('like toggle failed');
    } catch (error) {
      console.error('Like toggle failed:', error);
      setLiked(wasLiked);
    }
  };

  const toggleCache = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requireAuth()) return;

    const wasCached = cached;
    setCached(!wasCached);
    try {
      const res = wasCached
        ? await fetch(`/api/cache?articleId=${articleId}`, { method: 'DELETE' })
        : await fetch('/api/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articleId }),
          });
      if (!res.ok) throw new Error('cache toggle failed');
      onCacheChange?.(!wasCached);
    } catch (error) {
      console.error('Cache toggle failed:', error);
      setCached(wasCached);
    }
  };

  return (
    <div className="relative flex items-center gap-2.5">
      <ReportButton articleId={articleId} boxClassName={boxSize} />
      <button
        onClick={toggleLike}
        aria-label="Like"
        aria-pressed={liked}
        className={`leading-none bg-transparent border-none p-0 cursor-pointer active:opacity-60 transition ${iconColor}`}
      >
        <Heart
          key={liked ? 'on' : 'off'}
          size={cacheSize}
          strokeWidth={1.8}
          className={`${liked ? 'fill-current animate-heart' : 'fill-transparent'} transition-colors duration-200`}
        />
      </button>
      <button
        onClick={toggleCache}
        aria-label={cached ? 'Remove from cache' : 'Save to cache'}
        className="leading-none bg-transparent border-none p-0 cursor-pointer active:opacity-60 transition"
      >
        <CacheIcon cached={cached} size={cacheSize} />
      </button>
    </div>
  );
}
