# Edition update: what to do

Relative to your ORIGINAL files. Paths are from the project root.

## 1. DELETE (1)
- app/api/admin/articles/[id]/feature/route.ts

## 2. ADD new files (28)
- app/admin/featured/page.tsx
- app/api/admin/featured/[id]/route.ts
- app/api/admin/featured/route.ts
- app/api/admin/ping/route.ts
- app/api/admin/unlock/route.ts
- app/api/admin/users/[id]/hide/route.ts
- app/api/admin/users/route.ts
- app/api/articles/[id]/comments/route.ts
- app/api/articles/[id]/hide/route.ts
- app/api/comments/[id]/route.ts
- app/api/featured/route.ts
- app/api/inbox/read-all/route.ts
- app/api/inbox/route.ts
- app/api/inbox/unread-count/route.ts
- app/api/users/search/route.ts
- app/inbox/page.tsx
- components/AdminGate.tsx
- components/CacheIcon.tsx
- components/CommPostContent.tsx
- components/MentionTextarea.tsx
- components/ReportButton.tsx
- components/TagInput.tsx
- lib/adminAuth.ts
- lib/adminGuard.ts
- lib/heldAccount.ts
- lib/mentions.ts
- lib/redTags.ts
- lib/useAdminIdleLock.ts

## 3. REPLACE existing files (43)
- app/admin/page.tsx
- app/api/admin/articles/[id]/takedown/route.ts
- app/api/admin/reports/[id]/resolve/route.ts
- app/api/admin/reports/route.ts
- app/api/articles/[id]/route.ts
- app/api/articles/[username]/[slug]/route.ts
- app/api/articles/route.ts
- app/api/articles/search/route.ts
- app/api/cache/route.ts
- app/api/comm/[username]/route.ts
- app/api/comm/route.ts
- app/api/creators/[username]/articles/route.ts
- app/api/creators/[username]/issues/route.ts
- app/api/creators/[username]/route.ts
- app/api/creators/suggested/route.ts
- app/api/feed/mixed/route.ts
- app/api/follow/route.ts
- app/api/issues/[id]/route.ts
- app/api/issues/route.ts
- app/api/likes/route.ts
- app/api/profile/privacy/route.ts
- app/api/reading-progress/route.ts
- app/api/reports/route.ts
- app/api/upload/route.ts
- app/api/webhooks/clerk/route.ts
- app/c/[username]/p/[slug]/page.tsx
- app/c/[username]/page.tsx
- app/dashboard/page.tsx
- app/globals.css
- app/page.tsx
- app/settings/page.tsx
- components/BlockEditor.tsx
- components/ContentActions.tsx
- components/FeaturedCarousel.tsx
- components/Nav.tsx
- components/blocks/ImageBlock.tsx
- components/blocks/TextBlock.tsx
- components/blocks/VideoBlock.tsx
- lib/prisma.ts
- lib/tags.ts
- lib/validation.ts
- prisma/schema.prisma
- proxy.ts

## 4. After copying
- lib/imageCompression.ts is KEPT (unchanged from your original)
- npx prisma generate && npx prisma db push
- Vercel env: ADMIN_PANEL_PASSWORD and a NEW random ADMIN_PANEL_SECRET (16+ chars)
- Set isAdmin = true on your user row
- package.json is unchanged
