'use client';

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BlockEditor from "@/components/BlockEditor";
import ImageCropper from "@/components/ImageCropper";
import Nav from "@/components/Nav";
import TagInput from "@/components/TagInput";
import { compressImage } from "@/lib/imageCompression";
import { isAllowedEmbedUrl, isVideoEmbed, toEmbedUrl, EMBED_IFRAME_SANDBOX } from "@/lib/embed";
import { SUGGESTED_RED_TAGS } from "@/lib/redTags";
import { MAX_TAGS, MAX_TAG_LENGTH, MAX_RED_TAGS, MAX_RED_TAG_LENGTH } from "@/lib/validation";

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
  const [redTags, setRedTags] = useState<string[]>([]);
  const [contentFormat] = useState<'ARTICLE' | 'AV'>(() => {
    return searchParams.get('format')?.toUpperCase() === 'AV' ? 'AV' : 'ARTICLE';
  });
  const [blocks, setBlocks] = useState([
    { id: "1", type: "text", content: { text: "", fontFamily: "EB Garamond", fontSize: 16 }, order: 0 },
  ]);
  // AV is a single embed (YouTube, Vimeo, SoundCloud, Spotify, Apple Music), not a block editor.
  const [avUrl, setAvUrl] = useState('');
  const isAV = contentFormat === 'AV';
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
  // Picked file waiting to be cropped, and which cover it is for.
  const [cropping, setCropping] = useState<{ file: File; target: 'thumbnail' | 'issue' } | null>(null);
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

    const embedUrl = isAV ? toEmbedUrl(avUrl) : '';
    if (isAV) {
      if (!isAllowedEmbedUrl(embedUrl)) {
        alert('Paste a link from YouTube, Vimeo, SoundCloud, Spotify or Apple Music.');
        return;
      }
    } else {
      const hasContent = blocks.some(
        (b: any) => (b.type === 'text' && b.content.text?.trim()) || (b.type !== 'text' && b.content.url)
      );
      if (!hasContent) {
        alert('Add some content before publishing.');
        return;
      }
    }

    const confirmed = window.confirm(
      `Once published, this ${isAV ? 'post' : 'article'} cannot be edited. Publish now?`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const articleData = {
        title: articleTitle,
        description: articleDescription,
        blocks: isAV ? [{ id: '1', type: 'video', content: { url: embedUrl, caption: '', fullBleed: false }, order: 0 }] : blocks,
        tags: selectedTags,
        redTags,
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
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white animate-fade-in">
      <Nav />

      {cropping && (
        <ImageCropper
          file={cropping.file}
          aspect={cropping.target === 'thumbnail' && isAV ? 16 / 9 : 4 / 5}
          outputWidth={cropping.target === 'thumbnail' && isAV ? 1280 : 960}
          title={cropping.target === 'issue' ? 'Crop issue cover' : isAV ? 'Crop cover (16:9)' : 'Crop thumbnail'}
          onCancel={() => setCropping(null)}
          onDone={(f) => {
            const target = cropping.target;
            setCropping(null);
            if (target === 'thumbnail') handleThumbnailUpload(f);
            else handleIssueCoverUpload(f);
          }}
        />
      )}

      {/* Editor Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 sticky top-16 bg-white dark:bg-black z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            {/* Format was already chosen on /create - show it as a plain
                label, not a re-clickable toggle, so the same decision
                isn't presented twice. */}
            <div className="text-xs font-semibold text-black dark:text-white mb-3 uppercase tracking-wide">
              {contentFormat === 'ARTICLE' ? 'Article' : 'AV'}
            </div>
            <input
              type="text"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              className="text-3xl font-bold bg-transparent border-none focus:outline-none w-full"
              placeholder={isAV ? "Title" : "Article Title"}
            />
            <input
              type="text"
              value={articleDescription}
              onChange={(e) => setArticleDescription(e.target.value)}
              className="text-sm text-black dark:text-white bg-transparent border-none focus:outline-none w-full mt-2"
              placeholder={isAV ? "Description (optional)" : "Article Description (Optional)"}
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSaveArticle}
              disabled={isSaving}
              className="border border-black dark:border-white px-6 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-50"
            >
              {isSaving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* AV: the embed itself. No block editor. */}
      {isAV && (
        <div className="container mx-auto max-w-3xl px-4 pt-8">
          <label className="block text-sm font-bold mb-2" htmlFor="av-url">Embed link</label>
          <p className="text-xs mb-3">
            Paste a link from YouTube, Vimeo, SoundCloud, Spotify or Apple Music.
          </p>
          <input
            id="av-url"
            type="text"
            value={avUrl}
            onChange={(e) => setAvUrl(e.target.value)}
            onBlur={() => setAvUrl((v) => toEmbedUrl(v))}
            placeholder="https://"
            className={`w-full border bg-transparent px-3 py-2 text-sm focus:outline-none ${
              !avUrl.trim() || isAllowedEmbedUrl(toEmbedUrl(avUrl))
                ? 'border-gray-300 dark:border-gray-700 focus:border-black dark:focus:border-white'
                : 'border-red-700'
            }`}
          />
          {avUrl.trim() && !isAllowedEmbedUrl(toEmbedUrl(avUrl)) && (
            <p className="text-xs text-red-700 mt-2">That link is not supported.</p>
          )}
          {avUrl.trim() && isAllowedEmbedUrl(toEmbedUrl(avUrl)) && (
            <div className={`mt-4 w-full ${isVideoEmbed(toEmbedUrl(avUrl)) ? 'aspect-video' : ''}`}>
              <iframe
                src={toEmbedUrl(avUrl)}
                className={`w-full border border-gray-300 dark:border-gray-700 ${isVideoEmbed(toEmbedUrl(avUrl)) ? 'h-full' : 'h-40'}`}
                allow="fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                sandbox={EMBED_IFRAME_SANDBOX}
              />
            </div>
          )}
        </div>
      )}

      {/* Thumbnail (Article) / Cover (AV, 16:9 like a YouTube thumbnail) */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2">{isAV ? 'Cover (optional)' : 'Thumbnail (optional)'}</label>
        <p className="text-xs text-black dark:text-white mb-3">
          {isAV
            ? 'Shown on Feed, Discovery and your Spread in the same 16:9 shape as a YouTube thumbnail. Other shapes are cropped to fit.'
            : 'Shown on Feed, Discovery, and your Spread. If left unset, the first image in your content is used instead.'}
        </p>
        <div className="flex items-center gap-4">
          <div
            className={`${isAV ? 'w-40 aspect-video' : 'w-24 aspect-[4/5]'} flex-shrink-0 bg-cover bg-center transition-all duration-300 ${uploadingThumbnail ? 'animate-pulse' : ''}`}
            style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : { backgroundColor: ownCardColor }}
          />
          <div className="flex flex-col gap-2 items-start">
            <label className={`ed-btn cursor-pointer ${uploadingThumbnail ? 'animate-pulse' : ''}`}>
              {uploadingThumbnail ? 'Uploading...' : thumbnail ? (isAV ? 'Change cover' : 'Change thumbnail') : (isAV ? 'Upload cover' : 'Upload thumbnail')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={uploadingThumbnail}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropping({ file: f, target: 'thumbnail' }); e.target.value = ''; }}
              />
            </label>
            {thumbnail && (
              <button onClick={() => setThumbnail(null)} className="ed-btn">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tags (free-form) */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2">Tags</label>
        <p className="text-xs text-black dark:text-white mb-3">
          Helps readers find this on Discovery. Type anything and press Enter. Tags are not shown on the piece itself.
        </p>
        <TagInput value={selectedTags} onChange={setSelectedTags} max={MAX_TAGS} maxLength={MAX_TAG_LENGTH} />
      </div>

      {/* Red Tags (content warnings) */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2 text-red-700">Red Tags</label>
        <p className="text-xs text-black dark:text-white mb-3">
          Content warnings, shown in red under the piece. Pick all that apply or add your own. Everything on Edition must be
          appropriate for readers 16 and over; a Red Tag is a heads-up, not a gate.
        </p>
        <TagInput
          value={redTags}
          onChange={setRedTags}
          suggestions={SUGGESTED_RED_TAGS}
          max={MAX_RED_TAGS}
          maxLength={MAX_RED_TAG_LENGTH}
          red
          placeholder="Add your own warning"
        />
      </div>

      {/* Issue Picker */}
      <div className="container mx-auto max-w-3xl px-4 pt-8">
        <label className="block text-sm font-bold mb-2">Issue (optional)</label>
        <p className="text-xs text-black dark:text-white mb-3">
          Group this piece into an Issue to publish it as a chapter with prev/next navigation.
        </p>
        {issuesLoading ? (
          <p className="text-xs text-black dark:text-white">Loading your issues...</p>
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
              className="ed-btn"
            >
              + New Issue
            </button>
          </div>
        )}

        {showNewIssueForm && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div
              className={`w-14 h-14 flex-shrink-0 bg-cover bg-center transition-all duration-300 ${uploadingIssueCover ? 'animate-pulse' : ''}`}
              style={newIssueCover ? { backgroundImage: `url(${newIssueCover})` } : { backgroundColor: ownCardColor }}
            />
            <label className={`ed-btn cursor-pointer ${uploadingIssueCover ? 'animate-pulse' : ''}`}>
              {uploadingIssueCover ? 'Uploading...' : newIssueCover ? 'Change cover' : 'Upload cover'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={uploadingIssueCover}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropping({ file: f, target: 'issue' }); e.target.value = ''; }}
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
              className="ed-btn ed-btn-solid"
            >
              {creatingIssue ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}
      </div>

      {/* Block Editor (articles only) */}
      <main className="container mx-auto max-w-3xl px-4 py-12">
        {isAV ? null : <BlockEditor blocks={blocks} setBlocks={setBlocks} />}
      </main>
    </div>
  );
}
