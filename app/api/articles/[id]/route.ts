import { auth } from '@clerk/nextjs/server';
import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/articles/[id] - edit title, description, tags, or issue assignment on an
// already-published article. Deliberately does NOT allow editing blocks or slug - content
// stays locked once published, existing links keep working. Author-only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    if (article.authorId !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own articles' }, { status: 403 });
    }

    const body = await request.json();
    const data: { title?: string; description?: string; tags?: string[]; issueId?: string | null } = {};

    if (body.title !== undefined) {
      if (!body.title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      data.title = body.title.trim();
    }
    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
      }
      data.tags = body.tags;
    }
    if (body.issueId !== undefined) {
      if (body.issueId === null) {
        data.issueId = null;
      } else {
        const issue = await prisma.issue.findUnique({ where: { id: body.issueId } });
        if (!issue) {
          return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
        }
        if (issue.authorId !== user.id) {
          return NextResponse.json({ error: 'You can only publish into your own issues' }, { status: 403 });
        }
        data.issueId = body.issueId;
      }
    }

    const updated = await prisma.article.update({
      where: { id },
      data,
      include: { author: publicAuthorSelect },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
