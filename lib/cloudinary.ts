import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Uploads a file buffer to Cloudinary.
 * folder: organizes uploads, e.g. "edition/articles", "edition/avatars"
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string
): Promise<{ url: string; publicId: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `edition/${folder}` },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

type Preset = 'pfp' | 'thumbnail' | 'fullBleed' | 'original';

/**
 * Builds a transformed Cloudinary URL for the exact ratios Edition uses,
 * so we resize/crop once at the CDN instead of shipping full-size originals.
 *
 * pfp        - 140x140 square (Spread header)
 * thumbnail  - 4:5 magazine ratio (Spread/Cache content cards)
 * fullBleed  - webtoon-style panel: full width, natural/variable height
 * original   - no transform
 */
export function cloudinaryUrl(publicId: string, preset: Preset): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const base = `https://res.cloudinary.com/${cloudName}/image/upload`;

  switch (preset) {
    case 'pfp':
      return `${base}/w_280,h_280,c_fill,g_face,q_auto,f_auto/${publicId}`;
    case 'thumbnail':
      return `${base}/w_800,h_1000,c_fill,g_auto,q_auto,f_auto/${publicId}`;
    case 'fullBleed':
      return `${base}/w_1200,c_scale,q_auto,f_auto/${publicId}`;
    default:
      return `${base}/q_auto,f_auto/${publicId}`;
  }
}
