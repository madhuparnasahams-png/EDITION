import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleReader from './ArticleReader';
import JsonLd from '@/components/JsonLd';
import { getPublicArticle } from '@/lib/publicData';
import { absoluteUrl, firstTextFromBlocks, hasAdultRedTag, snippet, SITE_NAME } from '@/lib/site';

type Params = Promise<{ username: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await getPublicArticle(username, slug);

  if (result.state !== 'ok') {
    // Missing, hidden, taken down or temporarily unreadable: never index.
    return { title: 'Not available', robots: { index: false, follow: false } };
  }

  const a = result.data;
  const path = `/c/${username}/p/${slug}`;
  const description = snippet(a.description || firstTextFromBlocks(a.blocks), 160) || `${a.title}, by ${username} on ${SITE_NAME}.`;
  const image: string | undefined = a.featuredImage || undefined;

  return {
    title: a.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: a.title,
      description,
      url: path,
      publishedTime: a.publishedAt,
      authors: [username],
      ...(image ? { images: [{ url: image, alt: a.title }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: a.title, description, ...(image ? { images: [image] } : {}) },
    // Pieces marked with the "Sexual Content" Red Tag tell SafeSearch they are adult.
    ...(hasAdultRedTag(a.redTags) ? { other: { rating: 'adult' } } : {}),
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { username, slug } = await params;
  const result = await getPublicArticle(username, slug);

  if (result.state === 'missing') notFound();

  const article = result.state === 'ok' ? result.data : null;

  return (
    <>
      {article && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: snippet(article.description || firstTextFromBlocks(article.blocks), 200) || undefined,
            image: article.featuredImage ? [article.featuredImage] : undefined,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            author: { '@type': 'Person', name: username, url: absoluteUrl(`/c/${username}`) },
            publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
            mainEntityOfPage: absoluteUrl(`/c/${username}/p/${slug}`),
          }}
        />
      )}
      <ArticleReader username={username} slug={slug} initialArticle={article} />
    </>
  );
}
