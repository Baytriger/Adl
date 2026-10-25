# Deploying ADL

ADL runs as one container. It needs three things from any host:

1. **A persistent disk mounted at `/data`.** The whole database is the file `/data/adl.db`. Without a disk, every restart erases your data.
2. **These settings** (environment variables):

   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | A long random string. Make one with `openssl rand -base64 32`. Keep it secret and never change it casually: changing it signs everyone out. |
   | `ADL_ADMIN_EMAILS` | The email that is allowed to create the first admin account. |
   | `AUTH_URL` | The public address, for example `https://adl.example.com` (no trailing slash). |
   | `NEXT_PUBLIC_SITE_URL` | The same public address. Set it as a **build** setting (a Docker build argument), then rebuild. |

   Already set inside the container: `DATABASE_URL=file:/data/adl.db`, `AUTH_TRUST_HOST=true`, port `3000`.
3. **HTTPS.** Most hosts provide it automatically. Sign-in cookies are only safe over HTTPS.

Run **one copy only** (no replicas). SQLite is a single file, so two copies would fight over it.

## After the first start
1. Open the address. You will see **Set up ADL**.
2. Enter the email from `ADL_ADMIN_EMAILS` and choose a password (at least 10 characters).
3. Add everyone else under **Team → Create an account**. Send each person their temporary password privately.
4. Import data under **Data sources**. Use **Check file** first.

## On a rented server (any Linux machine with Docker)
```bash
git clone <your repo> adl && cd adl
docker build -t adl --build-arg NEXT_PUBLIC_SITE_URL=https://your-address .
docker run -d --name adl --restart unless-stopped -p 3000:3000 \
  -v adl-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e ADL_ADMIN_EMAILS="you@example.com" \
  -e AUTH_URL="https://your-address" \
  adl
```
Put a web server that provides HTTPS (such as Caddy) in front of port 3000. Save the `AUTH_SECRET` you generated somewhere safe: if you re-run the command with a new one, everyone is signed out.

## Backups
Copy the database file regularly and keep copies somewhere other than the server:
```bash
docker exec adl node -e "require('better-sqlite3')('/data/adl.db').backup('/data/backup.db').then(()=>console.log('ok'))"
docker cp adl:/data/backup.db ./adl-backup-$(date +%F).db
```
To restore, stop the container, put the copy back as `/data/adl.db`, and start it again.

## Updating
Pull the new code, rebuild the image, and start it again with the same disk and settings. The database is upgraded automatically on start.

## What this guide has not been tested on
The container steps were checked by hand (install, build, remove dev dependencies, start, create the database), but this guide has not been run on a real host, and the Docker image itself has not been built.
