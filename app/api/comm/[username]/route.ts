import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { canViewAccount } from '@/lib/heldAccount';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const creator = await prisma.user.findUnique({ where: { username } });
    if (!creator || !(await canViewAccount(creator))) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const posts = await prisma.commPost.findMany({
      where: { authorId: creator.id },
      orderBy: { createdAt: 'desc' },
      include: {
        author: publicAuthorSelect,
        quotedArticle: {
          select: {
            id: true,
            slug: true,
            title: true,
            featuredImage: true,
            author: publicAuthorSelect,
          },
        },
      },
      take: 50,
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching comm posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
