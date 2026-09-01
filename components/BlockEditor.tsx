'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Trash2, Eye } from 'lucide-react';
import DOMPurify from 'dompurify';
import { plainTextToSafeHtml } from '@/lib/textBlock';
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
  { type: 'text', label: 'Text' },
  { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video/Audio' },
  { type: 'quote', label: 'Quote' },
  { type: 'divider', label: 'Divider' },
];

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

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      content: getDefaultContent(type),
      order: blocks.length,
    };
    setBlocks([...blocks, newBlock]);
    setShowTypeMenu(false);
  };

  const updateBlock = (id: string, content: any) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  if (previewMode) {
    return (
      <div>
        <button
          onClick={() => setPreviewMode(false)}
          className="mb-6 text-sm border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
        >
          ← Back to Editor
        </button>
        <Preview blocks={blocks} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setPreviewMode(true)}
          className="flex items-center gap-2 text-sm border border-black dark:border-white px-4 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
        >
          <Eye size={14} /> Preview
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {blocks.map((block) => (
          <div key={block.id} className="relative group">
            <button
              onClick={() => removeBlock(block.id)}
              className="absolute -right-2 -top-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 p-1 opacity-0 group-hover:opacity-100 transition z-10"
              title="Remove block"
            >
              <Trash2 size={14} />
            </button>

            {block.type === 'text' && (
              <TextBlock content={block.content} onUpdate={(c) => updateBlock(block.id, c)} />
            )}
            {block.type === 'image' && (
              <ImageBlock content={block.content} onUpdate={(c) => updateBlock(block.id, c)} />
            )}
            {block.type === 'video' && (
              <VideoBlock content={block.content} onUpdate={(c) => updateBlock(block.id, c)} />
            )}
            {block.type === 'quote' && (
              <div className="border border-gray-200 dark:border-gray-700 p-4">
                <textarea
                  value={block.content.text || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                  placeholder="Quote text"
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 mb-2 italic focus:outline-none focus:border-black dark:focus:border-white resize-none"
                />
                <input
                  type="text"
                  value={block.content.author || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, author: e.target.value })}
                  placeholder="Attribution (optional)"
                  className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">"{block.content.text || '(empty)'}"</div>
              </div>
            )}
            {block.type === 'divider' && (
              <div className="border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
                <hr className="w-full border-gray-400 dark:border-gray-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative mt-6">
        <button
          onClick={() => setShowTypeMenu((v) => !v)}
          className="flex items-center gap-2 border border-black px-4 py-2 text-sm hover:bg-black hover:text-white transition"
        >
          <Plus size={16} /> Add Block <ChevronDown size={14} />
        </button>
        {showTypeMenu && (
          <div className="absolute left-0 mt-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 shadow-lg z-10 min-w-[160px]">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-900 transition"
              >
                {bt.label}
              </button>
            ))}
          </div>
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
                  fontSize: block.content.fontSize || 16,
                  fontWeight: block.content.bold ? 'bold' : 'normal',
                  fontStyle: block.content.italic ? 'italic' : 'normal',
                  color: block.content.color || '#000000',
                }}
                dangerouslySetInnerHTML={{
                  __html: typeof window !== 'undefined' ? DOMPurify.sanitize(plainTextToSafeHtml(block.content.text || '')) : '',
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
                {block.content.caption && <p className="text-sm text-gray-600 mt-2">{block.content.caption}</p>}
              </div>
            )}
            {block.type === 'quote' && (
              <blockquote className="border-l-4 border-black pl-4 italic text-gray-700">
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
