import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

// PATCH /api/profile/card-color - the only customizable branding surface:
// a single background color for the Spread bio card. No external links,
// no accent color system.
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardColor } = await request.json();
    if (!cardColor || !HEX_COLOR_PATTERN.test(cardColor)) {
      return NextResponse.json({ error: 'cardColor must be a hex color like #3A3A3A' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { clerkId: userId },
      data: { cardColor },
      select: { cardColor: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating card color:', error);
    return NextResponse.json({ error: 'Failed to update card color' }, { status: 500 });
  }
}
