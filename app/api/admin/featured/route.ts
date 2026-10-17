import { prisma, publicAuthorSelect } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithPassword } from '@/lib/adminGuard';
import { isSafeHttpUrl, cleanTitle } from '@/lib/validation';

const MAX_ITEMS = 12;

// GET /api/admin/featured - all hero items in order
export async function GET() {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  try {
    const items = await prisma.featuredItem.findMany({
      orderBy: { order: 'asc' },
      include: { article: { select: { id: true, title: true, slug: true, featuredImage: true, author: publicAuthorSelect } } },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error listing featured:', error);
    return NextResponse.json({ error: 'Failed to load featured items' }, { status: 500 });
  }
}

// POST /api/admin/featured - add { type:'ARTICLE', articleId } or { type:'IMAGE', imageUrl, title?, linkUrl? }
export async function POST(request: NextRequest) {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  try {
    const body = await request.json();
    const count = await prisma.featuredItem.count();
    if (count >= MAX_ITEMS) {
      return NextResponse.json({ error: `The hero can hold at most ${MAX_ITEMS} items` }, { status: 400 });
    }
    const last = await prisma.featuredItem.findFirst({ orderBy: { order: 'desc' } });
    const order = (last?.order ?? -1) + 1;

    if (body.type === 'ARTICLE') {
      if (typeof body.articleId !== 'string') return NextResponse.json({ error: 'articleId required' }, { status: 400 });
      const article = await prisma.article.findUnique({ where: { id: body.articleId } });
      if (!article || !article.publishedAt) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      const dup = await prisma.featuredItem.findFirst({ where: { articleId: article.id } });
      if (dup) return NextResponse.json({ error: 'Already featured' }, { status: 409 });
      const item = await prisma.featuredItem.create({ data: { type: 'ARTICLE', articleId: article.id, order } });
      return NextResponse.json(item, { status: 201 });
    }

    if (body.type === 'IMAGE') {
      if (!isSafeHttpUrl(body.imageUrl)) return NextResponse.json({ error: 'A valid image URL is required' }, { status: 400 });
      if (body.linkUrl && !isSafeHttpUrl(body.linkUrl) && !(typeof body.linkUrl === 'string' && /^\/(?!\/)/.test(body.linkUrl))) {
        return NextResponse.json({ error: 'Link must be an http(s) URL or a path on Edition' }, { status: 400 });
      }
      const item = await prisma.featuredItem.create({
        data: {
          type: 'IMAGE',
          imageUrl: body.imageUrl,
          title: cleanTitle(body.title),
          linkUrl: body.linkUrl || null,
          order,
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error adding featured item:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

// PUT /api/admin/featured - reorder: { ids: string[] } in the desired order
export async function PUT(request: NextRequest) {
  const r = await requireAdminWithPassword();
  if ('error' in r) return r.error;
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'string') || ids.length > MAX_ITEMS) {
      return NextResponse.json({ error: 'ids must be an array of strings' }, { status: 400 });
    }
    await prisma.$transaction(ids.map((id: string, index: number) => prisma.featuredItem.update({ where: { id }, data: { order: index } })));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error reordering featured:', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
