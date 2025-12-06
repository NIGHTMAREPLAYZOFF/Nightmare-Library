
# Nightmare Library - Cloudflare Pages Setup Guide

Complete guide to deploying Nightmare Library on Cloudflare Pages with cascading storage fallback.

## Overview

This setup uses a cascading storage system that tries providers in order:
1. **Google Drive** (Primary)
2. **Dropbox** (Secondary)
3. **Mega.nz** (Tertiary)
4. **GitHub** (Final fallback - 4GB limit, private repos)

## Prerequisites

- Cloudflare account (free tier works)
- GitHub account
- At least one storage provider account (Google Drive, Dropbox, Mega.nz, or GitHub)

## 1. Create Cloudflare Resources

### Create D1 Database

```bash
npx wrangler d1 create nightmare-library-db
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nightmare-library-db"
database_id = "your-database-id-here"
```

### Initialize Database Schema

```bash
npx wrangler d1 execute nightmare-library-db --file=./migrations/0001_init.sql
```

### Create KV Namespaces

```bash
npx wrangler kv:namespace create "KV_SESSIONS"
npx wrangler kv:namespace create "KV_CACHE"
```

Update `wrangler.toml` with the namespace IDs.

## 2. Configure Storage Providers

### Google Drive Setup (Recommended Primary)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Generate an access token
6. (Optional) Create a specific folder for books and get its ID

**Required Secrets:**
- `GDRIVE_ACCESS_TOKEN` - OAuth2 access token
- `GDRIVE_FOLDER_ID` (optional) - Folder ID for book storage

### Dropbox Setup (Secondary)

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app with "Full Dropbox" access
3. Generate an access token

**Required Secrets:**
- `DROPBOX_ACCESS_TOKEN` - App access token
- `DROPBOX_PATH` (optional) - Base path for storage (e.g., `/NightmareLibrary`)

### Mega.nz Setup (Tertiary)

1. Create a [Mega.nz account](https://mega.nz/)
2. Use your login credentials

**Required Secrets:**
- `MEGA_EMAIL` - Your Mega.nz email
- `MEGA_PASSWORD` - Your Mega.nz password
- `MEGA_FOLDER_ID` (optional) - Specific folder for storage

### GitHub Setup (Final Fallback - 4GB Max)

1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic) with `repo` scope
3. The system will create a private repo named `nightmare-library-storage` (or custom name)

**Required Secrets:**
- `GITHUB_TOKEN` - Personal Access Token with `repo` scope
- `GITHUB_OWNER` - Your GitHub username
- `GITHUB_REPO` (optional) - Custom repo name (defaults to `nightmare-library-storage`)

**Note:** GitHub storage is capped at 4GB total and will not exceed this limit.

## 3. Set Up Secrets

### Required Secrets

```bash
# Authentication
npx wrangler secret put PASSWORD
npx wrangler secret put JWT_SECRET

# Google Drive (if using)
npx wrangler secret put GDRIVE_ACCESS_TOKEN
npx wrangler secret put GDRIVE_FOLDER_ID

# Dropbox (if using)
npx wrangler secret put DROPBOX_ACCESS_TOKEN
npx wrangler secret put DROPBOX_PATH

# Mega.nz (if using)
npx wrangler secret put MEGA_EMAIL
npx wrangler secret put MEGA_PASSWORD
npx wrangler secret put MEGA_FOLDER_ID

# GitHub (fallback - always recommended)
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_OWNER
npx wrangler secret put GITHUB_REPO
```

## 4. Deploy to Cloudflare Pages

1. Go to **Cloudflare Dashboard → Pages**
2. Click **"Create a project" → "Connect to Git"**
3. Authorize GitHub and select your repository
4. Configure build settings:
   - **Project name**: `nightmare-library`
   - **Production branch**: `main`
   - **Build command**: (leave empty)
   - **Build output directory**: `.`
5. After first deploy, add bindings:
   - **D1 database**: Variable `DB` → `nightmare-library-db`
   - **KV namespaces**: 
     - Variable `KV_SESSIONS` → your sessions namespace
     - Variable `KV_CACHE` → your cache namespace
6. Add all secrets from Step 3 in **Settings → Environment Variables**

## Storage Cascading Logic

The system automatically tries storage providers in this order:

1. **Google Drive** - If `GDRIVE_ACCESS_TOKEN` is configured
2. **Dropbox** - If `DROPBOX_ACCESS_TOKEN` is configured
3. **Mega.nz** - If `MEGA_EMAIL` and `MEGA_PASSWORD` are configured
4. **GitHub** - If `GITHUB_TOKEN` and `GITHUB_OWNER` are configured (max 4GB)

If a provider fails, the system automatically tries the next one. GitHub is always used as the final fallback with a 4GB storage cap.

## Summary of All Secrets

| Secret Name | Required | Description |
|-------------|----------|-------------|
| PASSWORD | Yes | Master login password |
| JWT_SECRET | Yes | Random 64+ char string for token signing |
| GDRIVE_ACCESS_TOKEN | No* | Google Drive OAuth2 token |
| GDRIVE_FOLDER_ID | No | Google Drive folder ID |
| DROPBOX_ACCESS_TOKEN | No* | Dropbox app access token |
| DROPBOX_PATH | No | Dropbox base path |
| MEGA_EMAIL | No* | Mega.nz account email |
| MEGA_PASSWORD | No* | Mega.nz account password |
| MEGA_FOLDER_ID | No | Mega.nz folder ID |
| GITHUB_TOKEN | Yes** | GitHub PAT with repo scope |
| GITHUB_OWNER | Yes** | GitHub username |
| GITHUB_REPO | No | Custom GitHub repo name |

\* At least one storage provider is required  
\** Recommended as final fallback

## Testing Locally

```bash
npx wrangler pages dev .
```

Create a `.dev.vars` file with your secrets:

```
PASSWORD=your-test-password
JWT_SECRET=your-64-char-secret-key-here-make-it-long-and-random
GDRIVE_ACCESS_TOKEN=your-gdrive-token
DROPBOX_ACCESS_TOKEN=your-dropbox-token
MEGA_EMAIL=your-mega-email
MEGA_PASSWORD=your-mega-password
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_OWNER=your-github-username
```

## Monitoring Storage Usage

- **Google Drive**: Check usage in Google Drive web interface
- **Dropbox**: Check storage quota in Dropbox settings
- **Mega.nz**: Check usage in Mega.nz web interface  
- **GitHub**: The system automatically prevents exceeding 4GB limit
