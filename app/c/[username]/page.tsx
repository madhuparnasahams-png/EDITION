import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SpreadClient from './SpreadClient';
import JsonLd from '@/components/JsonLd';
import { getSpread } from '@/lib/publicData';
import { absoluteUrl, snippet, SITE_NAME } from '@/lib/site';

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const result = await getSpread(username);

  if (result.state !== 'ok') {
    return { title: 'Not available', robots: { index: false, follow: false } };
  }

  const { creator, articles } = result.data;
  const path = `/c/${username}`;
  const title = creator.tagline ? `${username}: ${creator.tagline}` : username;
  const description =
    snippet(creator.bio, 160) || `Read ${username}'s articles, audio and video on ${SITE_NAME}.`;
  const image: string | undefined = creator.avatar || undefined;

  return {
    title,
    description,
    alternates: { canonical: path },
    // A profile with nothing published has nothing worth indexing yet.
    robots: articles.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'profile',
      title,
      description,
      url: path,
      ...(image ? { images: [{ url: image, alt: username }] } : {}),
    },
    twitter: { card: 'summary', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function CreatorPage({ params }: { params: Params }) {
  const { username } = await params;
  const result = await getSpread(username);

  if (result.state === 'missing') notFound();

  const initial = result.state === 'ok' ? result.data : null;

  return (
    <>
      {initial && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            mainEntity: {
              '@type': 'Person',
              name: username,
              description: initial.creator.bio || undefined,
              image: initial.creator.avatar || undefined,
              url: absoluteUrl(`/c/${username}`),
            },
          }}
        />
      )}
      <SpreadClient username={username} initial={initial} />
    </>
  );
}
