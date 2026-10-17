'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  max: number;
  maxLength: number;
  red?: boolean; // red styling for content warnings
  placeholder?: string;
}

const normalize = (raw: string, maxLength: number) =>
  raw.replace(/[<>]/g, '').replace(/^#+/, '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

// Free-form tag entry: pick from suggestions or type your own (Enter or comma to add).
export default function TagInput({ value, onChange, suggestions = [], max, maxLength, red, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const has = (t: string) => value.some((v) => v.toLowerCase() === t.toLowerCase());

  const add = (raw: string) => {
    const t = normalize(raw, maxLength);
    if (!t || has(t) || value.length >= max) return;
    onChange([...value, t]);
  };
  const remove = (t: string) => onChange(value.filter((v) => v !== t));
  const toggle = (t: string) => (has(t) ? onChange(value.filter((v) => v.toLowerCase() !== t.toLowerCase())) : add(t));

  const on = red
    ? 'bg-red-700 text-white border-red-700'
    : 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white';
  const off = red
    ? 'bg-transparent text-red-700 border-red-700/40 hover:border-red-700'
    : 'bg-transparent text-black dark:text-white border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white';

  const customs = value.filter((v) => !suggestions.some((s) => s.toLowerCase() === v.toLowerCase()));

  return (
    <div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`text-xs px-3 py-1.5 border transition-colors duration-200 ${has(s) ? on : off}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        {customs.map((t) => (
          <span key={t} className={`text-xs pl-3 pr-1 py-1 border inline-flex items-center gap-1 animate-pop ${on}`}>
            {red ? '#' : ''}{t}
            <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t}`} className="px-1.5 py-0 leading-none text-inherit"><X size={12} strokeWidth={2} /></button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          maxLength={maxLength}
          disabled={value.length >= max}
          onChange={(e) => {
            if (e.target.value.includes(',')) {
              e.target.value.split(',').forEach(add);
              setDraft('');
            } else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && !draft && customs.length) {
              remove(customs[customs.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) add(draft);
            setDraft('');
          }}
          placeholder={value.length >= max ? `Max ${max}` : placeholder || 'Add your own, press Enter'}
          className="text-sm bg-transparent border-b border-gray-300 dark:border-gray-700 focus:border-black dark:focus:border-white focus:outline-none px-1 py-1 min-w-[10rem] transition-colors"
        />
      </div>
    </div>
  );
}
