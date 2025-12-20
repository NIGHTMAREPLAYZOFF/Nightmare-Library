# Nightmare Library: Cloudflare Pages Deployment Guide

**Nightmare Library** is a single-user digital library for EPUB/PDF books deployed on Cloudflare Pages with authentication, database sharding, and cascading cloud storage backup.

---

## ✨ What You Get

- **Database Sharding**: 10 D1 databases (5GB total storage)
- **Cascading Storage**: 9 cloud storage providers with automatic failover
- **Authentication**: Login + optional 2FA
- **AI Features**: Book summaries, recommendations, reading analytics
- **Obsidian Theme**: Dark, minimalist design

---

# 🚀 Quick Start: Deploy in 10 Minutes

## Step 1: Set Required Secrets (2 min)

In **Cloudflare Dashboard** → **Pages** → **nightmare-library** → **Settings** → **Environment variables** → **Production**:

Add these secrets:

```
PASSWORD        = your-login-password (min 8 characters)
JWT_SECRET      = (run: openssl rand -hex 32)
GITHUB_TOKEN    = ghp_xxxxx...
GITHUB_OWNER    = your-github-username
```

**How to get GITHUB_TOKEN (no credit card needed):**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Check: `repo` (full control)
4. Copy token
5. Paste in Cloudflare Dashboard

Done! Your library now has storage. ✅

---

## Step 2: Create KV Namespaces (3 min)

In **Cloudflare Dashboard** → **KV Namespaces**:

Click **Create namespace** three times:
- `KV_SESSIONS` (stores login sessions)
- `KV_CACHE` (caches API responses)
- `KV_RATE_LIMIT` (tracks rate limits)

For each, copy the **Namespace ID** and **Preview ID**.

---

## Step 3: Create 10 D1 Databases (3 min)

In **Cloudflare Dashboard** → **D1**:

Click **Create database** ten times. Name them:
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

---

## Step 4: Add Bindings to Cloudflare Pages (2 min)

In **Cloudflare Dashboard** → **Pages** → **nightmare-library** → **Settings** → **Functions**:

### D1 Database Bindings

Click **Add binding** for each database:
```
DB_1   → nightmare-library-db-1
DB_2   → nightmare-library-db-2
DB_3   → nightmare-library-db-3
DB_4   → nightmare-library-db-4
DB_5   → nightmare-library-db-5
DB_6   → nightmare-library-db-6
DB_7   → nightmare-library-db-7
DB_8   → nightmare-library-db-8
DB_9   → nightmare-library-db-9
DB_10  → nightmare-library-db-10
```

### KV Namespace Bindings

Click **Add binding** for each KV namespace:
```
KV_SESSIONS   → (copy Namespace ID)
KV_CACHE      → (copy Namespace ID)
KV_RATE_LIMIT → (copy Namespace ID)
```

---

## Step 5: Initialize Database Schemas (2 min)

Using **Wrangler CLI**:

```bash
# Copy and paste each line:
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

---

## Step 6: Deploy (1 min)

Push to GitHub:
```bash
git push origin main
```

Cloudflare Pages automatically builds and deploys. ✅

---

## 📋 Checklist

- [ ] Set `PASSWORD` and `JWT_SECRET` secrets
- [ ] Set `GITHUB_TOKEN` and `GITHUB_OWNER` secrets
- [ ] Created 3 KV namespaces
- [ ] Created 10 D1 databases
- [ ] Added D1 bindings to Cloudflare Pages
- [ ] Added KV bindings to Cloudflare Pages
- [ ] Ran schema migrations on all 10 databases
- [ ] Pushed to GitHub

**✅ Done! Your library is live.**

---

# 🎯 Optional: Add More Storage Providers

Your GitHub storage works. Want backups? Add these providers in this order (easiest → hardest, **all free, no credit card required**).

## 1️⃣ Dropbox (Easiest - 2GB free)

**Setup time: 2 minutes**

1. Go to: https://www.dropbox.com/developers/apps
2. Click **Create app**
3. Choose: **Scoped access** → **App folder** → Create
4. Go to **Permissions** tab → Check `files.content.write` + `files.content.read`
5. Go to **Settings** tab → **Generate token** → Copy it

**API Key Path**: https://www.dropbox.com/developers/apps → Your app → Settings → Generate access token

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
DROPBOX_ACCESS_TOKEN = sl_xxxxx...
```

✅ Done!

---

## 2️⃣ OneDrive (Easy - 5GB free)

**Setup time: 3 minutes**

1. Go to: https://login.microsoftonline.com/ → Sign in
2. Open: https://myapps.microsoft.com/ → Look for "OneDrive"
3. Right-click → **Open in new tab** → Sign in
4. Get OAuth token:
   - Go to: https://developer.microsoft.com/graph/graph-explorer
   - Sign in → Click **Access token**
   - Copy the token shown

**API Key Path**: https://developer.microsoft.com/graph/graph-explorer → Sign in with Microsoft account → Access token (shown in response headers)

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
ONEDRIVE_ACCESS_TOKEN = EwAWA8l6BAAURSN1OzQ...
```

✅ Done!

---

## 3️⃣ pCloud (Easy - 10GB free)

**Setup time: 2 minutes**

1. Go to: https://myaccount.pcloud.com/
2. Settings → Apps & security → Authorize an app
3. Generate access token → Copy it

**API Key Path**: https://myaccount.pcloud.com/settings → Apps & security → Generate token

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
PCLOUD_ACCESS_TOKEN = xxxxx...
```

✅ Done!

---

## 4️⃣ Box (Easy - 10GB free)

**Setup time: 3 minutes**

1. Go to: https://app.box.com/developers/console
2. **Create New App** → **Custom app** → OAuth 2.0
3. Go to **Configuration** tab
4. Get your **Client ID** and **Client Secret**
5. Use OAuth to get access token

**API Key Path**: https://app.box.com/developers/console → Create New App → OAuth 2.0 → Configuration → Get access token via OAuth flow

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
BOX_ACCESS_TOKEN = xxxxx...
BOX_FOLDER_ID    = 0 (optional, defaults to root)
```

✅ Done!

---

## 5️⃣ Yandex Disk (Medium - 10GB free)

**Setup time: 3 minutes**

1. Go to: https://oauth.yandex.com/
2. **Create new app** → Fill details
3. Get **OAuth token** from your app
4. Copy access token

**API Key Path**: https://oauth.yandex.com/ → Create new app → Get access token

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
YANDEX_ACCESS_TOKEN = AQAxxxxx...
YANDEX_PATH         = NightmareLibrary (optional folder path)
```

✅ Done!

---

## 6️⃣ Koofr (Medium - 10GB free)

**Setup time: 3 minutes**

1. Go to: https://app.koofr.eu/
2. Settings → Integrations
3. Create API token → Copy it

**API Key Path**: https://app.koofr.eu/ → Settings → Integrations → Create token

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
KOOFR_ACCESS_TOKEN = xxxxx...
KOOFR_MOUNT_ID     = primary (optional, default is "primary")
KOOFR_PATH         = NightmareLibrary (optional folder path)
```

✅ Done!

---

## 7️⃣ Mega (Medium - 20GB free)

**Setup time: 3 minutes**

⚠️ **Important**: Use a dedicated email/password (not your personal Mega account).

1. Create account at: https://mega.nz/
2. Use a separate email: `library-backup@example.com`
3. Set a strong password

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
MEGA_EMAIL     = library-backup@example.com
MEGA_PASSWORD  = your-mega-password
MEGA_FOLDER_ID = (optional folder ID)
```

✅ Done!

---

## 8️⃣ Backblaze B2 (Medium - 10GB free)

**Setup time: 3 minutes**

Backblaze B2 is a cloud storage service (NOT self-hosted) with an S3-compatible API.

1. Go to: https://www.backblaze.com/b2/
2. Click **Sign Up** → Create account (no credit card needed)
3. Create a bucket:
   - Dashboard → **Buckets** → **Create a bucket**
   - Type: **Private**
   - Copy the **Bucket ID**
4. Generate application key:
   - **Account Settings** → **App Keys**
   - Click **Add Application Key**
   - Copy **Key ID** and **Application Key**

**API Key Path**: https://www.backblaze.com/b2/ → Account Settings → App Keys → Add Application Key

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
B2_KEY_ID         = 0015abc123xxxxx
B2_APPLICATION_KEY = 0015abc123xxxxx
B2_BUCKET_ID      = abcdef123456...
B2_BUCKET_NAME    = your-bucket-name
```

✅ Done!

---

## 9️⃣ CloudGate (Medium - 100GB free)

**Setup time: 2 minutes**

CloudGate is a simple cloud storage service with 100GB free and no credit card required.

1. Go to: https://www.cloudgate-app.com/
2. Click **Sign Up** → Create account
3. Once logged in, get your API token from Settings
4. Copy your email and API token

**API Key Path**: https://www.cloudgate-app.com/ → Sign Up → Once logged in → Settings → API token

In **Cloudflare Pages** → **Environment variables** → **Production**:
```
CLOUDGATE_EMAIL = your-email@example.com
CLOUDGATE_TOKEN = your-api-token
```

✅ Done!

---

## 🔄 How Storage Failover Works

When you upload a book:

1. Try **Dropbox**
2. If fails → Try **OneDrive**
3. If fails → Try **pCloud**
4. If fails → Try **Box**
5. If fails → Try **Yandex**
6. If fails → Try **Koofr**
7. If fails → Try **Mega**
8. If fails → Try **Backblaze B2**
9. If fails → Try **CloudGate**
10. If fails → Use **GitHub** (guaranteed fallback)

If any provider fails, the system automatically tries the next one. ✅

---

## 🔒 Security Notes

✅ **Secrets stored in Cloudflare Dashboard** (encrypted)  
✅ **Never committed to GitHub**  
✅ **Rotated periodically**  
✅ **Least-privilege access tokens**  

**Example:**
- Dropbox: Limited to app folder only
- Mega: Dedicated email, strong password
- GitHub: Read/write repo scope only

---

## 🛠️ How Database Sharding Works

Books are distributed across 10 databases using **consistent hashing**:

```
Book ID "book_123" → Hash function → Database 3 (DB_3)
Book ID "book_456" → Hash function → Database 7 (DB_7)
```

When you fetch a book, the system automatically queries the right database.

**List operations** query all 10 databases and combine results.

---

## 🐛 Debugging

### Check Database Sizes
**Cloudflare Dashboard** → **D1** → Click each database

### View Storage Provider Logs
**Cloudflare Pages** → **nightmare-library** → **Deployments** → Click latest → **Logs**

### Test Upload
1. Login
2. Upload a test book
3. Check logs for provider attempts
4. Verify book appears in list

---

## 📚 Next Steps

1. Login at your deployed URL
2. Upload a test EPUB/PDF
3. Verify it appears in your library
4. Optionally add storage provider backups

**Questions?** Check `functions/db-router.ts` for sharding logic or `wrangler.toml` for configuration reference.
