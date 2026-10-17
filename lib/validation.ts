// Central limits so a raw API call bypassing the UI can't stuff unbounded
// data into the DB - large titles/blocks are a storage/DoS vector.
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
export const MAX_RED_TAGS = 12;
export const MAX_RED_TAG_LENGTH = 40;
export const MAX_COMMENT_LENGTH = 1_000;
export const MAX_BLOCKS = 300;
export const MAX_BLOCKS_JSON_BYTES = 3_000_000; // 3MB serialized
export const MAX_TEXT_BLOCK_LENGTH = 40_000;
export const MAX_QUOTE_LENGTH = 2_000;
export const MAX_CAPTION_LENGTH = 300;
export const MAX_ALT_LENGTH = 300;
export const MAX_URL_LENGTH = 2_000;

const ALLOWED_BLOCK_TYPES = new Set(['text', 'image', 'video', 'quote', 'divider']);

// Only http(s) URLs are allowed anywhere we render a user-supplied link,
// so javascript:/data: URLs can never be stored as a clickable href.
export function isSafeHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length > MAX_URL_LENGTH) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function cleanTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

export function cleanDescription(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DESCRIPTION_LENGTH);
}

// Free-form tags: anyone can create any tag. Normalised to lowercase,
// stripped of '#' and control characters, de-duplicated and capped.
function cleanFreeFormList(raw: unknown, maxCount: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of raw) {
    if (typeof t !== 'string') continue;
    const cleaned = t
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .replace(/^#+/, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, maxLen)
      .toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= maxCount) break;
  }
  return out;
}

export function cleanTags(raw: unknown): string[] {
  return cleanFreeFormList(raw, MAX_TAGS, MAX_TAG_LENGTH);
}

// Red tags are content warnings (not an access gate), also free-form.
export function cleanRedTags(raw: unknown): string[] {
  return cleanFreeFormList(raw, MAX_RED_TAGS, MAX_RED_TAG_LENGTH);
}

export interface BlocksValidationResult {
  ok: boolean;
  error?: string;
  blocks?: any[];
}

// Structurally validates + truncates block content. Doesn't re-check video
// URLs against the embed allowlist here - that's enforced at render time
// (lib/embed.ts) everywhere blocks are displayed, so a disallowed URL
// stored here is inert and never rendered as an iframe.
export function validateAndCleanBlocks(raw: unknown): BlocksValidationResult {
  if (raw === undefined || raw === null) {
    return { ok: true, blocks: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'blocks must be an array' };
  }
  if (raw.length > MAX_BLOCKS) {
    return { ok: false, error: `A piece can have at most ${MAX_BLOCKS} blocks` };
  }

  const cleaned: any[] = [];
  for (const block of raw) {
    if (!block || typeof block !== 'object') {
      return { ok: false, error: 'Each block must be an object' };
    }
    const { id, type, order, content } = block as any;
    if (typeof id !== 'string' || !id) {
      return { ok: false, error: 'Each block needs a string id' };
    }
    if (typeof type !== 'string' || !ALLOWED_BLOCK_TYPES.has(type)) {
      return { ok: false, error: `Unsupported block type: ${String(type)}` };
    }
    if (typeof order !== 'number') {
      return { ok: false, error: 'Each block needs a numeric order' };
    }

    const c = content && typeof content === 'object' ? content : {};
    let cleanContent: any = {};

    if (type === 'text') {
      cleanContent = {
        text: typeof c.text === 'string' ? c.text.slice(0, MAX_TEXT_BLOCK_LENGTH) : '',
        fontFamily: typeof c.fontFamily === 'string' ? c.fontFamily.slice(0, 50) : 'EB Garamond',
        fontSize: typeof c.fontSize === 'number' && c.fontSize >= 10 && c.fontSize <= 72 ? c.fontSize : 16,
        bold: !!c.bold,
        italic: !!c.italic,
        color: typeof c.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c.color) ? c.color : undefined,
      };
    } else if (type === 'image') {
      cleanContent = {
        url: typeof c.url === 'string' ? c.url.slice(0, MAX_URL_LENGTH) : '',
        alt: typeof c.alt === 'string' ? c.alt.slice(0, MAX_ALT_LENGTH) : '',
        fullBleed: !!c.fullBleed,
      };
    } else if (type === 'video') {
      cleanContent = {
        url: typeof c.url === 'string' ? c.url.slice(0, MAX_URL_LENGTH) : '',
        caption: typeof c.caption === 'string' ? c.caption.slice(0, MAX_CAPTION_LENGTH) : '',
        fullBleed: !!c.fullBleed,
      };
    } else if (type === 'quote') {
      cleanContent = {
        text: typeof c.text === 'string' ? c.text.slice(0, MAX_QUOTE_LENGTH) : '',
        author: typeof c.author === 'string' ? c.author.slice(0, 200) : '',
      };
    } else if (type === 'divider') {
      cleanContent = {};
    }

    cleaned.push({ id, type, order, content: cleanContent });
  }

  const serializedSize = Buffer.byteLength(JSON.stringify(cleaned), 'utf8');
  if (serializedSize > MAX_BLOCKS_JSON_BYTES) {
    return { ok: false, error: 'Piece content is too large' };
  }

  return { ok: true, blocks: cleaned };
}