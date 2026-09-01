'use client';

import Link from 'next/link';

interface FeaturedArticle {
  id: string;
  slug: string;
  title: string;
  featuredImage?: string;
  author: { username: string; cardColor?: string };
}

// Netflix/webtoon-style full-bleed hero strip. Admin-curated (the
// `featured` flag), not algorithmic - the only manual curation layer
// Edition has right now, meant to solve the "empty first five minutes"
// problem for a reader who hasn't followed anyone yet.
export default function FeaturedCarousel({ articles }: { articles: FeaturedArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen mb-10">
      <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/c/${article.author.username}/p/${article.slug}`}
            className="relative flex-shrink-0 w-screen aspect-[4/5] sm:aspect-[16/9] snap-center"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: article.featuredImage ? `url(${article.featuredImage})` : undefined,
                backgroundColor: article.featuredImage ? undefined : (article.author.cardColor || '#3A3A3A'),
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Editor&apos;s Pick</span>
              <h2 className="text-2xl font-bold leading-tight mt-1">{article.title}</h2>
              <p className="text-sm opacity-80 mt-1">{article.author.username}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
