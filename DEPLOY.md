# Deploying ADL

ADL is one container plus one Postgres database. The database holds all your data, so the container can be restarted, rebuilt or moved without losing anything.

## 1. The database (Supabase)
1. Create a Supabase project and note the database password you set.
2. Click **Connect** → **Direct** → choose **Session pooler** and copy the `postgresql://...` string.
3. Replace `[YOUR-PASSWORD]` in it with your password. This string is your `DATABASE_URL`. Keep it secret.

The tables are created automatically the first time ADL starts. Nothing else to set up.

## 2. The settings (environment variables)

| Name | Value |
|---|---|
| `DATABASE_URL` | The Postgres connection string from step 1. |
| `AUTH_SECRET` | A long random string. Make one with `openssl rand -base64 32`. Never change it casually: changing it signs everyone out. |
| `ADL_ADMIN_EMAILS` | The email that is allowed to create the first admin account. |
| `AUTH_URL` | The public address, for example `https://adl.example.com` (no trailing slash). |
| `NEXT_PUBLIC_SITE_URL` | The same public address. Set it as a **build** setting (a Docker build argument), then rebuild. |

Already set inside the container: `AUTH_TRUST_HOST=true` and port `3000`. HTTPS is needed for safe sign-in cookies, and most hosts provide it automatically.

## 3. Running it
**On Render:** create a Web Service from the GitHub repo, choose the Docker runtime, add the settings above under Environment, and deploy. No disk is needed.

**On any machine with Docker:**
```bash
git clone <your repo> adl && cd adl
docker build -t adl --build-arg NEXT_PUBLIC_SITE_URL=https://your-address .
docker run -d --name adl --restart unless-stopped -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e ADL_ADMIN_EMAILS="you@example.com" \
  -e AUTH_URL="https://your-address" \
  adl
```
Put a web server that provides HTTPS (such as Caddy) in front of port 3000.

Run **one copy** only: the failed-sign-in lockout is counted in memory per copy.

## After the first start
1. Open the address. You will see **Set up ADL**.
2. Enter the email from `ADL_ADMIN_EMAILS` and choose a password (at least 10 characters).
3. Add everyone else under **Team → Create an account**. Send each person their temporary password privately.
4. Import data under **Data sources**. Use **Check file** first.

## Backups
Supabase's free plan has limited backups, so take your own now and then:
```bash
pg_dump "$DATABASE_URL" > adl-backup-$(date +%F).sql
```
Keep copies somewhere other than the database host.

## Updating
Pull the new code and redeploy. Tables are created if missing; existing data is untouched.

## Free-tier behaviour (as far as I know, check each provider)
Render's free web service sleeps when idle, so the first visit afterwards is slow. Supabase's free projects can pause after about a week without activity and must be resumed from their dashboard.

## What this guide has not been tested on
The app was tested against a real local Postgres 16 (sign-in, import, reports, export), but this guide has not been run on Render or Supabase, and the Docker image itself has not been built.
