# ADL

Members, events and media pages in one signed-in workspace. Sign-in is email and password.

## Data
- **Members**: name, email, region, stage on the data journey (just getting started, curious, learning, switching careers, entry, mid, professional, other), joined date, active.
- **Events**: title, date, region, turned up, participated (never more than turned up).
- **Media pages**: platform, handle, followers, posts, date recorded.
- Add records in the app or import CSV or Excel (.xlsx) files; use Check file first to see repeats and problems. Overview, Reports and Datasets read the same tables. Export is at `/api/export/<dataset>`.
- The database starts empty. No sample data is seeded.

## Setup
1. `cp .env.example .env`, then set `DATABASE_URL` to a Postgres connection string (a free Supabase project works, or a local Postgres) and `AUTH_SECRET` (`openssl rand -base64 32`). The tables are created automatically on first start.
2. Set `ADL_ADMIN_EMAILS` to your email.
3. Start the app and open `/sign-in`. While nobody has an account, it shows a **Set up ADL** screen. Create the first admin with that email and a password. The screen disappears once it is done.
4. Add everyone else under **Team → Create an account**. ADL generates a temporary password, shown once. Send it to the person privately. They must replace it the first time they sign in.
5. Forgot a password: an admin uses **Reset password** next to that person on the Team page. An admin who forgets their own password needs another admin to reset it. If none can sign in, delete the row from the `users` table and the setup screen returns.
6. Production: set `AUTH_URL` (or `AUTH_TRUST_HOST=true` behind a trusted proxy) and `NEXT_PUBLIC_SITE_URL` to the public https origin, so canonical, sitemap and Open Graph URLs are correct.

Passwords are stored as salted scrypt hashes. Five wrong attempts for one email lock sign-in for that email for 15 minutes (kept in memory, so it resets if the server restarts and is not shared between several copies of the app). There is no public sign-up and no email sending, so password resets are done by an admin.

## Commands
`npm run dev` · `npm run build && npm start` · `npm test` · `npm run typecheck` · `npm run lint`

## Notes
Data lives in Postgres at `DATABASE_URL`, so the app itself keeps no files and any host works. Back up with your database provider's backups or `pg_dump "$DATABASE_URL" > backup.sql`. If you delete the only admin, delete the row from the `users` table and the setup screen returns.
