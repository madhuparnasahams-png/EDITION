'use client';

import { useEffect, useRef, useState } from 'react';
import { isVideoEmbed, withAutoplayParams, EMBED_IFRAME_SANDBOX } from '@/lib/embed';
import { useAutoplayPreference } from '@/lib/useAutoplayPreference';

interface VideoEmbedProps {
  url: string;
  fullBleed?: boolean;
  darkMode?: boolean;
}

export default function VideoEmbed({ url, fullBleed, darkMode }: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { autoplay } = useAutoplayPreference();
  const isVideo = isVideoEmbed(url);
  // Audio embeds (SoundCloud/Spotify/Apple Music) and readers who've
  // turned autoplay off just get the plain embed, mounted immediately -
  // no observer needed, no surprise playback.
  const [triggered, setTriggered] = useState(!isVideo || !autoplay);

  useEffect(() => {
    if (triggered || !containerRef.current) return;

    // rootMargin of -50% top and bottom shrinks the observer's effective
    // viewport to a single line at the vertical center of the screen - the
    // callback fires exactly when the block crosses that line, which is
    // "reaches the middle of the screen" as an actual trigger condition
    // rather than "any part is visible".
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect(); // only ever autoplay once per block
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [triggered]);

  const src = triggered && isVideo && autoplay ? withAutoplayParams(url) : url;
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-300';

  if (fullBleed) {
    return (
      <div ref={containerRef} className="relative left-1/2 -translate-x-1/2 w-screen aspect-video bg-gray-100 dark:bg-gray-900">
        {triggered && (
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            sandbox={EMBED_IFRAME_SANDBOX}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`aspect-video border ${borderClass} bg-gray-100 dark:bg-gray-900`}>
      {triggered && (
        <iframe
          src={src}
          className="w-full h-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox={EMBED_IFRAME_SANDBOX}
        />
      )}
    </div>
  );
}
