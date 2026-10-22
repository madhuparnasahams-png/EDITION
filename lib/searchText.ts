// Plain searchable text for an article: title, description, tags and the
// words inside its text and quote blocks. Used by Cache search.
export function articleSearchText(a: {
  title: string;
  description?: string | null;
  tags?: string[] | null;
  blocks?: unknown;
  author?: { username?: string } | null;
}): string {
  const parts: string[] = [a.title, a.description ?? '', ...(a.tags ?? []), a.author?.username ?? ''];
  if (Array.isArray(a.blocks)) {
    for (const b of a.blocks as any[]) {
      if ((b?.type === 'text' || b?.type === 'quote') && typeof b?.content?.text === 'string') parts.push(b.content.text);
      if (b?.type === 'video' && typeof b?.content?.caption === 'string') parts.push(b.content.caption);
    }
  }
  return parts.join(' \n ').toLowerCase();
}
