// Single source of truth for the site's public address, used by canonicals,
// the sitemap, robots and structured data. Set NEXT_PUBLIC_SITE_URL in Vercel
// to your real domain (for example https://edition.app). It is not a secret.
export const SITE_NAME = 'Edition';
export const SITE_TAGLINE = 'A newsstand that learns you because it trusts your taste.';

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

// Short plain-text snippet for meta descriptions.
export function snippet(text: string | null | undefined, max = 160): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// First readable text found in an article's blocks.
export function firstTextFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  for (const b of blocks as any[]) {
    if (b?.type === 'text' && typeof b?.content?.text === 'string' && b.content.text.trim()) return b.content.text;
    if (b?.type === 'quote' && typeof b?.content?.text === 'string' && b.content.text.trim()) return b.content.text;
  }
  return '';
}

export function hasAdultRedTag(redTags: string[] | null | undefined): boolean {
  return (redTags ?? []).some((t) => t.trim().toLowerCase() === 'sexual content');
}
