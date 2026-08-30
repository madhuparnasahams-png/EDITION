'use client';

import { useId } from 'react';

interface ImageBlockProps {
  content: {
    url?: string;
    alt?: string;
    fullBleed?: boolean;
    stickers?: string[];
  };
  onUpdate: (content: any) => void;
}

export default function ImageBlock({ content, onUpdate }: ImageBlockProps) {
  const uploadInputId = useId();
  const stickerInputId = useId();

  const handleImageUpload = async (file: File, folder: string = 'articles') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (folder === 'stickers') {
          // Stickers are overlays, not the main image - keep them in their
          // own array so uploading one never clobbers the article image.
          onUpdate({ ...content, stickers: [...(content.stickers || []), data.url] });
        } else {
          onUpdate({ ...content, url: data.url });
        }
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    }
  };

  const removeSticker = (url: string) => {
    onUpdate({ ...content, stickers: (content.stickers || []).filter((s) => s !== url) });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 p-4">
      {content.url ? (
        <div className="mb-3">
          <img src={content.url} alt={content.alt || ''} className="max-w-full h-auto border border-gray-200 dark:border-gray-700" />
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center mb-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
            className="hidden"
            id={uploadInputId}
          />
          <label htmlFor={uploadInputId} className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
            Click to upload image
          </label>
        </div>
      )}

      <input
        type="text"
        value={content.alt || ''}
        onChange={(e) => onUpdate({ ...content, alt: e.target.value })}
        placeholder="Alt text / caption"
        className="w-full border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm mb-2 focus:outline-none focus:border-black dark:focus:border-white"
      />

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={content.fullBleed || false}
          onChange={(e) => onUpdate({ ...content, fullBleed: e.target.checked })}
        />
        Full-bleed (edge-to-edge, webtoon-style)
      </label>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-bold mb-2">Add Sticker/Doodle (PNG with transparency)</label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
          <input
            type="file"
            accept="image/png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, 'stickers');
            }}
            className="hidden"
            id={stickerInputId}
          />
          <label htmlFor={stickerInputId} className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
            Click to upload PNG sticker
          </label>
        </div>

        {content.stickers && content.stickers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {content.stickers.map((url) => (
              <div key={url} className="relative w-16 h-16 border border-gray-200 dark:border-gray-700">
                <img src={url} alt="Sticker" className="w-full h-full object-contain" />
                <button
                  onClick={() => removeSticker(url)}
                  title="Remove sticker"
                  className="absolute -right-1 -top-1 w-4 h-4 flex items-center justify-center text-[10px] bg-white dark:bg-black border border-gray-300 dark:border-gray-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
