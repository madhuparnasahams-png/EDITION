'use client';

import { isAllowedEmbedUrl, isVideoEmbed, EMBED_IFRAME_SANDBOX } from '@/lib/embed';

interface VideoBlockProps {
  content: {
    url?: string;
    caption?: string;
    fullBleed?: boolean;
  };
  onUpdate: (content: any) => void;
}

export default function VideoBlock({ content, onUpdate }: VideoBlockProps) {
  const url = content.url || '';
  const allowed = url.trim().length === 0 || isAllowedEmbedUrl(url);
  const isVideo = allowed && url.trim().length > 0 && isVideoEmbed(url);

  return (
    <div className="border border-gray-200 dark:border-gray-700 p-4">
      <input
        type="text"
        value={content.url || ''}
        onChange={(e) => onUpdate({ ...content, url: e.target.value })}
        placeholder="Embed URL (YouTube, Vimeo, SoundCloud, Spotify, Apple Music...)"
        className={`w-full border bg-transparent p-2 text-sm mb-2 focus:outline-none ${
          allowed
            ? 'border-gray-300 dark:border-gray-700 focus:border-black dark:focus:border-white'
            : 'border-red-500 focus:border-red-500'
        }`}
      />
      {!allowed && (
        <p className="text-xs text-red-600 mb-2">
          Only embed links from YouTube, Vimeo, SoundCloud, Spotify, or Apple Music are supported.
        </p>
      )}
      <input
        type="text"
        value={content.caption || ''}
        onChange={(e) => onUpdate({ ...content, caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm mb-3 focus:outline-none focus:border-black dark:focus:border-white"
      />

      {/* Full-bleed and scroll-to-autoplay only apply to actual video
          (YouTube/Vimeo) - meaningless for a compact audio widget like
          SoundCloud/Spotify/Apple Music, so the option is hidden for those. */}
      {isVideo && (
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <input
            type="checkbox"
            checked={content.fullBleed || false}
            onChange={(e) => onUpdate({ ...content, fullBleed: e.target.checked })}
          />
          Full-bleed (edge-to-edge). Plays automatically, muted, once a reader scrolls it to
          the middle of their screen - readers can turn this off in Settings.
        </label>
      )}

      {content.url && allowed && (
        <iframe
          src={content.url}
          width="100%"
          height="300"
          allowFullScreen
          sandbox={EMBED_IFRAME_SANDBOX}
          className="border border-gray-300 dark:border-gray-700"
        />
      )}
    </div>
  );
}
