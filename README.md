# Nightmare Library: Cloudflare Pages Deployment Guide

## What You're Building

Nightmare Library is a single-user digital library for EPUB/PDF books deployed on **Cloudflare Pages** with:
- **Database Sharding**: 10 D1 databases (5GB total storage)
- **Cascading Storage**: 10 backup providers (auto-failover if one fails)
- **Authentication**: Login + optional 2FA
- **AI Features**: Book summaries, recommendations, reading analytics

---

## ⚡ Quick Start (5 minutes)

### 1. Deploy with GitHub (Easiest)

This is your fallback storage—it works immediately.

```bash
# Create a GitHub Personal Access Token:
# 1. Go to github.com → Settings → Developer settings → Personal access tokens
# 2. Click "Generate new token (classic)"
# 3. Check: repo (full control of private repositories)
# 4. Copy the token
```

Set this secret in **Cloudflare Pages Dashboard**:
- Go to: Pages > nightmare-library > Settings > Environment variables
- **Production** environment:
  - Name: `GITHUB_TOKEN` → Value: `ghp_xxxxxxx...`
  - Name: `GITHUB_OWNER` → Value: `your-username`

That's it! Your library now has storage. ✅

---

## 🔧 Core Setup (15 minutes)

### Step 1: Create 10 D1 Databases

In **Cloudflare Dashboard** → **D1**:

Create 10 databases named:
```
nightmare-library-db-1
nightmare-library-db-2
nightmare-library-db-3
nightmare-library-db-4
nightmare-library-db-5
nightmare-library-db-6
nightmare-library-db-7
nightmare-library-db-8
nightmare-library-db-9
nightmare-library-db-10
```

For each, copy the **Database ID**.

### Step 2: Create KV Namespaces

In **Cloudflare Dashboard** → **KV Namespaces**:

Create 3 namespaces:
```
KV_SESSIONS    (stores login sessions)
KV_CACHE       (caches API responses)
KV_RATE_LIMIT  (tracks rate limits)
```

For each, copy the **Namespace ID** and **Preview ID**.

### Step 3: Add Bindings to Cloudflare Pages

In **Cloudflare Dashboard** → **Pages** → **nightmare-library** → **Settings** → **Functions** → **D1 database bindings**:

Add all 10 databases:
```
DB_1   → nightmare-library-db-1
DB_2   → nightmare-library-db-2
... (repeat for DB_3 through DB_10)
```

Add KV bindings:
```
KV_SESSIONS   → (KV namespace ID)
KV_CACHE      → (KV namespace ID)
KV_RATE_LIMIT → (KV namespace ID)
```

### Step 4: Initialize Database Schemas

Using **Cloudflare Wrangler CLI**:

```bash
# For each database, run:
wrangler d1 execute nightmare-library-db-1 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-2 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-3 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-4 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-5 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-6 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-7 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-8 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-9 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-10 --remote --file=migrations/schema.sql
```

### Step 5: Set Required Secrets

In **Cloudflare Dashboard** → **Pages** → **nightmare-library** → **Settings** → **Environment variables**:

**Production environment:**
```
PASSWORD   = your-login-password (min 8 characters)
JWT_SECRET = (random 64-char string: openssl rand -hex 32)
```

### Step 6: Deploy

Push to GitHub:
```bash
git push origin main
```

Cloudflare Pages will automatically build and deploy. ✅

---

## 🎯 Add Storage Providers (Optional)

Your GitHub storage is active. To add backups (so if GitHub fails, the system tries the next provider):

### Easiest: Dropbox (2GB free)

1. Go to: https://www.dropbox.com/developers/apps
2. Create app → Choose "Scoped access" → "Full Dropbox" → "App folder"
3. Generate access token
4. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   DROPBOX_ACCESS_TOKEN = sl_xxxxx...
   ```

### Medium: Google Drive (15GB free)

1. Go to: https://console.cloud.google.com/
2. Create OAuth 2.0 credentials (Desktop app)
3. Get your access token (requires OAuth flow)
4. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   GDRIVE_ACCESS_TOKEN = ya29_xxxxx...
   GDRIVE_FOLDER_ID = (optional folder ID)
   ```

### Medium: OneDrive (5GB free)

1. Register app at: https://portal.azure.com/
2. Get Microsoft Graph OAuth token
3. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   ONEDRIVE_ACCESS_TOKEN = EwAWA8l6BAAURSN1OzQ...
   ONEDRIVE_FOLDER_ID = (optional folder ID)
   ```

### Medium: Box (10GB free)

1. Go to: https://app.box.com/developers/console
2. Create custom app → OAuth 2.0
3. Generate access token
4. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   BOX_ACCESS_TOKEN = xxxxx...
   BOX_FOLDER_ID = (optional folder ID)
   ```

### Medium: pCloud (10GB free)

1. Go to: https://my.pcloud.com/
2. Settings → Applications → Create app
3. Get OAuth access token
4. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   PCLOUD_ACCESS_TOKEN = xxxxx...
   PCLOUD_FOLDER_ID = (optional folder ID)
   ```

### Medium: Yandex Disk (10GB free)

1. Go to: https://oauth.yandex.com/
2. Create OAuth app
3. Get access token
4. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   YANDEX_ACCESS_TOKEN = xxxxx...
   YANDEX_PATH = NightmareLibrary (optional folder path)
   ```

### Medium: Koofr (10GB free)

1. Go to: https://koofr.eu/
2. Settings → Apps → Create app
3. Get OAuth access token
4. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   KOOFR_ACCESS_TOKEN = xxxxx...
   KOOFR_MOUNT_ID = primary (optional, default is primary)
   KOOFR_PATH = NightmareLibrary (optional path)
   ```

### Advanced: Backblaze B2 (10GB free)

1. Go to: https://www.backblaze.com/b2/cloud-storage.html
2. Create account
3. Create bucket for "nightmare-library"
4. Generate application key
5. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   B2_KEY_ID = 0015abc123xxxxx
   B2_APPLICATION_KEY = 0015abc123xxxxx (keep secret!)
   B2_BUCKET_ID = abcdef123456...
   B2_BUCKET_NAME = nightmare-library
   ```

### Advanced: Mega.nz (20GB free)

⚠️ **WARNING**: Mega only allows ONE library account at a time.

1. Create a Mega.nz account (separate from personal account)
2. In **Cloudflare Pages** → **Environment variables** → **Production**:
   ```
   MEGA_EMAIL = library@example.com
   MEGA_PASSWORD = your-mega-password
   MEGA_FOLDER_ID = (optional folder ID)
   ```

---

## 🔍 How It Works

### Database Sharding

Books are distributed across 10 databases using **consistent hashing**:

```
Book ID "book_123" → Hash → Database 3 (DB_3)
Book ID "book_456" → Hash → Database 7 (DB_7)
```

When you fetch a book, the system automatically queries the right database. List operations query all 10 databases and combine results.

### Storage Failover

When you upload a book:

1. Try Google Drive
2. If Google Drive fails → Try Dropbox
3. If Dropbox fails → Try OneDrive
4. ... (continues through all 10 providers)
5. Finally → GitHub (guaranteed to work)

If any provider fails, the system automatically tries the next one.

---

## 🛡️ Security Notes

### Secrets Checklist

✅ **NEVER commit secrets to GitHub**
✅ **Always set via Cloudflare Dashboard** (not in code)
✅ **Rotate tokens periodically**
✅ **Use least-privilege access** (limit scopes when possible)

### Storage Provider Best Practices

- **Google Drive**: Limit to specific folder
- **Dropbox**: Use app-specific folders
- **GitHub**: Use Personal Access Token with repo scope only
- **Mega**: Use dedicated email, strong password
- **B2**: Rotate application keys monthly

---

## 🐛 Debugging

### Check Which Database a Book Uses

```javascript
const router = createDatabaseRouter(env);
const dbIndex = router.getDbIndex(bookId);
console.log(`Book stored in: DB_${dbIndex + 1}`);
```

### Test a Specific Provider

Books are stored in priority order. To verify a provider is working:
1. Upload a test book
2. Check Cloudflare Pages logs
3. Search for the provider name in logs

### View Database Sizes

In **Cloudflare Dashboard** → **D1** → Click each database to see storage used.

---

## 📋 Checklist

- [ ] Created 10 D1 databases
- [ ] Created 3 KV namespaces
- [ ] Added D1 bindings to Cloudflare Pages
- [ ] Added KV bindings to Cloudflare Pages
- [ ] Ran schema migrations on all 10 databases
- [ ] Set `PASSWORD` and `JWT_SECRET` secrets
- [ ] Set `GITHUB_TOKEN` and `GITHUB_OWNER` (minimum)
- [ ] Pushed to GitHub
- [ ] Tested book upload → check if it appears in list
- [ ] (Optional) Added additional storage providers

---

## 💡 Tips

- **Start with GitHub storage only** — it's simple and guaranteed to work
- **Add other providers later** — you can add them anytime
- **Test uploads early** — verify storage is working before adding features
- **Monitor database sizes** — spread books across databases to avoid hitting 500MB limits

---

## Questions?

Check `wrangler.toml` for config comments, or see `functions/db-router.ts` for the sharding logic.
