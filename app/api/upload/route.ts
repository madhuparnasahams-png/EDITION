import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

const ALLOWED_FOLDERS = new Set(['articles', 'avatars']);

// Verifies actual file content via magic bytes - the client-supplied
// file.type header is just a form field and is trivially spoofable.
// SVG is deliberately never allowed: it can embed executable script and
// would be a stored-XSS vector if served back as "an image".
function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';

  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'png';

  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38
  ) return 'gif';

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'webp';

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedFolder = (formData.get('folder') as string) || 'articles';
    const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : 'articles';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectImageType(buffer);

    if (!detectedType) {
      return NextResponse.json(
        { error: 'File must be a valid JPEG, PNG, GIF, or WEBP image' },
        { status: 400 }
      );
    }

    const result = await uploadToCloudinary(buffer, folder);

    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
