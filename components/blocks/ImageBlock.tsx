'use client';

import { useId } from 'react';
import { compressImage } from '@/lib/imageCompression';

interface ImageBlockProps {
  content: {
    url?: string;
    alt?: string;
    fullBleed?: boolean;
  };
  onUpdate: (content: any) => void;
}

export default function ImageBlock({ content, onUpdate }: ImageBlockProps) {
  const uploadInputId = useId();

  const handleImageUpload = async (file: File, folder: string = 'articles') => {
    // These can render full-bleed edge-to-edge (the hero feature), so keep
    // more resolution than avatar/thumbnails - 1920px comfortably covers
    // any screen width while still cutting a raw phone photo or Canva
    // export down substantially.
    const compressed = await compressImage(file, 1920);
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('folder', folder);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate({ ...content, url: data.url });
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    }
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
    </div>
  );
}
