import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const MAX_BIO_LENGTH = 280;
const MAX_TAGLINE_LENGTH = 100;

// GET /api/profile - the current user's own editable profile fields.
// Separate from /api/creators/[username], which is the public-facing view.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { bio: true, tagline: true, avatar: true, banner: true, cardColor: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH /api/profile - update the Spread's own display fields. Every field
// is optional so the client can save one at a time (e.g. just the bio) or
// several together; only fields actually present in the body are touched.
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bio, tagline, avatar, banner, cardColor } = body;

    const data: Record<string, string | null> = {};

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > MAX_BIO_LENGTH) {
        return NextResponse.json({ error: `Bio must be a string under ${MAX_BIO_LENGTH} characters` }, { status: 400 });
      }
      data.bio = bio.trim() || null;
    }

    if (tagline !== undefined) {
      if (typeof tagline !== 'string' || tagline.length > MAX_TAGLINE_LENGTH) {
        return NextResponse.json({ error: `Tagline must be a string under ${MAX_TAGLINE_LENGTH} characters` }, { status: 400 });
      }
      data.tagline = tagline.trim() || null;
    }

    // avatar/banner are expected to be Cloudinary URLs returned by
    // /api/upload - not arbitrary strings, so a bare non-empty check is
    // enough here; the upload route already validated the actual file.
    if (avatar !== undefined) {
      if (avatar !== null && typeof avatar !== 'string') {
        return NextResponse.json({ error: 'avatar must be a URL string or null' }, { status: 400 });
      }
      data.avatar = avatar || null;
    }

    if (banner !== undefined) {
      if (banner !== null && typeof banner !== 'string') {
        return NextResponse.json({ error: 'banner must be a URL string or null' }, { status: 400 });
      }
      data.banner = banner || null;
    }

    if (cardColor !== undefined) {
      if (!cardColor || !HEX_COLOR_PATTERN.test(cardColor)) {
        return NextResponse.json({ error: 'cardColor must be a hex color like #3A3A3A' }, { status: 400 });
      }
      data.cardColor = cardColor;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { clerkId: userId },
      data,
      select: { bio: true, tagline: true, avatar: true, banner: true, cardColor: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}