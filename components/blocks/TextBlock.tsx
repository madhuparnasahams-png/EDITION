'use client';

const FONT_OPTIONS = ['EB Garamond', 'Playfair Display', 'Lora', 'Cormorant Garamond', 'Plus Jakarta Sans', 'Space Grotesk', 'Special Elite', 'Caveat'];

interface TextBlockProps {
  content: {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  onUpdate: (content: any) => void;
}

export default function TextBlock({ content, onUpdate }: TextBlockProps) {
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
          onClick={() => onUpdate({ ...content, bold: !content.bold })}
          className={`border border-black/20 dark:border-white/25 px-2.5 py-1 font-bold transition-colors ${content.bold ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`}
        >
          B
        </button>
        <button
          onClick={() => onUpdate({ ...content, italic: !content.italic })}
          className={`border border-black/20 dark:border-white/25 px-2.5 py-1 italic transition-colors ${content.italic ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`}
        >
          I
        </button>
        <input
          type="color"
          value={content.color || '#000000'}
          onChange={(e) => onUpdate({ ...content, color: e.target.value })}
          className="w-8 h-8 border border-gray-300 dark:border-gray-700 p-0 cursor-pointer bg-transparent"
        />
      </div>
      <textarea
        value={content.text || ''}
        onChange={(e) => onUpdate({ ...content, text: e.target.value })}
        placeholder="Write your text here..."
        rows={4}
        style={{
          fontFamily: content.fontFamily || 'EB Garamond',
          fontSize: (content.fontSize || 16) + 'px',
          fontWeight: content.bold ? 'bold' : 'normal',
          fontStyle: content.italic ? 'italic' : 'normal',
          color: content.color || undefined,
        }}
        className="w-full border-0 border-b border-black/15 dark:border-white/20 bg-transparent text-black dark:text-white py-2 focus:outline-none focus:border-black dark:focus:border-white transition-colors resize-y min-h-[8rem]"
      />
    </div>
  );
}
