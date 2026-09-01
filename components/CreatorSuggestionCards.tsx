'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SuggestedCreator {
  id: string;
  username: string;
  avatar?: string;
  tagline?: string;
  cardColor?: string;
  followerCount: number;
}

function getReadableTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

// A horizontally swipeable strip of creators to follow, meant to be
// dropped into the middle of the mixed feed rather than pinned to one
// spot - discovery mixed in alongside content, not a separate destination.
export default function CreatorSuggestionCards({ creators }: { creators: SuggestedCreator[] }) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (creators.length === 0) return null;

  const follow = async (creatorId: string) => {
    setPendingId(creatorId);
    setFollowingIds((prev) => new Set(prev).add(creatorId)); // optimistic
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) throw new Error('follow failed');
    } catch (error) {
      console.error('Failed to follow:', error);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(creatorId);
        return next;
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mb-2">
      <h2 className="text-sm font-bold mb-4 text-gray-500 dark:text-gray-400">Creators to follow</h2>
      <div className="flex gap-3 overflow-x-auto snap-x snap-proximity pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {creators.map((creator) => {
          const isFollowing = followingIds.has(creator.id);
          const cardColor = creator.cardColor || '#3A3A3A';
          return (
            <div
              key={creator.id}
              className="flex-shrink-0 w-[160px] snap-start p-4 flex flex-col justify-between"
              style={{ backgroundColor: cardColor, color: getReadableTextColor(cardColor) }}
            >
              <Link href={`/c/${creator.username}`} className="block mb-3">
                <div className="w-12 h-12 rounded-full bg-black/20 overflow-hidden mb-2">
                  {creator.avatar && <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />}
                </div>
                <div className="text-sm font-bold leading-tight truncate">{creator.tagline || creator.username}</div>
                <div className="text-xs opacity-70 truncate">@{creator.username}</div>
              </Link>
              <button
                onClick={() => follow(creator.id)}
                disabled={isFollowing || pendingId === creator.id}
                className="text-xs font-semibold px-3 py-1.5 border border-current disabled:opacity-60 transition"
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
