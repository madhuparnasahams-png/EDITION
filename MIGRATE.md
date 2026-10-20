# Switching Edition from `db push` to `prisma migrate`

`db push` changes the database but keeps no history. `migrate` keeps a
numbered history of every schema change in `prisma/migrations/`, which you
commit to git. Do this ONCE, in order, from the project root.

Your database already has all the tables (from `db push`), so we "baseline":
record the current schema as migration 0 WITHOUT running it. No data is touched.

## 1. Baseline (once)

Make sure the schema file is the latest and `DATABASE_URL` in `.env` points at
your real database. If it is Neon's pooled URL (host contains `-pooler`), use the
direct URL for this step (the same string without `-pooler`).

Create the baseline SQL (works on Windows, Mac and Linux):

    node -e "const fs=require('fs');fs.mkdirSync('prisma/migrations/0_init',{recursive:true});fs.writeFileSync('prisma/migrations/0_init/migration.sql',require('child_process').execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',{encoding:'utf8'}))"

Tell Prisma it is already applied:

    npx prisma migrate resolve --applied 0_init

Check: `npx prisma migrate status` should say "Database schema is up to date".

Commit the whole `prisma/migrations` folder to git.

## 2. Changing the schema from now on

1. Edit `prisma/schema.prisma`
2. `npm run db:migrate -- --name short_description_of_change`
   (creates a new folder in prisma/migrations and applies it to your dev database)
3. Commit the new migration folder together with the code.

NEVER answer "yes" if `migrate dev` says it needs to RESET the database; stop and ask first.

## 3. Production (Vercel)

After the baseline is committed and pushed, make Vercel apply new migrations on
every deploy. In `package.json` add this script:

    "vercel-build": "prisma migrate deploy && next build"

Do NOT add it before step 1 is finished, or the deploy will fail.

If you use Neon's pooled URL for `DATABASE_URL`, also add a second variable
`DIRECT_URL` (the non-pooler string) and this line to the `datasource` block of
`prisma/schema.prisma`:

    directUrl = env("DIRECT_URL")

Add the Vercel variable first, then the schema line.
