'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import Nav from '@/components/Nav';
import AdminGate from '@/components/AdminGate';

interface Item {
  id: string;
  type: 'ARTICLE' | 'IMAGE';
  imageUrl?: string | null;
  title?: string | null;
  linkUrl?: string | null;
  article?: { id: string; title: string; slug: string; featuredImage?: string | null; author: { username: string } } | null;
}

export default function AdminFeaturedPage() {
  return <AdminGate>{({ lock }) => <Inner lock={lock} />}</AdminGate>;
}

function Inner({ lock }: { lock: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [articleQuery, setArticleQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; author: { username: string } }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imgTitle, setImgTitle] = useState('');
  const [imgLink, setImgLink] = useState('');

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

  const load = async () => {
    const res = await fetch('/api/admin/featured');
    if (await guard(res)) return;
    setItems(res.ok ? await res.json() : []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleQuery.trim()) return;
    const res = await fetch(`/api/articles/search?q=${encodeURIComponent(articleQuery.trim())}`);
    setResults(res.ok ? await res.json() : []);
  };

  const post = async (body: any) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/featured', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (await guard(res)) return false;
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed');
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'featured');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (await guard(res)) return;
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Upload failed');
        return;
      }
      const { url } = await res.json();
      const ok = await post({ type: 'IMAGE', imageUrl: url, title: imgTitle || undefined, linkUrl: imgLink || undefined });
      if (ok) {
        setImgTitle('');
        setImgLink('');
      }
    } finally {
      setUploading(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    const res = await fetch('/api/admin/featured', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: next.map((i) => i.id) }) });
    if (await guard(res)) return;
    if (!res.ok) load();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/featured/${id}`, { method: 'DELETE' });
    if (await guard(res)) return;
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white animate-fade-in">
      <Nav />
      <main className="px-4 py-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Home hero</h1>
          <Link href="/admin" className="text-xs underline">Back to admin</Link>
        </div>
        <p className="text-sm mb-6 opacity-70">Articles or images shown in the carousel at the top of Home, in the order below.</p>

        {loading ? (
          <p className="py-8 text-center opacity-60">Loading...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center">The hero is empty.</p>
        ) : (
          <ul className="list-none flex flex-col gap-3 mb-10">
            {items.map((item, i) => {
              const thumb = item.type === 'ARTICLE' ? item.article?.featuredImage : item.imageUrl;
              return (
                <li key={item.id} className="flex items-center gap-3 border border-gray-200 dark:border-gray-800 p-3 animate-slide-up">
                  <div className="w-16 aspect-[4/5] bg-black bg-cover bg-center flex-shrink-0" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide">{item.type}</div>
                    <div className="text-sm truncate">{item.type === 'ARTICLE' ? item.article?.title : item.title || 'Untitled image'}</div>
                  </div>
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="p-1.5 border border-gray-300 dark:border-gray-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="p-1.5 border border-gray-300 dark:border-gray-700 disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button onClick={() => remove(item.id)} aria-label="Remove" className="p-1.5 border border-red-700 text-red-700"><Trash2 size={14} /></button>
                </li>
              );
            })}
          </ul>
        )}

        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Add an article</h2>
        <form onSubmit={search} className="flex gap-2 mb-3">
          <input value={articleQuery} onChange={(e) => setArticleQuery(e.target.value)} placeholder="Search by title, description or author" className="flex-1 border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white" />
          <button type="submit" className="border border-black dark:border-white px-4 text-sm">Search</button>
        </form>
        <ul className="list-none mb-10">
          {results.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800 text-sm">
              <span className="truncate">{a.title} <span className="opacity-60">by {a.author.username}</span></span>
              <button disabled={busy} onClick={() => post({ type: 'ARTICLE', articleId: a.id })} className="text-xs font-semibold border border-black dark:border-white px-3 py-1 disabled:opacity-40">Add</button>
            </li>
          ))}
        </ul>

        <h2 className="text-sm font-bold uppercase tracking-widest mb-3">Add an image</h2>
        <div className="flex flex-col gap-2">
          <input value={imgTitle} onChange={(e) => setImgTitle(e.target.value)} placeholder="Title (optional)" className="border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white" />
          <input value={imgLink} onChange={(e) => setImgLink(e.target.value)} placeholder="Link when clicked (optional: https://... or /path)" className="border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white" />
          <label className={`inline-block text-sm font-semibold border border-black dark:border-white px-4 py-2 cursor-pointer w-fit ${uploading ? 'animate-pulse' : ''}`}>
            {uploading ? 'Uploading...' : 'Upload image'}
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          </label>
        </div>
      </main>
    </div>
  );
}
