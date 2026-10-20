'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import AdminGate from '@/components/AdminGate';

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
  } | null;
  comment: {
    id: string;
    text: string;
    author: { username: string };
    article: { slug: string; title: string; author: { username: string } };
  } | null;
}

interface AccountRow {
  id: string;
  username: string;
  hiddenByAdmin: boolean;
  isAdmin: boolean;
}

export default function AdminPage() {
  return <AdminGate>{({ lock }) => <AdminInner lock={lock} />}</AdminGate>;
}

function AdminInner({ lock }: { lock: () => void }) {
  const [tab, setTab] = useState<'reports' | 'accounts'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'new' | 'resolved' | 'all'>('new');

  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  // Any admin API reply of ADMIN_PASSWORD_REQUIRED means the server-side
  // session ended (idle or 8h cap): go back to the password prompt.
  const guard = async (res: Response) => {
    if (res.status === 403) {
      const body = await res.clone().json().catch(() => null);
      if (body?.code === 'ADMIN_PASSWORD_REQUIRED') {
        lock();
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(async (res) => {
        if (await guard(res)) return [];
        return res.ok ? res.json() : [];
      })
      .then(setReports)
      .finally(() => setReportsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAccounts = async (q: string) => {
    setAccountsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (await guard(res)) return;
      setAccounts(res.ok ? await res.json() : []);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'accounts') loadAccounts(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const dismiss = async (reportId: string) => {
    setActioningId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, { method: 'POST' });
      if (await guard(res)) return;
      if (res.ok) setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)));
    } finally {
      setActioningId(null);
    }
  };

  const toggleTakedown = async (report: Report) => {
    if (!report.article) return;
    const nextState = !report.article.takenDown;
    let reason = '';
    if (nextState) {
      reason = window.prompt('Reason for takedown (shown to the author):', 'Taken down by Edition') || '';
      if (!reason.trim()) return;
    }
    setActioningId(report.id);
    try {
      const res = await fetch(`/api/admin/articles/${report.article.id}/takedown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takenDown: nextState, reason }),
      });
      if (await guard(res)) return;
      if (res.ok) {
        const updated = await res.json();
        setReports((prev) =>
          prev.map((r) =>
            r.article && r.article.id === report.article!.id
              ? {
                  ...r,
                  status: nextState ? 'resolved' : r.status,
                  article: { ...r.article, takenDown: updated.takenDown, takedownReason: updated.takedownReason },
                }
              : r
          )
        );
      }
    } finally {
      setActioningId(null);
    }
  };

  const deleteReportedComment = async (report: Report) => {
    if (!report.comment) return;
    if (!window.confirm('Delete this comment permanently?')) return;
    setActioningId(report.id);
    try {
      const res = await fetch(`/api/comments/${report.comment.id}`, { method: 'DELETE' });
      if (await guard(res)) return;
      if (res.ok) {
        // Cascade removes the reports with the comment
        setReports((prev) => prev.filter((r) => r.comment?.id !== report.comment!.id));
      }
    } finally {
      setActioningId(null);
    }
  };

  const toggleAccountHidden = async (acc: AccountRow) => {
    const next = !acc.hiddenByAdmin;
    if (next && !window.confirm(`Hide @${acc.username} and all their content from public view? They will be told in their Inbox.`)) return;
    setActioningId(acc.id);
    try {
      const res = await fetch(`/api/admin/users/${acc.id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: next }),
      });
      if (await guard(res)) return;
      if (res.ok) setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, hiddenByAdmin: next } : a)));
      else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed');
      }
    } finally {
      setActioningId(null);
    }
  };

  const visibleReports = reports.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white animate-fade-in">
      <Nav />

      <main className="px-4 py-5 max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold">Admin</h1>
          <div className="flex gap-3 items-center">
            <Link href="/admin/featured" className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black">
              Home hero
            </Link>
            <button onClick={lock} className="text-xs font-semibold px-3 py-1.5 border border-red-700 text-red-700 hover:bg-red-700 hover:text-white">
              Lock
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-800">
          {(['reports', 'accounts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm pb-3 border-b-2 transition-colors capitalize ${
                tab === t ? 'border-black dark:border-white' : 'border-transparent hover:opacity-60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'reports' && (
          <div className="animate-fade-in">
            <p className="text-sm mb-4">{reports.filter((r) => r.status === 'new').length} awaiting review</p>
            <div className="flex gap-4 mb-6">
              {(['new', 'resolved', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 border transition-colors capitalize ${
                    filter === f ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {reportsLoading ? (
              <p className="text-center py-12 opacity-60">Loading...</p>
            ) : visibleReports.length === 0 ? (
              <p className="text-center py-12">Nothing here.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {visibleReports.map((r) => (
                  <div key={r.id} className="border border-gray-200 dark:border-gray-800 p-4 animate-slide-up">
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div className="min-w-0">
                        {r.article ? (
                          <>
                            <Link href={`/c/${r.article.author.username}/p/${r.article.slug}`} className="text-sm font-bold hover:opacity-60">
                              {r.article.title}
                            </Link>
                            <div className="text-xs mt-0.5">by {r.article.author.username} · reported by {r.reporter.username}</div>
                          </>
                        ) : r.comment ? (
                          <>
                            <div className="text-[10px] font-bold uppercase tracking-wide mb-1">Comment</div>
                            <p className="text-sm break-words whitespace-pre-wrap">{r.comment.text}</p>
                            <div className="text-xs mt-1">
                              by {r.comment.author.username} on{' '}
                              <Link href={`/c/${r.comment.article.author.username}/p/${r.comment.article.slug}`} className="underline">
                                {r.comment.article.title}
                              </Link>{' '}
                              · reported by {r.reporter.username}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs">Content no longer exists</div>
                        )}
                      </div>
                      <span className="text-xs uppercase font-semibold text-red-700 border border-red-700 px-2 py-0.5 flex-shrink-0">{r.reason}</span>
                    </div>

                    {r.message && <p className="text-xs mb-3">{r.message}</p>}
                    {r.article?.takenDown && <p className="text-xs text-red-700 mb-3">Currently taken down: {r.article.takedownReason}</p>}

                    <div className="flex gap-3">
                      {r.status === 'new' && (
                        <button
                          onClick={() => dismiss(r.id)}
                          disabled={actioningId === r.id}
                          className="text-xs font-semibold px-3 py-1.5 border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white disabled:opacity-40"
                        >
                          Dismiss
                        </button>
                      )}
                      {r.article && (
                        <button
                          onClick={() => toggleTakedown(r)}
                          disabled={actioningId === r.id}
                          className={`text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 ${
                            r.article.takenDown ? 'border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white' : 'bg-red-700 text-white hover:opacity-80'
                          }`}
                        >
                          {r.article.takenDown ? 'Restore' : 'Take Down'}
                        </button>
                      )}
                      {r.comment && (
                        <button
                          onClick={() => deleteReportedComment(r)}
                          disabled={actioningId === r.id}
                          className="text-xs font-semibold px-3 py-1.5 bg-red-700 text-white hover:opacity-80 disabled:opacity-40"
                        >
                          Delete comment
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'accounts' && (
          <div className="animate-fade-in">
            <p className="text-xs mb-3 opacity-70">
              Hiding an account is an investigative hold: the profile and everything it published disappear from public view. Nothing is deleted, and the owner is told in their Inbox.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadAccounts(query);
              }}
              className="flex gap-2 mb-5"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search username (empty = currently hidden)"
                className="flex-1 border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white"
              />
              <button type="submit" className="border border-black dark:border-white px-4 text-sm">Search</button>
            </form>
            {accountsLoading ? (
              <p className="text-center py-8 opacity-60">Loading...</p>
            ) : accounts.length === 0 ? (
              <p className="text-center py-8">No accounts.</p>
            ) : (
              <ul className="list-none divide-y divide-gray-200 dark:divide-gray-800">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-3 animate-slide-up">
                    <div className="text-sm">
                      <Link href={`/c/${a.username}`} className="font-bold hover:underline">@{a.username}</Link>
                      {a.hiddenByAdmin && <span className="ml-2 text-xs text-red-700 border border-red-700 px-1.5">HIDDEN</span>}
                      {a.isAdmin && <span className="ml-2 text-xs border border-black dark:border-white px-1.5">ADMIN</span>}
                    </div>
                    {!a.isAdmin && (
                      <button
                        onClick={() => toggleAccountHidden(a)}
                        disabled={actioningId === a.id}
                        className={`text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 ${
                          a.hiddenByAdmin ? 'border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white' : 'bg-red-700 text-white hover:opacity-80'
                        }`}
                      >
                        {a.hiddenByAdmin ? 'Unhide' : 'Hide account'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
