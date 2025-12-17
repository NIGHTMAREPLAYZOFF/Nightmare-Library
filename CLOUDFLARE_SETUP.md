# Nightmare Library - Cloudflare Pages Setup Guide

Complete guide to deploying Nightmare Library on Cloudflare Pages with 10 cascading storage providers.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Create Cloudflare Resources](#1-create-cloudflare-resources)
4. [Configure Storage Providers](#2-configure-storage-providers)
5. [Set Up Secrets](#3-set-up-secrets)
6. [Deploy to Cloudflare Pages](#4-deploy-to-cloudflare-pages)
7. [Storage Cascading Logic](#storage-cascading-logic)
8. [Testing Locally](#testing-locally)
9. [Database Schema](#database-schema)
10. [Security Features](#security-features)

## Overview

This setup uses a cascading storage system with **10 free providers**:

| Priority | Provider | Free Tier | Notes |
|----------|----------|-----------|-------|
| 1 | Google Drive | 15GB | Best for primary |
| 2 | Dropbox | 2GB | Good reliability |
| 3 | pCloud | 10GB | No folder limit |
| 4 | OneDrive | 5GB | Microsoft account |
| 5 | Box | 10GB | Enterprise-ready |
| 6 | Yandex Disk | 10GB | Russian service |
| 7 | Koofr | 10GB | EU privacy-focused |
| 8 | Backblaze B2 | 10GB | S3-compatible |
| 9 | Mega.nz | 20GB | Encrypted, ONE account |
| 10 | GitHub | 4GB | Final fallback |

**Total potential free storage: ~96GB**

## Prerequisites

- Cloudflare account (free tier works)
- GitHub account
- At least one storage provider account

## 1. Create Cloudflare Resources

### Create D1 Database

```bash
npx wrangler d1 create nightmare-library-db
```

Copy the database ID and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nightmare-library-db"
database_id = "your-database-id-here"
```

### Initialize Database Schema

```bash
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/schema.sql
```

### Create KV Namespaces

```bash
npx wrangler kv:namespace create "KV_SESSIONS"
npx wrangler kv:namespace create "KV_CACHE"
npx wrangler kv:namespace create "KV_RATE_LIMIT"
```

Update `wrangler.toml` with the namespace IDs.

## 2. Configure Storage Providers

### Google Drive (Priority 1 - Recommended Primary)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Generate an access token
6. (Optional) Create a specific folder for books

**Required Secrets:**
- `GDRIVE_ACCESS_TOKEN` - OAuth2 access token
- `GDRIVE_FOLDER_ID` (optional) - Folder ID for book storage

### Dropbox (Priority 2)

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app with "Full Dropbox" access
3. Generate an access token

**Required Secrets:**
- `DROPBOX_ACCESS_TOKEN` - App access token
- `DROPBOX_PATH` (optional) - Base path (e.g., `/NightmareLibrary`)

### pCloud (Priority 3)

1. Go to [pCloud Developer Console](https://docs.pcloud.com/)
2. Create an OAuth app
3. Get access token

**Required Secrets:**
- `PCLOUD_ACCESS_TOKEN` - OAuth access token
- `PCLOUD_FOLDER_ID` (optional) - Folder ID

### OneDrive (Priority 4)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Create a client secret
4. Get OAuth access token

**Required Secrets:**
- `ONEDRIVE_ACCESS_TOKEN` - OAuth access token
- `ONEDRIVE_FOLDER_ID` (optional) - Folder ID

### Box (Priority 5)

1. Go to [Box Developer Console](https://developer.box.com/)
2. Create a new application
3. Configure OAuth 2.0
4. Get access token

**Required Secrets:**
- `BOX_ACCESS_TOKEN` - OAuth access token
- `BOX_FOLDER_ID` (optional) - Folder ID

### Yandex Disk (Priority 6)

1. Go to [Yandex OAuth](https://oauth.yandex.com/)
2. Create a new application
3. Get OAuth token

**Required Secrets:**
- `YANDEX_ACCESS_TOKEN` - OAuth token
- `YANDEX_PATH` (optional) - Base path

### Koofr (Priority 7)

1. Go to [Koofr](https://koofr.eu/)
2. Create an account
3. Generate an API token in settings

**Required Secrets:**
- `KOOFR_ACCESS_TOKEN` - API token
- `KOOFR_MOUNT_ID` (optional) - Mount point ID

### Backblaze B2 (Priority 8)

1. Go to [Backblaze B2](https://www.backblaze.com/b2/)
2. Create an application key
3. Create a bucket

**Required Secrets:**
- `B2_APPLICATION_KEY_ID` - Application key ID
- `B2_APPLICATION_KEY` - Application key
- `B2_BUCKET_NAME` - Bucket name
- `B2_BUCKET_ID` (optional) - Bucket ID

### Mega.nz (Priority 9)

1. Create a [Mega.nz account](https://mega.nz/)
2. Use your login credentials

**Required Secrets:**
- `MEGA_EMAIL` - Your Mega.nz email
- `MEGA_PASSWORD` - Your Mega.nz password
- `MEGA_FOLDER_ID` (optional) - Folder ID

**⚠️ Warning:** One account only. Mega requires complex client-side encryption.

### GitHub (Priority 10 - Final Fallback)

1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic) with `repo` scope
3. System creates private repo `nightmare-library-storage`

**Required Secrets:**
- `GITHUB_TOKEN` - Personal Access Token
- `GITHUB_OWNER` - Your GitHub username
- `GITHUB_REPO` (optional) - Custom repo name

**⚠️ Hard limit: 4GB total storage**

## 3. Set Up Secrets

### Required Secrets (Must Have)

```bash
# Authentication
npx wrangler secret put PASSWORD
npx wrangler secret put JWT_SECRET
```

### Storage Provider Secrets (Choose at least one)

```bash
# Google Drive
npx wrangler secret put GDRIVE_ACCESS_TOKEN
npx wrangler secret put GDRIVE_FOLDER_ID

# Dropbox
npx wrangler secret put DROPBOX_ACCESS_TOKEN

# pCloud
npx wrangler secret put PCLOUD_ACCESS_TOKEN

# OneDrive
npx wrangler secret put ONEDRIVE_ACCESS_TOKEN

# Box
npx wrangler secret put BOX_ACCESS_TOKEN

# Yandex
npx wrangler secret put YANDEX_ACCESS_TOKEN

# Koofr
npx wrangler secret put KOOFR_ACCESS_TOKEN

# Backblaze B2
npx wrangler secret put B2_APPLICATION_KEY_ID
npx wrangler secret put B2_APPLICATION_KEY
npx wrangler secret put B2_BUCKET_NAME

# Mega.nz
npx wrangler secret put MEGA_EMAIL
npx wrangler secret put MEGA_PASSWORD

# GitHub (recommended as fallback)
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_OWNER
```

## 4. Deploy to Cloudflare Pages

### Via Git Integration

1. Go to **Cloudflare Dashboard → Pages**
2. Click **"Create a project" → "Connect to Git"**
3. Authorize GitHub and select your repository
4. Configure:
   - **Project name**: `nightmare-library`
   - **Production branch**: `main`
   - **Build command**: (leave empty)
   - **Build output directory**: `.`
5. Add bindings in **Settings**:
   - **D1 database**: Variable `DB` → `nightmare-library-db`
   - **KV namespaces**: `KV_SESSIONS`, `KV_CACHE`, `KV_RATE_LIMIT`
6. Add all secrets in **Settings → Environment Variables**

### Via Wrangler CLI

```bash
npx wrangler pages deploy .
```

## Storage Cascading Logic

The system tries providers in priority order (1-10). If one fails:
1. Mark provider as unhealthy
2. Try next provider in order
3. Log failure for monitoring
4. Auto-retry healthy providers after 5 minutes

```
Upload Request
    ↓
Google Drive → Dropbox → pCloud → OneDrive → Box
    ↓                                           ↓
Yandex → Koofr → B2 → Mega → GitHub (4GB max)
```

## Testing Locally

```bash
# Start dev server
npm run dev
```

Create `.dev.vars` with your secrets:

```
PASSWORD=your-test-password
JWT_SECRET=your-64-char-secret
GDRIVE_ACCESS_TOKEN=...
GITHUB_TOKEN=...
GITHUB_OWNER=...
```

## Database Schema

The database uses a single consolidated schema file:

```bash
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/schema.sql
```

### Tables
- `books` - Book metadata
- `shelves` - User-created shelves
- `shelf_items` - Book-shelf associations
- `progress` - Reading progress
- `settings` - User settings (2FA, performance mode)
- `book_content_index` - Full-text search
- `reading_stats` - Reading session tracking
- `offline_cache` - Cached books tracking
- `storage_providers` - Provider health status

## Security Features

### Optional 2FA Protection
- Enable in Settings
- Locks all books behind a password
- Separate from login password
- Uses constant-time password comparison

### Session Security
- HttpOnly cookies
- Secure flag (HTTPS only)
- SameSite=Strict
- IP and User-Agent validation
- Rate limiting on login attempts

### Data Protection
- Input sanitization on all fields
- XSS prevention via DOM helpers
- No sensitive data in frontend
- Secrets stored in Cloudflare only

## Monitoring

### View Logs
```bash
npx wrangler pages deployment tail
```

### Check Storage Health
- Visit `/api/storage/status` (authenticated)
- Shows all provider statuses
- Usage statistics per provider

## Troubleshooting

### Storage Upload Fails
1. Check secret values are set
2. Verify token permissions
3. Check provider-specific limits
4. Review Functions logs

### Database Migration Fails
```bash
npx wrangler d1 info nightmare-library-db
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/schema.sql
```

### Session Issues
- Verify JWT_SECRET is set
- Check cookie settings
- Ensure HTTPS is enabled

---

*May your books be safe and your storage never full.*
