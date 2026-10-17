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

interface ReportButtonProps {
  articleId?: string;
  commentId?: string;
  boxClassName?: string; // size of the red box
  menuPosition?: 'above' | 'below';
}

// The red box. Used for both articles and comments so they look identical.
export default function ReportButton({ articleId, commentId, boxClassName = 'w-3.5 h-3.5', menuPosition = 'above' }: ReportButtonProps) {
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return;
    }
    if (reported) return;
    setOpen((v) => !v);
  };

  const submit = async (e: React.MouseEvent, reason: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, commentId, reason }),
      });
      if (!res.ok) throw new Error('report failed');
      setReported(true);
      setOpen(false);
    } catch (error) {
      console.error('Report submission failed:', error);
      alert('Failed to submit report. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        onClick={toggle}
        aria-label={reported ? 'Reported' : 'Report'}
        title={reported ? 'Reported' : 'Report'}
        className={`${boxClassName} inline-block border-none p-0 cursor-pointer transition-colors duration-200 ${
          reported ? 'bg-black dark:bg-white' : 'bg-red-700'
        }`}
      />
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-0 ${
            menuPosition === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
          } bg-white dark:bg-black border border-gray-300 dark:border-gray-700 shadow-lg z-20 min-w-[140px] animate-pop`}
        >
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={(e) => submit(e, r.value)}
              disabled={submitting}
              className="block w-full text-left text-xs px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 transition disabled:opacity-40 text-black dark:text-white"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
