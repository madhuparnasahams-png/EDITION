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
