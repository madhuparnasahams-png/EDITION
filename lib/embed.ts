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

// Allows playback/fullscreen scripting and same-origin (needed by most
// players) but blocks top navigation, popups, and form submission.
export const EMBED_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';
