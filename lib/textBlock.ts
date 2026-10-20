// TextBlock's editor is a plain <textarea> - what writers type is plain text,
// not markup. But the reader/preview render it via dangerouslySetInnerHTML
// (for DOMPurify-sanitized rich content support down the line). Feeding raw
// plain text straight into dangerouslySetInnerHTML means literal <, >, and &
// characters get interpreted as HTML and can silently vanish or mis-render.
//
// This escapes those characters first, then converts single newlines to <br>
// so paragraph breaks the writer typed are preserved once rendered as HTML.
export function plainTextToSafeHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br>');
}

// ---- Per-selection colour -------------------------------------------------
// Text blocks keep `text` (plain, used for SEO snippets and as a fallback) and
// an optional `html` that carries colour spans. `html` is only ever one of:
//   escaped text, <br>, <span style="color:#rrggbb"> ... </span>
// Anything else is dropped. The same function runs on the server before
// saving and again before rendering, so stored markup can never be trusted.
const SPAN_OPEN = /^<span style="color:(#[0-9a-fA-F]{6})">$/;

export function sanitizeRichHtml(input: string, maxLen = 80_000): string {
  const src = input.slice(0, maxLen);
  const parts = src.split(/(<[^>]*>)/g);
  let out = '';
  let open = 0;
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('<') && part.endsWith('>')) {
      const m = part.match(SPAN_OPEN);
      if (m) {
        out += `<span style="color:${m[1].toLowerCase()}">`;
        open++;
      } else if (part === '</span>') {
        if (open > 0) {
          out += '</span>';
          open--;
        }
      } else if (/^<br\s*\/?>$/i.test(part)) {
        out += '<br>';
      }
      // every other tag is discarded
    } else {
      out += part
        .replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }
  return out + '</span>'.repeat(open);
}

// What to render for a text block: coloured html when present, otherwise the
// plain text escaped as before.
export function textBlockHtml(content: { text?: string; html?: string }): string {
  if (typeof content.html === 'string' && content.html) return sanitizeRichHtml(content.html);
  return plainTextToSafeHtml(content.text || '');
}
