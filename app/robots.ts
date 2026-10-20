import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or app-only areas: never useful in search results.
        disallow: ['/api/', '/admin', '/dashboard', '/inbox', '/settings', '/cache', '/create', '/sign-in', '/sign-up'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
