'use client';

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BlockEditor from "@/components/BlockEditor";
import Nav from "@/components/Nav";
import { ALL_TAGS } from "@/lib/tags";
import { compressImage } from "@/lib/imageCompression";

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-black" />}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [articleTitle, setArticleTitle] = useState("");
  const [articleDescription, setArticleDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contentFormat] = useState<'ARTICLE' | 'AV'>(() => {
    return searchParams.get('format')?.toUpperCase() === 'AV' ? 'AV' : 'ARTICLE';
  });
  const [blocks, setBlocks] = useState([
    { id: "1", type: "text", content: { text: "", fontFamily: "EB Garamond", fontSize: 16 }, order: 0 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Thumbnail (featuredImage) - optional manual override. If left unset,
  // the backend falls back to the first image found in the content; for
  // AV posts that's usually nothing, since AV is a video/audio embed
  // block, not an image block, so this matters most there.
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Issues (chapter grouping) - which of the author's own issues, if any,
  // this piece should be published into.
  const [myIssues, setMyIssues] = useState<{ id: string; title: string; coverImage?: string | null }[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueCover, setNewIssueCover] = useState<string | null>(null);
  const [uploadingIssueCover, setUploadingIssueCover] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);

  // Own card color - used as the placeholder background for the thumbnail
  // and issue-cover previews below, before an image is chosen.
  const [ownCardColor, setOwnCardColor] = useState('#3A3A3A');

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.cardColor && setOwnCardColor(data.cardColor))
      .catch((error) => console.error('Failed to fetch own card color:', error));
  }, []);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await fetch('/api/issues/mine');
        if (response.ok) setMyIssues(await response.json());
      } catch (error) {
        console.error('Failed to fetch issues:', error);
      } finally {
        setIssuesLoading(false);
      }
    };
    fetchIssues();
  }, []);

  const uploadImage = async (file: File, maxDimension: number): Promise<string | null> => {
    try {
      const compressed = await compressImage(file, maxDimension);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'articles');
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Upload failed');
      }
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
      return null;
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);
    const url = await uploadImage(file, 1200);
    if (url) setThumbnail(url);
    setUploadingThumbnail(false);
  };

  const handleIssueCoverUpload = async (file: File) => {
    setUploadingIssueCover(true);
    const url = await uploadImage(file, 1200);
    if (url) setNewIssueCover(url);
    setUploadingIssueCover(false);
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;
    setCreatingIssue(true);
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newIssueTitle.trim(), coverImage: newIssueCover || undefined }),
      });
      if (response.ok) {
        const issue = await response.json();
        setMyIssues((prev) => [{ id: issue.id, title: issue.title, coverImage: issue.coverImage }, ...prev]);
        setSelectedIssueId(issue.id);
        setNewIssueTitle('');
        setNewIssueCover(null);
        setShowNewIssueForm(false);
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || 'Failed to create issue');
      }
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert('Failed to create issue');
    } finally {
      setCreatingIssue(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-white dark:bg-black" />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center">
        <p>Please sign in to access the dashboard.</p>
      </div>
    );
  }

  const handleSaveArticle = async () => {
    if (!articleTitle.trim()) {
      alert('Give your article a title before publishing.');
      return;
    }

    const hasContent = blocks.some(
      (b: any) => (b.type === 'text' && b.content.text?.trim()) || (b.type !== 'text' && b.content.url)
    );
    if (!hasContent) {
      alert('Add some content before publishing.');
      return;
    }

    const confirmed = window.confirm(
      'Once published, this article cannot be edited. Publish now?'
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const articleData = {
        title: articleTitle,
        description: articleDescription,
        blocks: blocks,
        tags: selectedTags,
        format: contentFormat,
        isFree: true,
        issueId: selectedIssueId || null,
        // Optional manual override - if unset, the backend falls back to
        // the first image found in the content.
        featuredImage: thumbnail || undefined,
      };

      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/c/${data.author.username}/p/${data.slug}`);
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || "Failed to publish article");
      }
    } catch (error) {
      console.error("Error saving article:", error);
      alert("Error saving article");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      {/* Editor Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 sticky top-16 bg-white dark:bg-black z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            {/* Format was already chosen on /create - show it as a plain
                label, not a re-clickable toggle, so the same decision
                isn't presented twice. */}
            <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              {contentFormat === 'ARTICLE' ? 'Article' : 'AV'}
            </div>
            <input
              type="text"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              className="text-3xl font-bold bg-transparent border-none focus:outline-none w-full"
              placeholder="Article Title"
            />
            <input
              type="text"
              value={articleDescription}
              onChange={(e) => setArticleDescription(e.target.value)}
              className="text-sm text-gray-600 dark:text-gray-400 bg-transparent border-none focus:outline-none w-full mt-2"
              placeholder="Article Description (Optional)"
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSaveArticle}
              disabled={isSaving}
              className="border border-black dark:border-white px-6 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition disabled:opacity-50"
            >
              {isSaving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2">Thumbnail (optional)</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Shown on Feed, Discovery, and your Spread. If left unset, the first image in your
          content is used instead{contentFormat === 'AV' ? ' - upload one here if your AV piece has no image block' : ''}.
        </p>
        <div className="flex items-center gap-4">
          <div
            className="w-24 aspect-[4/5] flex-shrink-0 bg-cover bg-center"
            style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : { backgroundColor: ownCardColor }}
          />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold hover:opacity-60 transition cursor-pointer">
              {uploadingThumbnail ? 'Uploading...' : thumbnail ? 'Change thumbnail' : 'Upload thumbnail'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={uploadingThumbnail}
                onChange={(e) => e.target.files?.[0] && handleThumbnailUpload(e.target.files[0])}
              />
            </label>
            {thumbnail && (
              <button onClick={() => setThumbnail(null)} className="text-xs text-left hover:opacity-60 transition text-gray-500">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tag Picker */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2">Tags</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Helps readers find this on Discovery. Select all that apply.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-3 py-1.5 border transition ${
                selectedTags.includes(tag)
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Issue Picker */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2">Issue (optional)</label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Group this piece into an Issue to publish it as a chapter with prev/next navigation.
        </p>
        {issuesLoading ? (
          <p className="text-xs text-gray-400">Loading your issues...</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedIssueId}
              onChange={(e) => setSelectedIssueId(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 focus:outline-none focus:border-black dark:focus:border-white"
            >
              <option value="">No issue - standalone piece</option>
              {myIssues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issue.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewIssueForm((v) => !v)}
              className="text-xs font-semibold border border-gray-300 dark:border-gray-700 px-3 py-2 hover:border-black dark:hover:border-white transition"
            >
              + New Issue
            </button>
          </div>
        )}

        {showNewIssueForm && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div
              className="w-14 h-14 flex-shrink-0 bg-cover bg-center"
              style={newIssueCover ? { backgroundImage: `url(${newIssueCover})` } : { backgroundColor: ownCardColor }}
            />
            <label className="text-xs font-semibold hover:opacity-60 transition cursor-pointer">
              {uploadingIssueCover ? 'Uploading...' : newIssueCover ? 'Change cover' : 'Upload cover'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={uploadingIssueCover}
                onChange={(e) => e.target.files?.[0] && handleIssueCoverUpload(e.target.files[0])}
              />
            </label>
            <input
              type="text"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="New issue title"
              className="text-sm border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 focus:outline-none focus:border-black dark:focus:border-white"
            />
            <button
              onClick={handleCreateIssue}
              disabled={creatingIssue || !newIssueTitle.trim()}
              className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-3 py-2 hover:opacity-80 transition disabled:opacity-40"
            >
              {creatingIssue ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}
      </div>

      {/* Block Editor */}
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <BlockEditor blocks={blocks} setBlocks={setBlocks} />
      </main>
    </div>
  );
}
