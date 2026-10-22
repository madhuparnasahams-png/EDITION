'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Eye, ArrowUp, ArrowDown, Type, ImageIcon, Film, Quote, Minus, X } from '@/components/Icons';
import { textBlockHtml } from '@/lib/textBlock';
import { isAllowedEmbedUrl } from '@/lib/embed';
import VideoEmbed from '@/components/VideoEmbed';
import TextBlock from './blocks/TextBlock';
import ImageBlock from './blocks/ImageBlock';
import VideoBlock from './blocks/VideoBlock';

interface Block {
  id: string;
  type: string;
  content: any;
  order: number;
}

interface BlockEditorProps {
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
}

const BLOCK_TYPES = [
  { type: 'text', label: 'Text', Icon: Type },
  { type: 'image', label: 'Image', Icon: ImageIcon },
  { type: 'video', label: 'Video / Audio', Icon: Film },
  { type: 'quote', label: 'Quote', Icon: Quote },
  { type: 'divider', label: 'Divider', Icon: Minus },
];

const iconBtn =
  'p-1.5 border border-black/20 dark:border-white/25 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-25 disabled:hover:bg-transparent';

function getDefaultContent(type: string) {
  switch (type) {
    case 'text':
      return { text: '', fontFamily: 'EB Garamond', fontSize: 16 };
    case 'image':
      return { url: '', alt: '', fullBleed: false };
    case 'video':
      return { url: '', caption: '' };
    case 'quote':
      return { text: '', author: '' };
    case 'divider':
      return {};
    default:
      return {};
  }
}

export default function BlockEditor({ blocks, setBlocks }: BlockEditorProps) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const renumber = (list: Block[]) => list.map((b, i) => ({ ...b, order: i }));

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      content: getDefaultContent(type),
      order: blocks.length,
    };
    setBlocks(renumber([...blocks, newBlock]));
    setShowTypeMenu(false);
  };

  const updateBlock = (id: string, content: any) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(renumber(blocks.filter((b) => b.id !== id)));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(renumber(next));
  };

  if (previewMode) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setPreviewMode(false)}
          className="mb-6 text-sm border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
        >
          <ArrowLeft size={14} className="inline mr-2 -mt-0.5" />Back to Editor
        </button>
        <Preview blocks={blocks} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs uppercase tracking-widest text-black/60 dark:text-white/60">
          {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
        </span>
        <button
          onClick={() => setPreviewMode(true)}
          className="flex items-center gap-2 text-sm border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
        >
          <Eye size={14} /> Preview
        </button>
      </div>

      {blocks.length === 0 && (
        <div className="border border-dashed border-black/30 dark:border-white/30 py-12 text-center text-sm text-black/60 dark:text-white/60 animate-fade-in">
          Nothing here yet. Add your first block below.
        </div>
      )}

      <div className="flex flex-col gap-5">
        {blocks.map((block, index) => {
          const meta = BLOCK_TYPES.find((t) => t.type === block.type);
          const Icon = meta?.Icon ?? Type;
          return (
            <section key={block.id} className="border border-black/15 dark:border-white/20 animate-slide-up">
              <header className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04]">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-black/70 dark:text-white/70">
                  <Icon size={13} />
                  <span>{meta?.label ?? block.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => moveBlock(index, -1)} disabled={index === 0} title="Move up" aria-label="Move block up" className={iconBtn}>
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} title="Move down" aria-label="Move block down" className={iconBtn}>
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => removeBlock(block.id)}
                    title="Remove block"
                    aria-label="Remove block"
                    className="p-1.5 border border-red-700/40 text-red-700 hover:bg-red-700 hover:text-white"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </header>

              <div className="p-4">
                {block.type === 'text' && <TextBlock content={block.content} onUpdate={(c) => updateBlock(block.id, c)} />}
                {block.type === 'image' && <ImageBlock content={block.content} onUpdate={(c) => updateBlock(block.id, c)} />}
                {block.type === 'video' && <VideoBlock content={block.content} onUpdate={(c) => updateBlock(block.id, c)} />}
                {block.type === 'quote' && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={block.content.text || ''}
                      onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                      placeholder="Quote text"
                      rows={2}
                      className="w-full border-l-4 border-black dark:border-white bg-transparent pl-4 py-2 italic text-lg focus:outline-none resize-none text-black dark:text-white"
                    />
                    <input
                      type="text"
                      value={block.content.author || ''}
                      onChange={(e) => updateBlock(block.id, { ...block.content, author: e.target.value })}
                      placeholder="Attribution (optional)"
                      className="w-full border-b border-black/20 dark:border-white/25 bg-transparent py-1.5 text-sm focus:outline-none focus:border-black dark:focus:border-white transition-colors text-black dark:text-white"
                    />
                  </div>
                )}
                {block.type === 'divider' && (
                  <div className="py-2">
                    <hr className="border-black/40 dark:border-white/40" />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6">
        {showTypeMenu ? (
          <div className="border border-black dark:border-white animate-slide-down">
            <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/15">
              <span className="text-xs uppercase tracking-widest">Add a block</span>
              <button onClick={() => setShowTypeMenu(false)} aria-label="Close" className="p-1"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5">
              {BLOCK_TYPES.map(({ type, label, Icon }) => (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="flex flex-col items-center gap-2 py-5 text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white"
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowTypeMenu(true)}
            className="flex items-center justify-center gap-2 w-full border border-dashed border-black/40 dark:border-white/40 py-3 text-sm hover:border-solid hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white"
          >
            <Plus size={16} /> Add block
          </button>
        )}
      </div>
    </div>
  );
}

function Preview({ blocks }: { blocks: Block[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {blocks.map((block, i) => {
        const prevBlock = blocks[i - 1];
        const isFullBleed = block.type === 'image' && block.content.fullBleed;
        const prevIsFullBleed = prevBlock?.type === 'image' && prevBlock.content.fullBleed;
        const marginTop = i === 0 ? '' : prevIsFullBleed && isFullBleed ? 'mt-0' : 'mt-8';
        return (
          <div key={block.id} className={marginTop}>
            {block.type === 'text' && (
              <div
                style={{
                  fontFamily: block.content.fontFamily || 'EB Garamond',
                  fontSize: ((block.content.fontSize || 16) / 16) + 'rem',
                          fontStyle: block.content.italic ? 'italic' : 'normal',
                  color: block.content.color && block.content.color !== '#000000' ? block.content.color : '#2c2c27',
                }}
                dangerouslySetInnerHTML={{
                  // Already safe HTML - see plainTextToSafeHtml's own comment.
                  __html: textBlockHtml(block.content),
                }}
              />
            )}
            {block.type === 'image' && block.content.url && (
              <div className={isFullBleed ? 'relative left-1/2 -translate-x-1/2 w-screen' : 'relative'}>
                <img
                  src={block.content.url}
                  alt={block.content.alt || ''}
                  className={isFullBleed ? 'w-full h-auto block' : 'w-full h-auto'}
                />
              </div>
            )}
            {block.type === 'video' && block.content.url && isAllowedEmbedUrl(block.content.url) && (
              <div>
                <VideoEmbed url={block.content.url} fullBleed={block.content.fullBleed} />
                {block.content.caption && <p className="text-sm text-black dark:text-white mt-2">{block.content.caption}</p>}
              </div>
            )}
            {block.type === 'quote' && (
              <blockquote className="border-l-4 border-black dark:border-white pl-4 italic text-black dark:text-white">
                "{block.content.text}"
                {block.content.author && <footer className="text-sm mt-2">— {block.content.author}</footer>}
              </blockquote>
            )}
          </div>
        );
      })}
    </div>
  );
}