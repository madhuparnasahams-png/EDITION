import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets, but keep matching if a
    // search param slipped in.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for our own API routes.
    '/(api|trpc)(.*)',
    // Always run for Clerk's own frontend-API proxy path - clerk-js is
    // self-hosted through this same-origin path by @clerk/nextjs v7+, and
    // without this the script 404s, Clerk JS never loads, and every page
    // wrapped in <ClerkProvider> (i.e. the whole app) renders blank.
    '/__clerk/(.*)',
  ],
};