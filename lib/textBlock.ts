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
