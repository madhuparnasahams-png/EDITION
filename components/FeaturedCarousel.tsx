'use client';

import Link from 'next/link';

export interface FeaturedItemData {
  id: string;
  type: 'ARTICLE' | 'IMAGE';
  imageUrl?: string | null;
  title?: string | null;
  linkUrl?: string | null;
  article?: {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    featuredImage?: string | null;
    author: { username: string };
  } | null;
}

// Full-bleed hero strip. Admin-curated (FeaturedItem), shown in the custom
// order the admin chose: articles or uploaded images.
export default function FeaturedCarousel({ items }: { items: FeaturedItemData[] }) {
  if (items.length === 0) return null;

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen mb-10 animate-fade-in">
      <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isArticle = item.type === 'ARTICLE' && item.article;
          const image = isArticle ? item.article!.featuredImage : item.imageUrl;
          const title = isArticle ? item.article!.title : item.title;
          const href = isArticle ? `/c/${item.article!.author.username}/p/${item.article!.slug}` : item.linkUrl || null;
          const external = !!href && /^https?:\/\//i.test(href);

          const inner = (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center bg-black transition-transform duration-700 ease-out hover:scale-[1.02]"
                style={{ backgroundImage: image ? `url(${image})` : undefined }}
              />
              {title && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h2 className="text-2xl font-bold leading-tight">{title}</h2>
                    {isArticle && <p className="text-sm opacity-80 mt-1">{item.article!.author.username}</p>}
                  </div>
                </>
              )}
            </>
          );
          const cls = 'relative flex-shrink-0 w-screen aspect-[4/5] sm:aspect-[16/9] snap-center overflow-hidden block';

          if (!href) return <div key={item.id} className={cls}>{inner}</div>;
          return external ? (
            <a key={item.id} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
          ) : (
            <Link key={item.id} href={href} className={cls}>{inner}</Link>
          );
        })}
      </div>
    </div>
  );
}
