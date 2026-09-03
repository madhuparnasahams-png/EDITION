'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Nav from '@/components/Nav';

interface Report {
  id: string;
  reason: string;
  message?: string;
  status: string;
  createdAt: string;
  reporter: { username: string };
  article: {
    id: string;
    title: string;
    slug: string;
    takenDown: boolean;
    takedownReason?: string;
    author: { username: string };
  };
}

export default function AdminReports() {
  const { isSignedIn, isLoaded } = useUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'new' | 'resolved' | 'all'>('new');

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/admin/reports')
      .then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return [];
        }
        return res.ok ? res.json() : [];
      })
      .then(setReports)
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  const dismiss = async (reportId: string) => {
    setActioningId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, { method: 'POST' });
      if (res.ok) {
        setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)));
      }
    } catch (error) {
      console.error('Failed to dismiss report:', error);
    } finally {
      setActioningId(null);
    }
  };

  const toggleTakedown = async (report: Report) => {
    const nextState = !report.article.takenDown;
    let reason = '';
    if (nextState) {
      reason = window.prompt('Reason for takedown (shown to the author):', 'Violates community guidelines') || '';
      if (!reason.trim()) return;
    }
    setActioningId(report.id);
    try {
      const res = await fetch(`/api/admin/articles/${report.article.id}/takedown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takenDown: nextState, reason }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReports((prev) =>
          prev.map((r) =>
            r.article.id === report.article.id
              ? {
                  ...r,
                  status: nextState ? 'resolved' : r.status,
                  article: { ...r.article, takenDown: updated.takenDown, takedownReason: updated.takedownReason },
                }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Failed to update takedown:', error);
    } finally {
      setActioningId(null);
    }
  };

  if (!isLoaded || loading) {
    return <div className="min-h-screen bg-white dark:bg-black" />;
  }

  if (!isSignedIn || forbidden) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <Nav />
        <p className="text-center py-12 text-black dark:text-white">Not authorized.</p>
      </div>
    );
  }

  const visibleReports = reports.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="px-4 py-5 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Reports</h1>
        <p className="text-sm text-black dark:text-white mb-6">
          {reports.filter((r) => r.status === 'new').length} awaiting review
        </p>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800">
          {(['new', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm pb-3 border-b-2 transition capitalize ${
                filter === f ? 'border-black dark:border-white' : 'border-transparent hover:opacity-60'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {visibleReports.length === 0 ? (
          <p className="text-center text-black dark:text-white py-12">Nothing here.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleReports.map((r) => (
              <div key={r.id} className="border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Link
                      href={`/c/${r.article.author.username}/p/${r.article.slug}`}
                      className="text-sm font-bold hover:opacity-60 transition"
                    >
                      {r.article.title}
                    </Link>
                    <div className="text-xs text-black dark:text-white mt-0.5">
                      by {r.article.author.username} · reported by {r.reporter.username}
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold text-red-700 border border-red-700 px-2 py-0.5 flex-shrink-0">
                    {r.reason}
                  </span>
                </div>

                {r.message && <p className="text-xs text-black dark:text-white mb-3">{r.message}</p>}

                {r.article.takenDown && (
                  <p className="text-xs text-red-700 mb-3">
                    Currently taken down: {r.article.takedownReason}
                  </p>
                )}

                <div className="flex gap-3">
                  {r.status === 'new' && (
                    <button
                      onClick={() => dismiss(r.id)}
                      disabled={actioningId === r.id}
                      className="text-xs font-semibold px-3 py-1.5 border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white transition disabled:opacity-40"
                    >
                      Dismiss
                    </button>
                  )}
                  <button
                    onClick={() => toggleTakedown(r)}
                    disabled={actioningId === r.id}
                    className={`text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 ${
                      r.article.takenDown
                        ? 'border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
                        : 'bg-red-700 text-white hover:opacity-80'
                    }`}
                  >
                    {r.article.takenDown ? 'Restore' : 'Take Down'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
