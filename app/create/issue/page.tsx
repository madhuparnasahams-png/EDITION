'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Nav from '@/components/Nav';
import { compressImage } from '@/lib/imageCompression';
import ImageCropper from '@/components/ImageCropper';

export default function CreateIssue() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [ownUsername, setOwnUsername] = useState<string | null>(null);
  const [cardColor, setCardColor] = useState('#3A3A3A');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((d) => d?.username && setOwnUsername(d.username)).catch(() => {});
    fetch('/api/profile').then((r) => (r.ok ? r.json() : null)).then((d) => d?.cardColor && setCardColor(d.cardColor)).catch(() => {});
  }, [isSignedIn]);

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'articles');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Upload failed');
      }
      setCover((await res.json()).url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const create = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, coverImage: cover || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to create issue');
      }
      const issue = await res.json();
      router.push(ownUsername ? `/c/${ownUsername}/issue/${issue.id}` : '/create');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create issue');
      setCreating(false);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-white dark:bg-black" />;

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />
      {cropping && (
        <ImageCropper
          file={cropping}
          aspect={4 / 5}
          outputWidth={960}
          title="Crop issue cover"
          onCancel={() => setCropping(null)}
          onDone={(f) => {
            setCropping(null);
            uploadCover(f);
          }}
        />
      )}
      <main className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-2xl mb-2">New issue</h1>
        <p className="text-sm mb-6">A collection of articles and AV.</p>

        {!isSignedIn ? (
          <p>Sign in to create.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-sm mb-2" htmlFor="issue-title">Title</label>
              <input
                id="issue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                className="w-full border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
            <div>
              <label className="block text-sm mb-2" htmlFor="issue-desc">Description (optional)</label>
              <textarea
                id="issue-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none"
              />
            </div>
            <div>
              <div className="text-sm mb-2">Cover (optional)</div>
              <div className="flex items-center gap-4">
                <div
                  className="w-20 aspect-[4/5] bg-cover bg-center flex-shrink-0"
                  style={cover ? { backgroundImage: `url(${cover})` } : { backgroundColor: cardColor }}
                />
                <div className="flex flex-col gap-2 items-start">
                  <label className="ed-btn cursor-pointer">
                    {uploading ? 'Uploading...' : cover ? 'Change cover' : 'Upload cover'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropping(f); e.target.value = ''; }}
                    />
                  </label>
                  {cover && (
                    <button onClick={() => setCover(null)} className="ed-btn">Remove</button>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={create}
              disabled={creating || uploading || !title.trim()}
              className="ed-btn ed-btn-solid w-full py-3"
            >
              {creating ? 'Creating...' : 'Create issue'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
