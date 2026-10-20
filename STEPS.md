# After copying the files

## Terminal (project root)
    npm install
    npx prisma generate
    npx prisma db push

Commit the updated package-lock.json.

## Vercel environment variables
- NEXT_PUBLIC_SITE_URL   your real https:// address (plain, not secret)
- ADMIN_PANEL_PASSWORD   a strong password (not 67)
- ADMIN_PANEL_SECRET     random string, 16+ characters
Keep your existing database, Clerk and Cloudinary variables.

## Make yourself admin
Set isAdmin = true on your user (npx prisma studio, or the Neon SQL editor).

## Prisma migrate (only AFTER db push above)
Follow MIGRATE.md.

## Deploy
git add . && git commit -m "update" && git push

## Search
Add your domain in Google Search Console and submit /sitemap.xml.
