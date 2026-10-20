import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import IssueClient from './IssueClient';
import { getIssuePublic } from '@/lib/publicData';
import { snippet, SITE_NAME } from '@/lib/site';

type Params = Promise<{ username: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const result = await getIssuePublic(id);

  if (result.state !== 'ok') {
    return { title: 'Not available', robots: { index: false, follow: false } };
  }

  const issue = result.data;
  // Canonical always points at the real author, whatever username is in the URL.
  const path = `/c/${issue.author.username}/issue/${issue.id}`;
  const description =
    snippet(issue.description, 160) || `${issue.title}, an issue by ${issue.author.username} on ${SITE_NAME}.`;
  const image: string | undefined = issue.coverImage || undefined;

  return {
    title: issue.title,
    description,
    alternates: { canonical: path },
    robots: issue.articles.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      title: issue.title,
      description,
      url: path,
      ...(image ? { images: [{ url: image, alt: issue.title }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: issue.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function IssuePage({ params }: { params: Params }) {
  const { id } = await params;
  const result = await getIssuePublic(id);

  if (result.state === 'missing') notFound();

  return <IssueClient id={id} initialIssue={result.state === 'ok' ? result.data : null} />;
}
