import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { absoluteUrl } from '@/lib/site';

export interface Crumb {
  name: string;
  href: string;
}

// Visible trail plus the matching BreadcrumbList data for Google.
export default function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <>
      <nav aria-label="Breadcrumb" className={`text-xs ${className}`}>
        <ol className="flex flex-wrap items-center gap-x-2 list-none p-0 m-0">
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-2 min-w-0">
              {i < items.length - 1 ? (
                <>
                  <Link href={c.href} className="hover:underline">{c.name}</Link>
                  <span aria-hidden="true" className="opacity-40">/</span>
                </>
              ) : (
                <span aria-current="page" className="opacity-60 truncate max-w-[16rem]">{c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: absoluteUrl(c.href),
          })),
        }}
      />
    </>
  );
}
