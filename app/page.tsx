'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import ContentActions from "@/components/ContentActions";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CreatorSuggestionCards from "@/components/CreatorSuggestionCards";

const TABS = ['Feed', 'Articles', 'AV', 'Issues'] as const;
type TabType = (typeof TABS)[number];

// How often (every N items) a suggestion strip gets spliced into the mixed
// feed - "randomly mixed in" without needing true randomness; a fixed
// interval reads as organic once actual content is between each one.
const SUGGESTION_INTERVAL = 6;

export default function Newsstand() {
  const { isSignedIn } = useUser();
  const [articles, setArticles] = useState<any[]>([]);
  const [tabArticlesLoaded, setTabArticlesLoaded] = useState(false);
  const [continueReading, setContinueReading] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('Feed');
  const [issues, setIssues] = useState<any[]>([]);
  const [issuesLoaded, setIssuesLoaded] = useState(false);

  const [featuredArticles, setFeaturedArticles] = useState<any[]>([]);
  const [mixedFeed, setMixedFeed] = useState<any[]>([]);
  const [mixedLoading, setMixedLoading] = useState(true);
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);

  // Articles/AV tabs - fetched lazily, same pattern as Issues, since Feed
  // (the default landing tab) doesn't need this list at all anymore.
  useEffect(() => {
    if ((activeTab !== 'Articles' && activeTab !== 'AV') || tabArticlesLoaded) return;
    const fetchArticles = async () => {
      try {
        const response = await fetch("/api/articles");
        if (response.ok) setArticles(await response.json());
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setTabArticlesLoaded(true);
      }
    };
    fetchArticles();
  }, [activeTab, tabArticlesLoaded]);

  useEffect(() => {
    if (!isSignedIn) {
      setContinueReading([]);
      return;
    }
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/reading-progress');
        if (response.ok) setContinueReading(await response.json());
      } catch (error) {
        console.error('Failed to fetch reading progress:', error);
      }
    };
    fetchProgress();
  }, [isSignedIn]);

  useEffect(() => {
    if (activeTab !== 'Issues' || issuesLoaded) return;
    const fetchIssues = async () => {
      try {
        const response = await fetch('/api/issues');
        if (response.ok) setIssues(await response.json());
      } catch (error) {
        console.error('Failed to fetch issues:', error);
      } finally {
        setIssuesLoaded(true);
      }
    };
    fetchIssues();
  }, [activeTab, issuesLoaded]);

  // Feed tab's own content - fetched once on mount since Feed is the
  // default landing tab.
  useEffect(() => {
    const fetchFeaturedAndMixed = async () => {
      try {
        const [featuredRes, mixedRes, suggestedRes] = await Promise.all([
          fetch('/api/articles?featured=true'),
          fetch('/api/feed/mixed'),
          fetch('/api/creators/suggested'),
        ]);
        if (featuredRes.ok) setFeaturedArticles(await featuredRes.json());
        if (mixedRes.ok) setMixedFeed(await mixedRes.json());
        if (suggestedRes.ok) setSuggestedCreators(await suggestedRes.json());
      } catch (error) {
        console.error('Failed to fetch feed:', error);
      } finally {
        setMixedLoading(false);
      }
    };
    fetchFeaturedAndMixed();
  }, []);

  // Articles/AV tabs are filtered by the article's `format` tag - not a
  // content restriction, just where it's surfaced.
  const visibleArticles =
    activeTab === 'Articles'
      ? articles.filter((a) => a.format === 'ARTICLE' && !a.issueId)
      : activeTab === 'AV'
      ? articles.filter((a) => a.format === 'AV' && !a.issueId)
      : [];

  // Splice suggestion strips into the mixed feed at a fixed interval.
  const feedWithSuggestions: { type: string; data: any }[] = [];
  mixedFeed.forEach((item, i) => {
    feedWithSuggestions.push({ type: item.kind, data: item.data });
    const slotIndex = Math.floor((i + 1) / SUGGESTION_INTERVAL) - 1;
    if ((i + 1) % SUGGESTION_INTERVAL === 0) {
      const chunk = suggestedCreators.slice(slotIndex * 5, slotIndex * 5 + 5);
      if (chunk.length > 0) feedWithSuggestions.push({ type: 'suggestions', data: chunk });
    }
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav tabs={[...TABS]} activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabType)} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {activeTab === 'Feed' && <FeaturedCarousel articles={featuredArticles} />}

        {/* Continue Reading - latest 5, signed in only */}
        {activeTab === 'Feed' && isSignedIn && continueReading.length > 0 && (
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-sm font-bold mb-4 text-black dark:text-white">Continue Reading</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {continueReading.slice(0, 5).map((entry) => (
                <Link
                  key={entry.id}
                  href={`/c/${entry.article.author.username}/p/${entry.article.slug}`}
                  className="flex-shrink-0 w-[180px]"
                >
                  <div
                    className="w-full aspect-[4/5] mb-2 overflow-hidden relative"
                    style={{ backgroundColor: entry.article.featuredImage ? undefined : (entry.article.author?.cardColor || '#3A3A3A') }}
                  >
                    {entry.article.featuredImage && (
                      <img src={entry.article.featuredImage} alt={entry.article.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-700">
                      <div
                        className="h-full bg-black dark:bg-white"
                        style={{ width: `${Math.round(entry.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold leading-tight truncate hover:opacity-60 transition">{entry.article.title}</div>
                  <div className="text-sm text-black dark:text-white">{entry.article.author.username}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hero Section (Feed tab, genuinely nothing exists yet) */}
        {activeTab === 'Feed' && !mixedLoading && mixedFeed.length === 0 && featuredArticles.length === 0 && (
          <div className="text-center py-24">
            <h1 className="text-5xl mb-4">Welcome to Edition</h1>
            <p className="text-xl text-black dark:text-white mb-8">
              A newsstand that learns you because it trusts your taste.
            </p>
            {!isSignedIn && (
              <Link href="/sign-up" className="border border-black dark:border-white px-8 py-3 text-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition inline-block">
                Start Reading
              </Link>
            )}
            {isSignedIn && (
              <Link href="/dashboard" className="border border-black dark:border-white px-8 py-3 text-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition inline-block">
                Create Your First Article
              </Link>
            )}
          </div>
        )}

        {/* Feed tab - mixed stream: articles, AV, issues, and follow-only
            reposts/quotes, interleaved by recency, with creator-suggestion
            strips mixed in periodically. */}
        {activeTab === 'Feed' && (
          mixedLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : feedWithSuggestions.length > 0 ? (
            <div className="flex flex-col gap-8 max-w-3xl mx-auto">
              {feedWithSuggestions.map((entry, i) => {
                if (entry.type === 'suggestions') {
                  return <CreatorSuggestionCards key={`sugg-${i}`} creators={entry.data} />;
                }

                if (entry.type === 'issue') {
                  const issue = entry.data;
                  return (
                    <Link key={`issue-${issue.id}`} href={`/c/${issue.author.username}/issue/${issue.id}`}>
                      <div
                        className="w-[70%] aspect-[4/5] mx-auto mb-3 overflow-hidden"
                        style={{ backgroundColor: issue.coverImage ? undefined : (issue.author?.cardColor || '#3A3A3A') }}
                      >
                        {issue.coverImage && (
                          <img src={issue.coverImage} alt={issue.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3">
                        <h2 className="text-[21px] font-bold leading-tight hover:opacity-60 transition">{issue.title}</h2>
                        <span className="text-sm text-black dark:text-white text-right self-center whitespace-nowrap">
                          {issue.itemCount} {issue.itemCount === 1 ? 'piece' : 'pieces'}
                        </span>
                      </div>
                      <div className="w-[70%] mx-auto text-sm text-black dark:text-white mt-1">{issue.author.username}</div>
                    </Link>
                  );
                }

                if (entry.type === 'comm') {
                  const post = entry.data;
                  return (
                    <div key={`comm-${post.id}`} className="w-[70%] mx-auto border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <Link href={`/c/${post.author.username}`} className="text-sm font-bold hover:opacity-60 transition">
                          {post.author.username}
                        </Link>
                        <span className="text-sm text-black dark:text-white">
                          {new Date(post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {post.quotedArticle && (
                        <Link
                          href={`/c/${post.quotedArticle.author.username}/p/${post.quotedArticle.slug}`}
                          className="flex gap-3 border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition mb-3"
                        >
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 flex-shrink-0 overflow-hidden">
                            {post.quotedArticle.featuredImage && (
                              <img src={post.quotedArticle.featuredImage} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{post.quotedArticle.title}</div>
                            <div className="text-sm text-black dark:text-white">{post.quotedArticle.author.username}</div>
                          </div>
                        </Link>
                      )}
                      <p className="text-sm leading-relaxed">{post.text}</p>
                    </div>
                  );
                }

                // 'article' - covers both ARTICLE and AV formats
                const article = entry.data;
                return (
                  <div key={`article-${article.id}`}>
                    <Link href={`/c/${article.author.username}/p/${article.slug}`}>
                      <div
                        className="w-[70%] aspect-[4/5] mx-auto mb-3 overflow-hidden relative"
                        style={{ backgroundColor: article.featuredImage ? undefined : (article.author?.cardColor || '#3A3A3A') }}
                      >
                        {article.featuredImage && (
                          <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
                        )}
                        {article.format === 'AV' && (
                          <span className="absolute top-2 left-2 text-[10px] font-bold bg-black text-white px-2 py-0.5">
                            AV
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                      <h2 className="text-[21px] font-bold leading-tight self-end">
                        <Link href={`/c/${article.author.username}/p/${article.slug}`} className="hover:opacity-60 transition">
                          {article.title}
                        </Link>
                      </h2>
                      <span className="text-sm text-black dark:text-white text-right self-end">
                        {new Date(article.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>

                      <ContentActions
                        articleId={article.id}
                        initialLiked={article.isLiked}
                        initialCached={article.isCached}
                      />
                      <Link
                        href={`/c/${article.author.username}`}
                        className="self-center text-sm text-black dark:text-white text-right hover:opacity-60 transition"
                      >
                        {article.author.username}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null
        )}

        {/* Issues tab */}
        {activeTab === 'Issues' && (
          <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            {!issuesLoaded ? (
              <div className="text-center py-12">Loading...</div>
            ) : issues.length > 0 ? (
              issues.map((issue) => (
                <Link key={issue.id} href={`/c/${issue.author.username}/issue/${issue.id}`}>
                  <div
                    className="w-[70%] aspect-[4/5] mx-auto mb-3 overflow-hidden"
                    style={{ backgroundColor: issue.coverImage ? undefined : (issue.author?.cardColor || '#3A3A3A') }}
                  >
                    {issue.coverImage && (
                      <img src={issue.coverImage} alt={issue.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3">
                    <h2 className="text-[21px] font-bold leading-tight hover:opacity-60 transition">{issue.title}</h2>
                    <span className="text-sm text-black dark:text-white text-right self-center whitespace-nowrap">
                      {issue.itemCount} {issue.itemCount === 1 ? 'piece' : 'pieces'}
                    </span>
                  </div>
                  <div className="w-[70%] mx-auto text-sm text-black dark:text-white mt-1">{issue.author.username}</div>
                </Link>
              ))
            ) : (
              <p className="text-center text-black dark:text-white py-12">No issues yet</p>
            )}
          </div>
        )}

        {/* Articles / AV tabs */}
        {(activeTab === 'Articles' || activeTab === 'AV') && (
          !tabArticlesLoaded ? (
            <div className="text-center py-12">Loading...</div>
          ) : visibleArticles.length > 0 ? (
            <div className="flex flex-col gap-8 max-w-3xl mx-auto">
              {visibleArticles.map((article: any) => (
                <div key={article.id}>
                  <Link href={`/c/${article.author.username}/p/${article.slug}`}>
                    <div
                      className="w-[70%] aspect-[4/5] mx-auto mb-3 overflow-hidden relative"
                      style={{ backgroundColor: article.featuredImage ? undefined : (article.author?.cardColor || '#3A3A3A') }}
                    >
                      {article.featuredImage && (
                        <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
                      )}
                      {article.format === 'AV' && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black text-white px-2 py-0.5">
                          AV
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                    <h2 className="text-[21px] font-bold leading-tight self-end">
                      <Link href={`/c/${article.author.username}/p/${article.slug}`} className="hover:opacity-60 transition">
                        {article.title}
                      </Link>
                    </h2>
                    <span className="text-sm text-black dark:text-white text-right self-end">
                      {new Date(article.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>

                    <ContentActions
                      articleId={article.id}
                      initialLiked={article.isLiked}
                      initialCached={article.isCached}
                    />
                    <Link
                      href={`/c/${article.author.username}`}
                      className="self-center text-sm text-black dark:text-white text-right hover:opacity-60 transition"
                    >
                      {article.author.username}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-black dark:text-white py-12">Nothing here yet</p>
          )
        )}
      </main>
    </div>
  );
}
