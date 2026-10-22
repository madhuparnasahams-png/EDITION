'use client';

import { useEffect, useRef } from 'react';
import { textBlockHtml } from '@/lib/textBlock';

const FONT_OPTIONS = ['EB Garamond', 'Playfair Display', 'Lora', 'Cormorant Garamond', 'Special Elite', 'Caveat'];

interface TextBlockProps {
  content: {
    text?: string;
    html?: string;
    fontFamily?: string;
    fontSize?: number;
    italic?: boolean;
  };
  onUpdate: (content: any) => void;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHex(c: string): string | null {
  if (!c) return null;
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  return null;
}

// Walks the editable DOM and returns only what we allow to be stored:
// escaped text, <br> and colour spans. The base ink colour is the default, so it is
// dropped (which also lets dark mode show it in the light colour).
function serialize(root: HTMLElement): { html: string; text: string } {
  let html = '';
  let text = '';
  let started = false;

  const walk = (node: Node, parentIsDivOnlyChild: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent || '';
      if (t) {
        html += esc(t);
        text += t;
        started = true;
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'BR') {
      if (parentIsDivOnlyChild) return;
      html += '<br>';
      text += '\n';
      started = true;
      return;
    }
    const isBlock = tag === 'DIV' || tag === 'P';
    if (isBlock && started) {
      html += '<br>';
      text += '\n';
    }
    started = started || isBlock;
    let color: string | null = null;
    if (tag === 'FONT') color = toHex(el.getAttribute('color') || '');
    else color = toHex(el.style.color);
    if (color === '#000000' || color === '#2c2c27') color = null;
    if (color) html += `<span style="color:${color}">`;
    const onlyChild = isBlock && el.childNodes.length === 1;
    el.childNodes.forEach((ch) => walk(ch, onlyChild));
    if (color) html += '</span>';
  };

  root.childNodes.forEach((ch) => walk(ch, false));
  return { html, text };
}

export default function TextBlock({ content, onUpdate }: TextBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const latest = useRef(content);
  latest.current = content;

  // Uncontrolled after mount: the browser owns the caret and selection.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = textBlockHtml(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember the last selection inside the editor, because opening the colour
  // picker moves focus away from it.
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !ref.current) return;
      const r = sel.getRangeAt(0);
      if (ref.current.contains(r.commonAncestorContainer)) savedRange.current = r.cloneRange();
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const push = () => {
    const el = ref.current;
    if (!el) return;
    const { html, text } = serialize(el);
    if (!text.trim()) el.innerHTML = '';
    onUpdate({ ...latest.current, text: text.trim() ? text : '', html: text.trim() ? html : '' });
  };

  const applyColor = (hex: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, hex);
    push();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        <select
          value={content.fontFamily || 'EB Garamond'}
          onChange={(e) => onUpdate({ ...content, fontFamily: e.target.value })}
          className="border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input
          type="number"
          value={content.fontSize || 16}
          onChange={(e) => onUpdate({ ...content, fontSize: Number(e.target.value) })}
          className="border border-gray-300 dark:border-gray-700 bg-transparent px-2 py-1 w-16"
          min={10}
          max={72}
        />
        <button
          onClick={() => onUpdate({ ...content, italic: !content.italic })}
          className={`border border-black/20 dark:border-white/25 px-2.5 py-1 italic transition-colors ${content.italic ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`}
        >
          I
        </button>
        <label className="flex items-center gap-2 text-black dark:text-white">
          <input
            type="color"
            defaultValue="#cc0000"
            onChange={(e) => applyColor(e.target.value)}
            className="w-8 h-8 border border-gray-300 dark:border-gray-700 p-0 cursor-pointer bg-transparent"
          />
          <span className="opacity-60">Select words, then pick a colour</span>
        </label>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder="Write your text here..."
        onInput={push}
        onPaste={(e) => {
          e.preventDefault();
          const t = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, t);
        }}
        style={{
          fontFamily: content.fontFamily || 'EB Garamond',
          fontSize: (content.fontSize || 16) / 16 + 'rem',
          fontStyle: content.italic ? 'italic' : 'normal',
        }}
        className="w-full border-b border-black/15 dark:border-white/20 bg-transparent text-black dark:text-white py-2 focus:outline-none focus:border-black dark:focus:border-white transition-colors min-h-[8rem] whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:opacity-40"
      />
    </div>
  );
}
