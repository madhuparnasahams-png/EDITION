import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/profile/privacy - current user's own privacy settings
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { privateCache: true, allowFollowers: true, allowMessages: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 });
  }
}

// PATCH /api/profile/privacy - update one or more privacy toggles
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data: { privateCache?: boolean; allowFollowers?: boolean; allowMessages?: boolean } = {};

    for (const key of ['privateCache', 'allowFollowers', 'allowMessages'] as const) {
      if (typeof body[key] === 'boolean') data[key] = body[key];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid privacy fields provided' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { clerkId: userId },
      data,
      select: { privateCache: true, allowFollowers: true, allowMessages: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
}
