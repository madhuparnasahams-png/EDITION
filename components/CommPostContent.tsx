import Link from 'next/link';
import { renderTextWithMentions } from '@/lib/mentions';

interface Props {
  post: {
    text: string;
    quotedArticleRemoved?: boolean;
    quotedArticle?: {
      slug: string;
      title: string;
      featuredImage?: string | null;
      author: { username: string };
    } | null;
  };
  textClassName?: string;
}

// Body of a Comm post: the quoted piece (or a placeholder when it was deleted
// by its author), then the poster's own text with @mentions linked.
export default function CommPostContent({ post, textClassName = 'text-sm leading-relaxed' }: Props) {
  return (
    <>
      {post.quotedArticle ? (
        <Link
          href={`/c/${post.quotedArticle.author.username}/p/${post.quotedArticle.slug}`}
          className="flex gap-3 border border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 mb-3"
        >
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 flex-shrink-0 overflow-hidden">
            {post.quotedArticle.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.quotedArticle.featuredImage} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{post.quotedArticle.title}</div>
            <div className="text-sm text-black dark:text-white">{post.quotedArticle.author.username}</div>
          </div>
        </Link>
      ) : post.quotedArticleRemoved ? (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 p-3 mb-3 text-xs italic opacity-70">
          [content removed by author]
        </div>
      ) : null}
      <p className={textClassName} dangerouslySetInnerHTML={{ __html: renderTextWithMentions(post.text) }} />
    </>
  );
}
