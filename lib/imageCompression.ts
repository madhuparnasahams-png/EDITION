// Client-side image resize + re-encode, run before any upload hits
// /api/upload. Cloudinary's free tier is a shared 25-credit/month pool
// where storage AND bandwidth draw from the same total, and bandwidth
// scales with every view - so an uncompressed 4000px camera photo or
// Canva export costs far more than it needs to, every single time it's
// displayed. Shrinking dimensions and re-encoding here is the single
// biggest lever on how far that pool stretches.
//
// PNGs are kept as PNG (lossless) since they're often used for images
// that need transparency (e.g. a logo-style avatar) - only dimensions
// are reduced for those. Everything else is re-encoded as JPEG at the
// given quality, which is where most of the size reduction happens.
export function compressImage(file: File, maxDimension: number, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    // Don't bother compressing tiny files or non-image types - let
    // the upload route's own validation handle the latter.
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        // Already small enough - still worth re-encoding non-PNGs to
        // strip metadata and apply consistent compression, but skip if
        // it's already a JPEG under the size limit to avoid pointless work.
        if (file.type !== 'image/png' && file.size < maxDimension * 1024) {
          resolve(file);
          return;
        }
      }

      const scale = Math.min(1, maxDimension / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fall back to the original rather than fail the upload
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const newName = outputType === 'image/jpeg' ? file.name.replace(/\.\w+$/, '.jpg') : file.name;
          resolve(new File([blob], newName, { type: outputType }));
        },
        outputType,
        outputType === 'image/jpeg' ? quality : undefined
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fall back to the original rather than block the upload
    };

    img.src = objectUrl;
  });
}
