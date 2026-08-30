'use client';

import { use, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import ContentActions from '@/components/ContentActions';
import { ALL_TAGS } from '@/lib/tags';

interface Creator {
  id: string;
  username: string;
  bio?: string;
  avatar?: string;
  tagline?: string;
  cardColor?: string;
  followerCount?: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

function getReadableTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

interface Article {
  id: string;
  slug: string;
  title: string;
  featuredImage?: string;
  publishedAt: string;
  format: string;
  issueId?: string | null;
  isLiked?: boolean;
  isCached?: boolean;
}

interface IssueBoard {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  itemCount: number;
}

interface CommPost {
  id: string;
  text: string;
  createdAt: string;
  author: { username: string };
  quotedArticle?: {
    id: string;
    slug: string;
    title: string;
    featuredImage?: string;
    author: { username: string };
  } | null;
}

const TABS = ['Issues', 'Articles', 'AV', 'Comm'] as const;

function formatFollowerCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return `${count}`;
}

function UsernameLabel({ username }: { username: string }) {
  const trimmed = username.length > 12 ? username.slice(0, 12) : username;
  const base = 12;
  const min = 9;
  const shrinkAfter = 6;
  const size =
    trimmed.length > shrinkAfter
      ? Math.max(min, base - (trimmed.length - shrinkAfter) * 0.5)
      : base;
  return (
    <span style={{ fontSize: `${size}px` }} className="text-gray-400 text-right whitespace-nowrap">
      {trimmed}
    </span>
  );
}

export default function CreatorSpread({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-black" />}>
      <CreatorSpreadInner params={params} />
    </Suspense>
  );
}

function CreatorSpreadInner({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [issues, setIssues] = useState<IssueBoard[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(() => {
    const tabParam = searchParams.get('tab');
    return (TABS as readonly string[]).includes(tabParam || '') ? (tabParam as (typeof TABS)[number]) : 'Issues';
  });
  const [commPosts, setCommPosts] = useState<CommPost[]>([]);
  const [commLoaded, setCommLoaded] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [cardColor, setCardColor] = useState('#3A3A3A');
  const [savingColor, setSavingColor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const response = await fetch(`/api/creators/${username}`);
        if (response.ok) {
          const data = await response.json();
          setCreator(data);
          setFollowing(!!data.isFollowing);
          setFollowerCount(data.followerCount ?? 0);
          setCardColor(data.cardColor || '#3A3A3A');
        }
      } catch (error) {
        console.error('Failed to fetch creator:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchArticles = async () => {
      try {
        const response = await fetch(`/api/creators/${username}/articles`);
        if (response.ok) setArticles(await response.json());
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      }
    };

    const fetchIssues = async () => {
      try {
        const response = await fetch(`/api/creators/${username}/issues`);
        if (response.ok) setIssues(await response.json());
      } catch (error) {
        console.error('Failed to fetch issues:', error);
      }
    };

    fetchCreator();
    fetchArticles();
    fetchIssues();
  }, [username]);

  useEffect(() => {
    if (activeTab !== 'Comm' || commLoaded) return;
    const fetchComm = async () => {
      try {
        const response = await fetch(`/api/comm/${username}`);
        if (response.ok) setCommPosts(await response.json());
      } catch (error) {
        console.error('Failed to fetch comm posts:', error);
      } finally {
        setCommLoaded(true);
      }
    };
    fetchComm();
  }, [activeTab, username, commLoaded]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!creator) {
    return <div className="min-h-screen flex items-center justify-center">Creator not found</div>;
  }

  // Server-computed against the Prisma record, not Clerk's client-side
  // username - the two can diverge (see /api/me), and comparing Clerk's
  // copy here could hide Spread-owner controls from the real owner.
  const isOwnSpread = !!creator.isOwnProfile;

  const saveCardColor = async (newColor: string) => {
    const prevColor = cardColor;
    setCardColor(newColor); // optimistic
    setSavingColor(true);
    try {
      const response = await fetch('/api/profile/card-color', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardColor: newColor }),
      });
      if (!response.ok) throw new Error('failed to save color');
    } catch (error) {
      console.error('Failed to save card color:', error);
      setCardColor(prevColor);
    } finally {
      setSavingColor(false);
    }
  };

  const toggleFollow = async () => {
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return;
    }
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowerCount((c) => (wasFollowing ? c - 1 : c + 1));
    try {
      const res = wasFollowing
        ? await fetch(`/api/follow?creatorId=${creator.id}`, { method: 'DELETE' })
        : await fetch('/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creatorId: creator.id }),
          });
      if (!res.ok) throw new Error('follow toggle failed');
    } catch (error) {
      console.error('Follow toggle failed:', error);
      setFollowing(wasFollowing);
      setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
    }
  };

  const postComm = async () => {
    if (!isSignedIn) {
      window.location.href = '/sign-in';
      return;
    }
    if (!composerText.trim()) return;
    setPosting(true);
    try {
      const response = await fetch('/api/comm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composerText.trim() }),
      });
      if (response.ok) {
        const newPost = await response.json();
        setCommPosts((prev) => [newPost, ...prev]);
        setComposerText('');
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || 'Failed to post');
      }
    } catch (error) {
      console.error('Failed to post comm:', error);
      alert('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      {/* Profile Section */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        {/* Unified card: quote rectangle + square PFP, no gap, PFP side = card height */}
        <div
          className="flex h-[140px] mb-3"
          style={{ backgroundColor: cardColor, color: getReadableTextColor(cardColor) }}
        >
          <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">
            <div className="text-4xl font-light opacity-50 leading-none">&ldquo;</div>
            <div>
              <h1 className="text-2xl font-bold mb-1 leading-tight">{creator.tagline || creator.username}</h1>
              {creator.bio && <p className="text-[11px] leading-snug line-clamp-3">{creator.bio}</p>}
            </div>
            <div className="text-4xl font-light opacity-50 leading-none text-right">&rdquo;</div>
          </div>
          <div className="w-[140px] h-[140px] bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
            {creator.avatar ? (
              <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />
            ) : (
              'PFP'
            )}
          </div>
        </div>

        {/* Follower count (left) + Follow button (right) - outside the card */}
        {!isOwnSpread && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-bold text-black dark:text-white">{formatFollowerCount(followerCount)}</span> followers
            </div>
            <button
              onClick={toggleFollow}
              className={`text-xs font-semibold px-6 py-2 transition ${
                following ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-transparent text-black dark:text-white hover:opacity-60'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
        )}

        {isOwnSpread && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-bold text-black dark:text-white">{formatFollowerCount(followerCount)}</span> followers
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                Card color
                <input
                  type="color"
                  value={cardColor}
                  disabled={savingColor}
                  onChange={(e) => saveCardColor(e.target.value)}
                  className="w-6 h-6 border border-gray-300 dark:border-gray-700 cursor-pointer bg-transparent p-0"
                />
              </label>
              <Link href="/dashboard" className="text-xs font-semibold px-2 py-2 hover:opacity-60 transition">
                Edit Spread
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Tabs - evenly spaced, flush below header, no gap */}
      <div className="flex justify-around border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-4 text-base border-b-2 transition ${
              activeTab === tab ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content - single column vertical scroll, thumbnails at 70% width, magazine ratio */}
      <main className="py-4">
        {activeTab === 'Issues' ? (
          <div className="flex flex-col gap-8">
            {issues.length > 0 ? (
              issues.map((issue) => (
                <Link key={issue.id} href={`/c/${creator.username}/issue/${issue.id}`}>
                  <div className="w-[70%] aspect-[4/5] bg-gray-100 dark:bg-gray-900 mx-auto mb-3 overflow-hidden">
                    {issue.coverImage ? (
                      <img src={issue.coverImage} alt={issue.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Cover</div>
                    )}
                  </div>
                  <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3">
                    <h2 className="text-[21px] font-bold leading-tight hover:opacity-60 transition">{issue.title}</h2>
                    <span className="text-xs text-gray-400 text-right self-center whitespace-nowrap">
                      {issue.itemCount} {issue.itemCount === 1 ? 'piece' : 'pieces'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">No issues yet</p>
            )}
          </div>
        ) : activeTab === 'Articles' || activeTab === 'AV' ? (
          <div className="flex flex-col gap-8">
            {articles.filter((a) => !a.issueId && a.format === (activeTab === 'AV' ? 'AV' : 'ARTICLE')).length > 0 ? (
              articles
                .filter((a) => !a.issueId && a.format === (activeTab === 'AV' ? 'AV' : 'ARTICLE'))
                .map((article) => (
                  <div key={article.id} className="cursor-pointer">
                    <Link href={`/c/${creator.username}/p/${article.slug}`}>
                      <div className="w-[70%] aspect-[4/5] bg-gray-100 dark:bg-gray-900 mx-auto mb-3 overflow-hidden">
                        {article.featuredImage ? (
                          <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Image
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Metadata grid: title/date row, then icons/username row - both flush with image edges */}
                    <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] grid-rows-2 gap-x-3 gap-y-2">
                      <h2 className="text-[21px] font-bold leading-tight self-end">
                        <Link href={`/c/${creator.username}/p/${article.slug}`} className="hover:opacity-60 transition">
                          {article.title}
                        </Link>
                      </h2>
                      <span className="text-xs text-gray-400 text-right self-end">
                        {new Date(article.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>

                      <ContentActions
                        articleId={article.id}
                        initialLiked={article.isLiked}
                        initialCached={article.isCached}
                      />
                      <div className="self-center">
                        <UsernameLabel username={creator.username} />
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400">Nothing here yet</p>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto px-4">
            {isOwnSpread && (
              <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Share a quote, thought, or short update..."
                  maxLength={500}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-3 text-sm focus:outline-none focus:border-black dark:focus:border-white resize-none mb-2"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{composerText.length}/500</span>
                  <button
                    onClick={postComm}
                    disabled={posting || !composerText.trim()}
                    className="text-xs font-semibold bg-black text-white dark:bg-white dark:text-black px-4 py-2 hover:opacity-80 transition disabled:opacity-40"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {commPosts.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">Nothing posted yet</p>
            ) : (
              <div className="flex flex-col gap-6">
                {commPosts.map((post) => (
                  <div key={post.id} className="border-b border-gray-200 dark:border-gray-800 pb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold">{post.author.username}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mb-3">{post.text}</p>
                    {post.quotedArticle && (
                      <Link
                        href={`/c/${post.quotedArticle.author.username}/p/${post.quotedArticle.slug}`}
                        className="flex gap-3 border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                      >
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 flex-shrink-0 overflow-hidden">
                          {post.quotedArticle.featuredImage && (
                            <img src={post.quotedArticle.featuredImage} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{post.quotedArticle.title}</div>
                          <div className="text-xs text-gray-400">{post.quotedArticle.author.username}</div>
                        </div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
