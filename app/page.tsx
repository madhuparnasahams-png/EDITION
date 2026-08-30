'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import ContentActions from "@/components/ContentActions";

const TABS = ['Feed', 'Blogs', 'AV', 'Issues'] as const;
type TabType = (typeof TABS)[number];

export default function Newsstand() {
  const { isSignedIn } = useUser();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [continueReading, setContinueReading] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('Feed');
  const [issues, setIssues] = useState<any[]>([]);
  const [issuesLoaded, setIssuesLoaded] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("/api/articles");
        if (!response.ok) {
          console.error("Failed to fetch articles:", response.status);
          return;
        }
        const data = await response.json();
        setArticles(data);
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

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

  // Feed = everything, unfiltered. Blogs/AV split by the article's `format`
  // tag (which tab it's filed under) - not a content restriction. A "Blogs"
  // article can contain images, including full-bleed ones, same as any
  // other article; format just controls where it's surfaced.
  const visibleArticles =
    activeTab === 'Feed'
      ? articles
      : activeTab === 'Blogs'
      ? articles.filter((a) => a.format === 'ARTICLE' && !a.issueId)
      : activeTab === 'AV'
      ? articles.filter((a) => a.format === 'AV' && !a.issueId)
      : [];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav tabs={[...TABS]} activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabType)} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Continue Reading - only shown on Feed, signed in, with in-progress articles */}
        {activeTab === 'Feed' && isSignedIn && continueReading.length > 0 && (
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-sm font-bold mb-4 text-gray-500 dark:text-gray-400">Continue Reading</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {continueReading.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/c/${entry.article.author.username}/p/${entry.article.slug}`}
                  className="flex-shrink-0 w-[180px]"
                >
                  <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-gray-900 mb-2 overflow-hidden relative">
                    {entry.article.featuredImage ? (
                      <img src={entry.article.featuredImage} alt={entry.article.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Image</div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-700">
                      <div
                        className="h-full bg-black dark:bg-white"
                        style={{ width: `${Math.round(entry.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold leading-tight truncate hover:opacity-60 transition">{entry.article.title}</div>
                  <div className="text-xs text-gray-400">{entry.article.author.username}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hero Section (if no articles at all) */}
        {articles.length === 0 && !loading && activeTab === 'Feed' && (
          <div className="text-center py-24">
            <h1 className="text-5xl mb-4">Welcome to Edition</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              A newsstand that knows you—and learns you—because it trusts your taste.
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

        {/* Issues tab - separate content type, own card style matching Spread */}
        {activeTab === 'Issues' ? (
          <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            {!issuesLoaded ? (
              <div className="text-center py-12">Loading...</div>
            ) : issues.length > 0 ? (
              issues.map((issue) => (
                <Link key={issue.id} href={`/c/${issue.author.username}/issue/${issue.id}`}>
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
                  <div className="w-[70%] mx-auto text-xs text-gray-400 mt-1">{issue.author.username}</div>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400 py-12">No issues yet</p>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : visibleArticles.length > 0 ? (
          <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            {visibleArticles.map((article: any) => (
              <div key={article.id}>
                <Link href={`/c/${article.author.username}/p/${article.slug}`}>
                  <div className="w-[70%] aspect-[4/5] bg-gray-100 dark:bg-gray-900 mx-auto mb-3 overflow-hidden relative">
                    {article.featuredImage ? (
                      <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Image
                      </div>
                    )}
                    {article.format === 'AV' && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-black text-white px-2 py-0.5">
                        AV
                      </span>
                    )}
                    {article.isFree && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-white text-black px-2 py-0.5">
                        FREE
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
                  <span className="text-xs text-gray-400 text-right self-end">
                    {new Date(article.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>

                  <ContentActions
                    articleId={article.id}
                    initialLiked={article.isLiked}
                    initialCached={article.isCached}
                  />
                  <Link
                    href={`/c/${article.author.username}`}
                    className="self-center text-xs text-gray-400 text-right hover:text-black dark:hover:text-white transition"
                  >
                    {article.author.username}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-12">Nothing here yet</p>
        ) : null}
      </main>
    </div>
  );
}
