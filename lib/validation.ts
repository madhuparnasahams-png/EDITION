import { ALL_TAGS } from '@/lib/tags';

// Central limits so a raw API call bypassing the UI can't stuff unbounded
// data into the DB - large titles/blocks are a storage/DoS vector, and
// free-text tags would let anyone pollute Discovery with tags that don't
// exist in the taxonomy.
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_TAGS = 10;
export const MAX_BLOCKS = 300;
export const MAX_BLOCKS_JSON_BYTES = 3_000_000; // 3MB serialized
export const MAX_TEXT_BLOCK_LENGTH = 40_000;
export const MAX_QUOTE_LENGTH = 2_000;
export const MAX_CAPTION_LENGTH = 300;
export const MAX_ALT_LENGTH = 300;
export const MAX_URL_LENGTH = 2_000;

const ALLOWED_BLOCK_TYPES = new Set(['text', 'image', 'video', 'quote', 'divider']);
const ALL_TAGS_SET = new Set(ALL_TAGS);

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

// Only tags that exist in our own taxonomy are kept - anything else is
// silently dropped rather than erroring, so a slightly stale client
// doesn't hard-fail a publish over one bad tag.
export function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const deduped = Array.from(new Set(raw.filter((t): t is string => typeof t === 'string' && ALL_TAGS_SET.has(t))));
  return deduped.slice(0, MAX_TAGS);
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