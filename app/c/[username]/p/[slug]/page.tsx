'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useUser } from '@clerk/nextjs';
import { useTheme } from '@/components/ThemeProvider';
import { ALL_TAGS } from '@/lib/tags';
import { plainTextToSafeHtml } from '@/lib/textBlock';
import { isAllowedEmbedUrl } from '@/lib/embed';
import ContentActions from '@/components/ContentActions';
import VideoEmbed from '@/components/VideoEmbed';

interface Block {
  id: string;
  type: string;
  content: any;
  order: number;
}

interface Article {
  id: string;
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  blocks: Block[];
  publishedAt: string;
  isFree: boolean;
  issueId?: string | null;
  prevArticle?: { slug: string; title: string } | null;
  nextArticle?: { slug: string; title: string } | null;
  isLiked?: boolean;
  isCached?: boolean;
  isAuthor?: boolean;
  isAdmin?: boolean;
  featured?: boolean;
  takenDown?: boolean;
  takedownReason?: string;
  repostedByFollowed?: string[];
  repostedByFollowedCount?: number;
  author: {
    username: string;
    avatar?: string;
  };
}

export default function DigitalPaperReader({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = use(params);
  const { theme } = useTheme();
  const { isSignedIn } = useUser();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [darkMode, setDarkMode] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostText, setRepostText] = useState('');
  const [reposting, setReposting] = useState(false);
  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${username}/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setArticle(data);
          setEditTitle(data.title);
          setEditDescription(data.description || '');
          setEditTags(data.tags || []);
        }
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [username, slug]);

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    // Short articles (docHeight <= 0, nothing to scroll) count as fully read
    // rather than dividing by zero into NaN.
    const scrolled = docHeight > 0 ? scrollTop / docHeight : 1;
    setProgress(scrolled * 100);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Persist reading progress. Debounced while scrolling, and flushed
  // immediately when the reader leaves/closes the tab so we don't lose
  // the last bit of progress.
  useEffect(() => {
    if (!isSignedIn || !article) return;

    const save = (value: number) => {
      const payload = JSON.stringify({ articleId: article.id, progress: value / 100 });
      if (document.visibilityState === 'hidden' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/reading-progress', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/reading-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch((err) => console.error('Failed to save reading progress:', err));
      }
    };

    const debounce = setTimeout(() => save(progress), 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save(progress);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(debounce);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [progress, isSignedIn, article]);

  useEffect(() => {
    setDarkMode(theme === 'dark');
  }, [theme]);

  const toggleEditTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleFeatured = async () => {
    if (!article) return;
    const nextValue = !article.featured;
    setTogglingFeatured(true);
    setArticle((prev) => (prev ? { ...prev, featured: nextValue } : prev)); // optimistic
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: nextValue }),
      });
      if (!res.ok) throw new Error('failed to update featured status');
    } catch (error) {
      console.error('Failed to toggle featured:', error);
      setArticle((prev) => (prev ? { ...prev, featured: !nextValue } : prev)); // revert
    } finally {
      setTogglingFeatured(false);
    }
  };

  const saveEdit = async () => {
    if (!article) return;
    if (!editTitle.trim()) {
      alert('Title cannot be empty.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          tags: editTags,
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setArticle(updated);
        setIsEditing(false);
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const submitRepost = async () => {
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return;
    }
    if (!article || !repostText.trim()) return;
    setReposting(true);
    try {
      const response = await fetch('/api/comm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: repostText.trim(), quotedArticleId: article.id }),
      });
      if (response.ok) {
        setReposted(true);
        setRepostOpen(false);
        setRepostText('');
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || 'Failed to repost');
      }
    } catch (error) {
      console.error('Failed to repost:', error);
      alert('Failed to repost');
    } finally {
      setReposting(false);
    }
  };

  // Content protection: blocks casual copy/right-click/print/save/devtools shortcuts.
  // Note: this deters casual copying only - it cannot stop screenshots, screen
  // recording, or anyone using browser dev tools directly.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };

    const blockContextMenu = (e: MouseEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };
    const blockCopy = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const editable = isEditableTarget(e.target);

      // Copy/cut are fine inside real form fields (edit title, repost note,
      // etc.) - only block them against the article's own read-only content.
      if (mod && ['c', 'x'].includes(key) && !editable) {
        e.preventDefault();
      }
      // Save/print/view-source have no legitimate use anywhere on this page.
      if (mod && ['s', 'p', 'u'].includes(key)) {
        e.preventDefault();
      }
      if ((mod && e.shiftKey && ['i', 'j', 'c'].includes(key)) || key === 'f12') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('copy', blockCopy);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!article) {
    return <div className="min-h-screen flex items-center justify-center">Article not found</div>;
  }

  return (
    <div className={darkMode ? 'bg-black text-white min-h-screen' : 'bg-white text-black min-h-screen'}>
      {/* Progress bar */}
      <div className={`fixed top-0 left-0 h-1 transition-all ${darkMode ? 'bg-white' : 'bg-black'}`} style={{ width: `${progress}%` }} />

      {/* Reading controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 px-2 py-1">
        <button onClick={() => setFontSize((f) => Math.max(12, f - 2))} className="px-2 py-1 text-sm hover:opacity-70">A-</button>
        <button onClick={() => setFontSize((f) => Math.min(28, f + 2))} className="px-2 py-1 text-sm hover:opacity-70">A+</button>
        <div className={`w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-1 text-sm hover:opacity-70"
          title="Toggle reading background"
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {article.takenDown && article.isAuthor && (
          <div className="border border-red-700 text-red-700 text-sm p-4 mb-8">
            <strong>This article was taken down.</strong> Only visible to you.
            {article.takedownReason && <p className="mt-1">Reason: {article.takedownReason}</p>}
          </div>
        )}
        {article.isAdmin && (
          <button
            onClick={toggleFeatured}
            disabled={togglingFeatured}
            className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 mb-4 mr-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition disabled:opacity-50"
          >
            {article.featured ? '★ Featured on Home - Remove' : '☆ Feature on Home'}
          </button>
        )}
        {/* Title */}
        <header className="mb-12">
          {/* Server-computed from the Prisma record, not Clerk's client-side
              username - the two can diverge (see /api/me), and comparing
              Clerk's copy here could hide the Edit button from the real author. */}
          {article.isAuthor && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 mb-4 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
            >
              Edit title, description & tags
            </button>
          )}

          {isEditing ? (
            <div className="border border-gray-300 dark:border-gray-700 p-4 mb-6">
              <label className="block text-xs font-bold mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-lg font-bold mb-3 focus:outline-none focus:border-black dark:focus:border-white"
              />

              <label className="block text-xs font-bold mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm mb-3 focus:outline-none focus:border-black dark:focus:border-white resize-none"
              />

              <label className="block text-xs font-bold mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleEditTag(tag)}
                    className={`text-xs px-3 py-1.5 border transition ${
                      editTags.includes(tag)
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-transparent border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveEdit}
                  disabled={isSavingEdit}
                  className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-4 py-2 hover:opacity-80 transition disabled:opacity-40"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(article.title);
                    setEditDescription(article.description || '');
                    setEditTags(article.tags || []);
                  }}
                  className="text-xs font-semibold px-4 py-2 hover:opacity-60 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-5xl font-bold mb-4" style={{ fontSize: `${fontSize * 2}px` }}>
                {article.title}
              </h1>
              {article.description && (
                <p className="text-xl mb-6 text-black dark:text-white">{article.description}</p>
              )}
            </>
          )}

          {/* Article Metadata */}
          <div className={`flex items-center gap-4 border-t border-b py-4 ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
            {article.author.avatar && (
              <img
                src={article.author.avatar}
                alt={article.author.username}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="font-bold">
                <Link href={`/c/${article.author.username}`} className="hover:underline">
                  {article.author.username}
                </Link>
              </p>
              <p className="text-sm text-black dark:text-white">
                {new Date(article.publishedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {article.repostedByFollowedCount ? (
            <p className="text-xs mt-3 text-black dark:text-white">
              Reposted by {article.repostedByFollowed?.join(', ')}
              {article.repostedByFollowedCount! > (article.repostedByFollowed?.length || 0)
                ? ` and ${article.repostedByFollowedCount! - (article.repostedByFollowed?.length || 0)} more`
                : ''}{' '}
              you follow
            </p>
          ) : null}
        </header>

        {/* Blocks */}
        <div style={{ lineHeight }} className="text-base select-none">
          {article.blocks && article.blocks.length > 0 ? (
            article.blocks.map((block, i) => {
              const prevBlock = article.blocks[i - 1];
              const isFullBleed = block.type === 'image' && block.content.fullBleed;
              const prevIsFullBleed = prevBlock?.type === 'image' && prevBlock.content.fullBleed;
              const marginTop = i === 0 ? '' : prevIsFullBleed && isFullBleed ? 'mt-0' : 'mt-8';
              return (
                <div key={block.id} className={marginTop}>
                  <Block block={block} fontSize={fontSize} darkMode={darkMode} />
                </div>
              );
            })
          ) : (
            <p className="text-center text-black dark:text-white">No content</p>
          )}
        </div>

        {/* Footer - actions + chapter navigation together */}
        <footer className={`mt-16 border-t pt-8 text-center ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
          <p className="text-sm mb-4 text-black dark:text-white">End of article</p>

          <div className="flex justify-center mb-6">
            <ContentActions
              articleId={article.id}
              initialLiked={article.isLiked}
              initialCached={article.isCached}
              forceDark={darkMode}
              size="md"
            />
          </div>

          <div className="mb-6">
            {!reposted ? (
              <button
                onClick={() => setRepostOpen((v) => !v)}
                className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
              >
                Repost as Note
              </button>
            ) : (
              <span className="text-xs text-black dark:text-white">Reposted to your Comm</span>
            )}

            {repostOpen && (
              <div className="max-w-sm mx-auto mt-3 text-left">
                <textarea
                  value={repostText}
                  onChange={(e) => setRepostText(e.target.value)}
                  placeholder="Add a thought before reposting..."
                  maxLength={500}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none mb-2"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRepostOpen(false)}
                    className="text-xs px-3 py-1.5 hover:opacity-60 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRepost}
                    disabled={reposting || !repostText.trim()}
                    className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 hover:opacity-80 transition disabled:opacity-40"
                  >
                    {reposting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {(article.prevArticle || article.nextArticle) && (
            <nav className={`border-t pt-6 flex justify-between text-sm ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
              {article.prevArticle ? (
                <Link
                  href={`/c/${username}/p/${article.prevArticle.slug}`}
                  className="hover:opacity-60 transition"
                >
                  &larr; {article.prevArticle.title}
                </Link>
              ) : (
                <span />
              )}
              {article.nextArticle ? (
                <Link
                  href={`/c/${username}/p/${article.nextArticle.slug}`}
                  className="hover:opacity-60 transition text-right"
                >
                  {article.nextArticle.title} &rarr;
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </footer>
      </article>
    </div>
  );
}

function Block({ block, fontSize, darkMode }: { block: Block; fontSize: number; darkMode: boolean }) {
  if (block.type === 'text') {
    return (
      <div
        style={{
          fontFamily: block.content.fontFamily || 'EB Garamond',
          fontSize: (block.content.fontSize || 16) + 'px',
          fontWeight: block.content.bold ? 'bold' : 'normal',
          fontStyle: block.content.italic ? 'italic' : 'normal',
          color: darkMode ? '#ffffff' : block.content.color || '#000000',
        }}
        dangerouslySetInnerHTML={{
          __html: typeof window !== 'undefined' ? DOMPurify.sanitize(plainTextToSafeHtml(block.content.text || '')) : '',
        }}
      />
    );
  }

  if (block.type === 'image') {
    const fullBleed = block.content.fullBleed;
    return (
      <figure className={fullBleed ? 'relative left-1/2 -translate-x-1/2 w-screen' : 'relative'}>
        <img
          src={block.content.url}
          alt={block.content.alt || ''}
          className={fullBleed ? 'w-full h-auto block' : 'w-full h-auto'}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        {block.content.alt && (
          <figcaption className={`text-sm text-black dark:text-white mt-2 ${fullBleed ? 'px-4' : ''}`}>
            {block.content.alt}
          </figcaption>
        )}
      </figure>
    );
  }

  if (block.type === 'video') {
    if (!isAllowedEmbedUrl(block.content.url || '')) {
      return null;
    }
    return (
      <div>
        <VideoEmbed url={block.content.url} fullBleed={block.content.fullBleed} darkMode={darkMode} />
        {block.content.caption && (
          <p className="text-sm text-black dark:text-white mt-2">{block.content.caption}</p>
        )}
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="border-l-4 pl-4 italic border-black dark:border-white text-black dark:text-white">
        "{block.content.text}"
        {block.content.author && <footer className="text-sm mt-2">— {block.content.author}</footer>}
      </blockquote>
    );
  }

  if (block.type === 'divider') {
    return <hr className={darkMode ? 'border-gray-700' : 'border-gray-300'} />;
  }

  return null;
}
