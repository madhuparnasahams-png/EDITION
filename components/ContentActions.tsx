'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'copyright', label: 'Copyright' },
  { value: 'dmca', label: 'DMCA' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

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
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const iconSize = size === 'md' ? 'text-xl' : 'text-lg';
  const iconColor = forceDark === undefined ? 'text-black dark:text-white' : forceDark ? 'text-white' : 'text-black';
  const boxSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

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

  const openReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requireAuth()) return;
    if (reported) return;
    setReportOpen((v) => !v);
  };

  const submitReport = async (e: React.MouseEvent, reason: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmittingReport(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, reason }),
      });
      if (!res.ok) throw new Error('report failed');
      setReported(true);
      setReportOpen(false);
    } catch (error) {
      console.error('Report submission failed:', error);
      alert('Failed to submit report. Try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2.5">
      <button
        onClick={openReport}
        aria-label={reported ? 'Reported' : 'Flag content'}
        title={reported ? 'Reported' : 'Flag content'}
        className={`${boxSize} inline-block border-none p-0 cursor-pointer ${reported ? 'bg-black dark:bg-white' : 'bg-red-700'}`}
      />
      <button
        onClick={toggleLike}
        aria-label="Like"
        className={`${iconSize} leading-none bg-transparent border-none cursor-pointer active:opacity-60 transition ${iconColor}`}
      >
        {liked ? '♥' : '♡'}
      </button>
      <button
        onClick={toggleCache}
        aria-label="Save to cache"
        className={`${iconSize} leading-none bg-transparent border-none cursor-pointer active:opacity-60 transition ${iconColor}`}
      >
        {cached ? '🗀' : '🗁'}
      </button>

      {reportOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 shadow-lg z-20 min-w-[140px]"
        >
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={(e) => submitReport(e, r.value)}
              disabled={submittingReport}
              className="block w-full text-left text-xs px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition disabled:opacity-40"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
