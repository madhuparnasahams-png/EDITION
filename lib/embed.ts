// Embed URLs are creator-entered and rendered as an <iframe> for every
// reader. Without an allowlist, any URL becomes an iframe - a phishing /
// clickjacking vector, not just "trusted embeds". This restricts embeds to
// known, reputable providers and adds a sandbox so even an allowed frame
// can't navigate the parent page, open popups, or run top-level scripts
// beyond simple playback.

const ALLOWED_EMBED_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'open.spotify.com',
  'embed.music.apple.com',
];

export function isAllowedEmbedUrl(rawUrl: string): boolean {
  if (!rawUrl?.trim()) return false;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_EMBED_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// SoundCloud/Spotify/Apple Music are compact audio widgets, not video -
// full-bleed and scroll-to-autoplay only make sense for an actual video
// player (YouTube/Vimeo). Autoplaying audio unexpectedly as someone
// scrolls is the classic bad old-web pattern; this keeps that from
// happening to audio embeds while still allowing it for video.
const AUDIO_ONLY_HOSTS = new Set(['w.soundcloud.com', 'open.spotify.com', 'embed.music.apple.com']);

export function isVideoEmbed(rawUrl: string): boolean {
  if (!isAllowedEmbedUrl(rawUrl)) return false;
  try {
    return !AUDIO_ONLY_HOSTS.has(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Browsers block unmuted autoplay almost universally without a user
// gesture, so muted=1 isn't optional here - without it, "autoplay" would
// just silently fail in most browsers. Setting both spellings covers
// YouTube (mute) and Vimeo (muted) without needing a per-host branch.
// Readers can unmute using the embedded player's own controls.
export function withAutoplayParams(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('mute', '1');
    url.searchParams.set('muted', '1');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// Allows playback/fullscreen scripting and same-origin (needed by most
// players) but blocks top navigation, popups, and form submission.
export const EMBED_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';

// People paste normal share links, not embed links. This converts the common
// ones into the embeddable form of the same allowed hosts. Anything it does
// not recognise is returned unchanged and still goes through isAllowedEmbedUrl.
export function toEmbedUrl(raw: string): string {
  const input = (raw ?? '').trim();
  if (!input) return input;
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
    const ID = /^[\w-]{6,20}$/;

    if (host === 'youtu.be') {
      const id = u.pathname.split('/')[1] || '';
      if (ID.test(id)) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') {
        const v = u.searchParams.get('v') || '';
        if (ID.test(v)) return `https://www.youtube.com/embed/${v}`;
      }
      const m = u.pathname.match(/^\/(?:shorts|live)\/([\w-]{6,20})/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
      if (u.pathname === '/playlist') {
        const list = u.searchParams.get('list') || '';
        if (/^[\w-]{10,60}$/.test(list)) return `https://www.youtube.com/embed/videoseries?list=${list}`;
      }
    }
    if (host === 'vimeo.com') {
      const m = u.pathname.match(/^\/(\d{5,12})/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    if (host === 'open.spotify.com' && !u.pathname.startsWith('/embed')) {
      return `https://open.spotify.com/embed${u.pathname}`;
    }
    if (host === 'soundcloud.com') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(input)}`;
    }
    if (host === 'music.apple.com') {
      return `https://embed.music.apple.com${u.pathname}${u.search}`;
    }
  } catch {
    /* not a URL: leave it */
  }
  return input;
}
