'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
}

interface Suggestion { username: string; avatar: string | null }

// Textarea with @username autocomplete (debounced lookup against /api/users/search).
export default function MentionTextarea({ value, onChange, placeholder, maxLength, rows = 3, className = '' }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const detect = (text: string, caret: number) => {
    const m = /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{0,30})$/.exec(text.slice(0, caret));
    setQuery(m ? m[2] : null);
  };

  useEffect(() => {
    if (query === null || query.length < 1) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setSuggestions(Array.isArray(d) ? d : []))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const pick = (username: string) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([A-Za-z0-9_]{0,30})$/, `@${username} `);
    const next = before + value.slice(caret);
    onChange(maxLength ? next.slice(0, maxLength) : next);
    setQuery(null);
    setSuggestions([]);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyUp={(e) => detect(e.currentTarget.value, e.currentTarget.selectionStart)}
        className={className}
      />
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-black border border-black dark:border-white list-none p-0 m-0 animate-pop">
          {suggestions.map((s) => (
            <li key={s.username}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s.username);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                {s.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-black dark:bg-white inline-block" />
                )}
                @{s.username}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
