import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import JsonLd from '@/components/JsonLd';
import { getAnonFeed, getFeaturedItems } from '@/lib/publicData';
import { absoluteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/site';

// Rebuilt at most once a minute, so Home stays fresh without hitting the
// database on every visit.
export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [featured, feed] = await Promise.all([getFeaturedItems(), getAnonFeed()]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          description: SITE_TAGLINE,
          url: absoluteUrl('/'),
        }}
      />
      <HomeClient initialFeatured={featured} initialFeed={feed} />
    </>
  );
}
