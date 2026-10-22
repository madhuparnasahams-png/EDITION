'use client';

import { useEffect, useRef, useState } from 'react';

interface ImageCropperProps {
  file: File;
  aspect: number;      // width / height of the final image, e.g. 4/5, 16/9, 1
  outputWidth: number; // pixels; height follows from aspect
  title?: string;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}

// Drag to position, slide to zoom. What is inside the frame is exactly what
// gets saved, so nothing is cropped behind the creator's back.
export default function ImageCropper({ file, aspect, outputWidth, title = 'Crop', onCancel, onDone }: ImageCropperProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState('');
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (el) setFrame({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const baseScale = natural.w && frame.w ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const scale = baseScale * zoom;
  const dw = natural.w * scale;
  const dh = natural.h * scale;

  const clamp = (x: number, y: number, w = dw, h = dh) => ({
    x: Math.min(0, Math.max(frame.w - w, x)),
    y: Math.min(0, Math.max(frame.h - h, y)),
  });

  // Centre the image once it has loaded and the frame is measured.
  useEffect(() => {
    if (natural.w && frame.w) {
      const s = Math.max(frame.w / natural.w, frame.h / natural.h);
      setZoom(1);
      setOffset({ x: (frame.w - natural.w * s) / 2, y: (frame.h - natural.h * s) / 2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural.w, natural.h, frame.w, frame.h]);

  const changeZoom = (next: number) => {
    // Zoom around the middle of the frame.
    const cx = (frame.w / 2 - offset.x) / scale;
    const cy = (frame.h / 2 - offset.y) / scale;
    const s2 = baseScale * next;
    setZoom(next);
    setOffset(clamp(frame.w / 2 - cx * s2, frame.h / 2 - cy * s2, natural.w * s2, natural.h * s2));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp(drag.current.ox + e.clientX - drag.current.px, drag.current.oy + e.clientY - drag.current.py));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const finish = async () => {
    const img = imgRef.current;
    if (!img || !natural.w) return;
    setSaving(true);
    try {
      const outW = Math.round(outputWidth);
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -offset.x / scale, -offset.y / scale, frame.w / scale, frame.h / scale, 0, 0, outW, outH);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.9));
      if (!blob) throw new Error('Could not crop this image');
      const ext = blob.type === 'image/webp' ? 'webp' : 'png';
      onDone(new File([blob], `cropped.${ext}`, { type: blob.type }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not crop this image');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-black text-black dark:text-white border border-black dark:border-white p-4">
        <h2 className="text-lg mb-3">{title}</h2>
        <p className="text-xs mb-3">Drag the picture to place it. Use the slider to zoom. What you see inside the frame is what gets saved.</p>
        <div
          ref={frameRef}
          className="relative w-full overflow-hidden bg-gray-200 dark:bg-gray-800 select-none"
          style={{ aspectRatio: String(aspect), touchAction: 'none', cursor: 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                width: natural.w ? dw : 'auto',
                height: natural.h ? dh : 'auto',
                maxWidth: 'none',
              }}
            />
          )}
        </div>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full mt-4"
        />
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onCancel} className="ed-btn w-28">Cancel</button>
          <button onClick={finish} disabled={saving || !natural.w} className="ed-btn ed-btn-solid w-28">
            {saving ? 'Saving...' : 'Use crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
