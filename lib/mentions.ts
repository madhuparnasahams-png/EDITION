// @-mentions across Edition (comments, comm posts, articles).

const MENTION_RE = /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{2,30})/g;
export const MAX_MENTIONS_PER_ITEM = 10;

export function extractMentions(text: string): string[] {
  if (typeof text !== 'string') return [];
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    found.add(m[2].toLowerCase());
    if (found.size >= MAX_MENTIONS_PER_ITEM) break;
  }
  return Array.from(found);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escapes ALL html first, then linkifies @username. Safe for dangerouslySetInnerHTML.
export function renderTextWithMentions(text: string): string {
  const escaped = escapeHtml(text ?? '');
  return escaped.replace(
    /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{2,30})/g,
    (_m, pre, name) =>
      `${pre}<a href="/c/${name}" class="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity">@${name}</a>`
  );
}

interface CreateMentionsArgs {
  texts: string[];
  authorId: string;
  sourceType: 'ARTICLE' | 'COMM_POST' | 'COMMENT';
  sourceId: string;
  articleId?: string | null;
}

// Server-only. Drops self-mentions and usernames that don't exist; never throws.
export async function createMentions({ texts, authorId, sourceType, sourceId, articleId }: CreateMentionsArgs) {
  try {
    const names = Array.from(new Set(texts.flatMap((t) => extractMentions(t)))).slice(0, MAX_MENTIONS_PER_ITEM);
    if (names.length === 0) return;
    const { prisma } = await import('@/lib/prisma');
    const users = await prisma.user.findMany({
      where: { username: { in: names, mode: 'insensitive' }, hiddenByAdmin: false, NOT: { id: authorId } },
      select: { id: true },
    });
    if (users.length === 0) return;
    const snippet = (texts.find((t) => t && t.trim()) ?? '').slice(0, 140);
    await prisma.mention.createMany({
      data: users.map((u) => ({
        mentionedUserId: u.id,
        authorId,
        sourceType,
        sourceId,
        articleId: articleId ?? null,
        snippet,
      })),
    });
  } catch (e) {
    console.error('createMentions failed', e);
  }
}
