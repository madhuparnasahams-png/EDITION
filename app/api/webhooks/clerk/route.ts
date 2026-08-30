import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Derives a unique username from Clerk user data. Prefers Clerk's own
// username field; falls back to the email prefix (with a numeric suffix
// on collision) if username auth isn't configured in the Clerk Dashboard.
async function deriveUniqueUsername(preferred: string | null, email: string): Promise<string> {
  const base = (preferred || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 30) || 'user';

  let username = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    suffix += 1;
    username = `${base}${suffix}`;
  }
  return username;
}

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error('Clerk webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        const { id, username, email_addresses, image_url } = evt.data;
        const email = email_addresses?.[0]?.email_address;

        if (!email) {
          console.error('Clerk user.created event missing email:', id);
          break;
        }

        const existing = await prisma.user.findUnique({ where: { clerkId: id } });
        if (existing) break; // Already synced, avoid duplicate on retry

        const finalUsername = await deriveUniqueUsername(username ?? null, email);

        await prisma.user.create({
          data: {
            clerkId: id,
            username: finalUsername,
            email,
            avatar: image_url || null,
          },
        });
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, image_url } = evt.data;
        const email = email_addresses?.[0]?.email_address;

        const existing = await prisma.user.findUnique({ where: { clerkId: id } });
        if (!existing) break; // Nothing to sync yet - user.created will handle it

        await prisma.user.update({
          where: { clerkId: id },
          data: {
            ...(email ? { email } : {}),
            ...(image_url ? { avatar: image_url } : {}),
            // Username intentionally not overwritten here: Edition usernames
            // are public URLs (/c/username) and shouldn't silently change
            // underneath a creator because they edited their Clerk profile.
          },
        });
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        if (!id) break;
        // Cascades to their articles, likes, follows, cache, reports via
        // onDelete: Cascade in the schema.
        await prisma.user.deleteMany({ where: { clerkId: id } });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Clerk webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
