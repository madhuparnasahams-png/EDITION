import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 max
const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    if (name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'One or more fields exceed the maximum length' }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // DB-based rate limit (not in-memory - this route runs on serverless/edge
    // where in-memory state doesn't persist between requests anyway).
    const recentCount = await prisma.contactMessage.count({
      where: {
        email: email.trim(),
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many messages sent recently. Please try again later.' },
        { status: 429 }
      );
    }

    const entry = await prisma.contactMessage.create({
      data: { name: name.trim(), email: email.trim(), message: message.trim() },
    });

    return NextResponse.json({ success: true, id: entry.id }, { status: 201 });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
