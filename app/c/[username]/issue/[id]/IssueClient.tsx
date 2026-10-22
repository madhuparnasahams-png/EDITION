'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContentActions from '@/components/ContentActions';

interface IssueArticle {
  id: string;
  slug: string;
  title: string;
  featuredImage?: string;
  format?: string;
  publishedAt: string;
  isLiked?: boolean;
  isCached?: boolean;
}

interface IssueDetail {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  author: { username: string; cardColor?: string };
  articles: IssueArticle[];
}

export default function IssueClient({ id, initialIssue }: { id: string; initialIssue: IssueDetail | null }) {
  // Public content arrives already rendered from the server; the fetch below
  // refreshes it and adds the viewer's liked/cached state.
  const [issue, setIssue] = useState<IssueDetail | null>(initialIssue);
  const [loading, setLoading] = useState(!initialIssue);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const response = await fetch(`/api/issues/${id}`);
        if (response.ok) setIssue(await response.json());
      } catch (error) {
        console.error('Failed to fetch issue:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!issue) {
    return <div className="min-h-screen flex items-center justify-center">Issue not found</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <Nav />

      <main className="py-8">
        <Breadcrumbs
          className="px-4 mb-6 max-w-3xl mx-auto"
          items={[
            { name: 'Home', href: '/' },
            { name: issue.author.username, href: `/c/${issue.author.username}` },
            { name: issue.title, href: `/c/${issue.author.username}/issue/${issue.id}` },
          ]}
        />
        <div className="px-4 mb-8 text-center">
          {issue.coverImage ? (
            <div className="w-[70%] aspect-[4/5] mx-auto mb-4 overflow-hidden">
              <img src={issue.coverImage} alt={issue.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="w-[70%] aspect-[4/5] mx-auto mb-4 overflow-hidden"
              style={{ backgroundColor: issue.author.cardColor || '#3A3A3A' }}
            />
          )}
          <h1 className="text-3xl font-bold mb-1">{issue.title}</h1>
          {issue.description && <p className="text-sm text-black dark:text-white mb-2">{issue.description}</p>}
          <Link href={`/c/${issue.author.username}`} className="text-sm text-black dark:text-white hover:opacity-60">
            {issue.author.username}
          </Link>
        </div>

        {/* Single-column vertical scroll of curated pieces, same magazine card style as elsewhere */}
        <div className="flex flex-col gap-8">
          {issue.articles.length > 0 ? (
            issue.articles.map((article, i) => (
              <div key={article.id}>
                <Link href={`/c/${issue.author.username}/p/${article.slug}`}>
                  <div
                    className={`w-[70%] ${article.format === 'AV' ? 'aspect-video' : 'aspect-[4/5]'} mx-auto mb-3 overflow-hidden`}
                    style={{ backgroundColor: article.featuredImage ? undefined : (issue.author.cardColor || '#3A3A3A') }}
                  >
                    {article.featuredImage && (
                      <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                </Link>

                <div className="w-[70%] mx-auto grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                  <h2 className="text-[21px] font-bold leading-tight self-end">
                    <Link href={`/c/${issue.author.username}/p/${article.slug}`} className="hover:opacity-60">
                      {i + 1}. {article.title}
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
                  <div />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-black dark:text-white">No pieces published in this issue yet</p>
          )}
        </div>
      </main>
    </div>
  );
}
