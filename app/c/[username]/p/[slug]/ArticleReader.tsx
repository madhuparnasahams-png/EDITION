'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, ArrowRight } from '@/components/Icons';
import { useTheme } from '@/components/ThemeProvider';
import TagInput from '@/components/TagInput';
import ReportButton from '@/components/ReportButton';
import Breadcrumbs from '@/components/Breadcrumbs';
import MentionTextarea from '@/components/MentionTextarea';
import { SUGGESTED_RED_TAGS } from '@/lib/redTags';
import { renderTextWithMentions } from '@/lib/mentions';
import { MAX_TAGS, MAX_TAG_LENGTH, MAX_RED_TAGS, MAX_RED_TAG_LENGTH, MAX_COMMENT_LENGTH } from '@/lib/validation';
import { textBlockHtml } from '@/lib/textBlock';
import { isAllowedEmbedUrl } from '@/lib/embed';
import ContentActions from '@/components/ContentActions';
import VideoEmbed from '@/components/VideoEmbed';

interface Block {
  id: string;
  type: string;
  content: any;
  order: number;
}

interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; username: string; avatar?: string | null };
}

interface Article {
  id: string;
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  redTags?: string[];
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
  hidden?: boolean;
  takenDown?: boolean;
  takedownReason?: string;
  repostedByFollowed?: string[];
  repostedByFollowedCount?: number;
  author: {
    username: string;
    avatar?: string;
  };
}

export default function ArticleReader({
  username,
  slug,
  initialArticle,
}: {
  username: string;
  slug: string;
  initialArticle: Article | null;
}) {
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useUser();
  // Public content arrives already rendered from the server (initialArticle).
  // The fetch below then adds the per-viewer parts (liked, cached, own piece,
  // admin tools) and covers pieces only the author/admin may see.
  const [article, setArticle] = useState<Article | null>(initialArticle);
  const [loading, setLoading] = useState(!initialArticle);
  const [fontSize, setFontSize] = useState(16);
  // The reader's dark/light toggle is the SAME global, persistent toggle used
  // everywhere on Edition.
  const darkMode = theme === 'dark';
  const [lineHeight, setLineHeight] = useState(1.6);
  const [progress, setProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState(initialArticle?.title ?? '');
  const [editDescription, setEditDescription] = useState(initialArticle?.description ?? '');
  const [editTags, setEditTags] = useState<string[]>(initialArticle?.tags ?? []);
  const [editRedTags, setEditRedTags] = useState<string[]>(initialArticle?.redTags ?? []);
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
          setEditRedTags(data.redTags || []);
        }
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [username, slug]);

  useEffect(() => {
    if (!article?.id) return;
    fetch(`/api/articles/${article.id}/comments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((d) => setComments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [article?.id]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d?.id && setViewerId(d.id))
      .catch(() => {});
  }, [isSignedIn]);

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

  const adminLockedAlert = async (res: Response) => {
    const body = await res.clone().json().catch(() => null);
    if (body?.code === 'ADMIN_PASSWORD_REQUIRED') {
      alert('Admin session locked. Open the admin panel and enter the password first.');
      return true;
    }
    return false;
  };

  const toggleHidden = async () => {
    if (!article) return;
    const next = !article.hidden;
    if (next && !window.confirm(article.isAuthor ? 'Hide this piece from public view? You can unhide it any time.' : 'Hide this piece from public view? The author will be notified in their Inbox.')) return;
    setTogglingHidden(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: next }),
      });
      if (res.ok) setArticle((prev) => (prev ? { ...prev, hidden: next } : prev));
      else if (!(await adminLockedAlert(res))) alert('Failed to update visibility');
    } catch (error) {
      console.error('Failed to toggle hidden:', error);
    } finally {
      setTogglingHidden(false);
    }
  };

  const postComment = async () => {
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return;
    }
    if (!article || !commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentText('');
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Failed to post comment');
      }
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (deletingCommentId) return;
    if (!window.confirm('Delete this comment?')) return;
    setDeletingCommentId(id);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
      else if (!(await adminLockedAlert(res))) alert('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const saveEdit = async () => {
    if (!article) return;
    if (article.isAuthor && !editTitle.trim()) {
      alert('Title cannot be empty.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          article.isAuthor
            ? { title: editTitle.trim(), description: editDescription.trim(), tags: editTags, redTags: editRedTags }
            : { tags: editTags, redTags: editRedTags } // admins: tags and red tags only
        ),
      });
      if (response.ok) {
        const updated = await response.json();
        // Merge, don't replace: the PATCH response has none of the per-viewer
        // flags (isAuthor, isAdmin, isLiked, prev/next...), so replacing would
        // wipe them and make the Edit button vanish.
        setArticle((prev) => (prev ? { ...prev, ...updated, author: prev.author } : prev));
        setIsEditing(false);
      } else if (!(await adminLockedAlert(response))) {
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
    <div className={`animate-fade-in ${darkMode ? 'bg-black text-white min-h-screen' : 'bg-white text-black min-h-screen'}`}>
      {/* Progress bar */}
      <div className={`fixed top-0 left-0 h-1 transition-all ${darkMode ? 'bg-white' : 'bg-black'}`} style={{ width: `${progress}%` }} />

      {/* Reading controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 px-2 py-1">
        <button onClick={() => setFontSize((f) => Math.max(12, f - 2))} className="px-2 py-1 text-sm hover:opacity-70">A-</button>
        <button onClick={() => setFontSize((f) => Math.min(28, f + 2))} className="px-2 py-1 text-sm hover:opacity-70">A+</button>
        <div className={`w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <button
          onClick={toggleTheme}
          className="px-3 py-1 text-sm hover:opacity-70"
          title="Toggle reading background"
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {article.takenDown && (article.isAuthor || article.isAdmin) && (
          <div className="border border-red-700 text-red-700 text-sm p-4 mb-8 animate-slide-down">
            <strong>Taken down by Edition.</strong> Hidden from public view; only visible to {article.isAuthor ? 'you' : 'you and the author'}.
            {article.takedownReason && <p className="mt-1">Reason: {article.takedownReason}</p>}
          </div>
        )}
        {article.hidden && (article.isAuthor || article.isAdmin) && (
          <div className="border border-black dark:border-white text-sm p-4 mb-8 animate-slide-down">
            <strong>This piece is hidden.</strong> Only visible to {article.isAuthor ? 'you' : 'you and the author'}.
          </div>
        )}
        {(article.isAuthor || article.isAdmin) && (
          <button
            onClick={toggleHidden}
            disabled={togglingHidden}
            className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 mb-4 mr-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-50"
          >
            {article.hidden ? 'Unhide piece' : 'Hide piece'}
          </button>
        )}
        <Breadcrumbs
          className="mb-6"
          items={[
            { name: 'Home', href: '/' },
            { name: article.author.username, href: `/c/${article.author.username}` },
            { name: article.title, href: `/c/${article.author.username}/p/${article.slug}` },
          ]}
        />

        {/* Title */}
        <header className="mb-12">
          {/* Server-computed from the Prisma record, not Clerk's client-side
              username - the two can diverge (see /api/me), and comparing
              Clerk's copy here could hide the Edit button from the real author. */}
          {(article.isAuthor || article.isAdmin) && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 mb-4 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            >
              {article.isAuthor ? 'Edit title, description & tags' : 'Edit tags & red tags (admin)'}
            </button>
          )}

          {isEditing ? (
            <div className="border border-gray-300 dark:border-gray-700 p-4 mb-6">
              {article.isAuthor && (
                <>
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
                </>
              )}

              <label className="block text-xs font-bold mb-2">Tags</label>
              <div className="mb-4">
                <TagInput value={editTags} onChange={setEditTags} max={MAX_TAGS} maxLength={MAX_TAG_LENGTH} />
              </div>

              <label className="block text-xs font-bold mb-2 text-red-700">Red Tags</label>
              <div className="mb-4">
                <TagInput
                  value={editRedTags}
                  onChange={setEditRedTags}
                  suggestions={SUGGESTED_RED_TAGS}
                  max={MAX_RED_TAGS}
                  maxLength={MAX_RED_TAG_LENGTH}
                  red
                  placeholder="Add your own warning"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveEdit}
                  disabled={isSavingEdit}
                  className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-4 py-2 hover:opacity-80 disabled:opacity-40"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(article.title);
                    setEditDescription(article.description || '');
                    setEditTags(article.tags || []);
                    setEditRedTags(article.redTags || []);
                  }}
                  className="text-xs font-semibold px-4 py-2 hover:opacity-60"
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
                <p
                  className="text-xl mb-6 text-black dark:text-white"
                  dangerouslySetInnerHTML={{ __html: renderTextWithMentions(article.description) }}
                />
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
                  <Block block={block} fontSize={fontSize} darkMode={darkMode} articleTitle={article.title} />
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

          <div className="flex justify-center mb-3">
            <ContentActions
              articleId={article.id}
              initialLiked={article.isLiked}
              initialCached={article.isCached}
              forceDark={darkMode}
              size="md"
            />
          </div>

          {article.redTags && article.redTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-6 animate-fade-in">
              {article.redTags.map((t) => (
                <span key={t} className="text-xs font-semibold text-red-700">#{t.replace(/\s+/g, '')}</span>
              ))}
            </div>
          )}

          <div className="mb-6">
            {!reposted ? (
              <button
                onClick={() => setRepostOpen((v) => !v)}
                className="text-xs font-semibold border border-black dark:border-white px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              >
                Repost as Note
              </button>
            ) : (
              <span className="text-xs text-black dark:text-white">Reposted to your Comm</span>
            )}

            {repostOpen && (
              <div className="max-w-sm mx-auto mt-3 text-left">
                <MentionTextarea
                  value={repostText}
                  onChange={setRepostText}
                  placeholder="Add a thought before reposting..."
                  maxLength={500}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none mb-2 text-black dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRepostOpen(false)}
                    className="text-xs px-3 py-1.5 hover:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRepost}
                    disabled={reposting || !repostText.trim()}
                    className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 hover:opacity-80 disabled:opacity-40"
                  >
                    {reposting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <section className="text-left max-w-xl mx-auto mb-10">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-4">Comments ({comments.length})</h2>
            <div className="flex flex-col gap-5 mb-6">
              {comments.length === 0 && <p className="text-sm opacity-60">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="animate-slide-up">
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <Link href={`/c/${c.author.username}`} className="font-bold hover:underline">{c.author.username}</Link>
                    <span className="opacity-60">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <span className="ml-auto flex items-center gap-3">
                      {(viewerId === c.author.id || article.isAuthor || article.isAdmin) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          disabled={deletingCommentId === c.id}
                          className="text-xs p-0 opacity-60 hover:opacity-100 disabled:opacity-30"
                        >
                          {deletingCommentId === c.id ? 'Deleting...' : viewerId === c.author.id ? 'Delete' : 'Remove'}
                        </button>
                      )}
                      {viewerId !== c.author.id && <ReportButton commentId={c.id} boxClassName="w-3 h-3" />}
                    </span>
                  </div>
                  <p
                    className="text-sm whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: renderTextWithMentions(c.text) }}
                  />
                </div>
              ))}
            </div>
            {isSignedIn ? (
              <div>
                <MentionTextarea
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Add a comment. Use @ to mention someone."
                  maxLength={MAX_COMMENT_LENGTH}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none text-black dark:text-white"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={postComment}
                    disabled={postingComment || !commentText.trim()}
                    className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-4 py-2 hover:opacity-80 disabled:opacity-40"
                  >
                    {postingComment ? 'Posting...' : 'Comment'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm"><Link href="/sign-in" className="underline">Sign in</Link> to comment.</p>
            )}
          </section>

          {(article.prevArticle || article.nextArticle) && (
            <nav className={`border-t pt-6 flex justify-between text-sm ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
              {article.prevArticle ? (
                <Link
                  href={`/c/${username}/p/${article.prevArticle.slug}`}
                  className="hover:opacity-60"
                >
                  <ArrowLeft size={14} className="inline mr-1 -mt-0.5" /> {article.prevArticle.title}
                </Link>
              ) : (
                <span />
              )}
              {article.nextArticle ? (
                <Link
                  href={`/c/${username}/p/${article.nextArticle.slug}`}
                  className="hover:opacity-60 text-right"
                >
                  {article.nextArticle.title} <ArrowRight size={14} className="inline ml-1 -mt-0.5" />
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

function Block({ block, fontSize, darkMode, articleTitle }: { block: Block; fontSize: number; darkMode: boolean; articleTitle: string }) {
  if (block.type === 'text') {
    return (
      <div
        style={{
          fontFamily: block.content.fontFamily || 'EB Garamond',
          fontSize: ((block.content.fontSize || 16) / 16) + 'rem',
          fontStyle: block.content.italic ? 'italic' : 'normal',
          color: darkMode ? '#ffffff' : block.content.color || '#000000',
        }}
        dangerouslySetInnerHTML={{
          // plainTextToSafeHtml fully escapes <, >, & before converting
          // newlines to <br>, so this is already safe HTML - no DOMPurify
          // needed. DOMPurify requires a DOM and would either crash during
          // server rendering or (behind a window-check) render blank on
          // first paint for every visitor, including search engines.
          __html: textBlockHtml(block.content),
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
          // Author's own description when given; otherwise something meaningful for search and screen readers.
          alt={block.content.alt || `Image from "${articleTitle}"`}
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