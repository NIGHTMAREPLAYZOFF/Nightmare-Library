
# Nightmare Library - Cloudflare Pages Setup Guide

Complete guide to deploying Nightmare Library on Cloudflare Pages with cascading storage fallback.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Create Cloudflare Resources](#1-create-cloudflare-resources)
   - [D1 Database](#create-d1-database)
   - [KV Namespaces](#create-kv-namespaces)
4. [Configure Storage Providers](#2-configure-storage-providers)
   - [Google Drive](#google-drive-setup-recommended-primary)
   - [Dropbox](#dropbox-setup-secondary)
   - [Mega.nz](#meganz-setup-tertiary)
   - [GitHub](#github-setup-final-fallback---4gb-max)
5. [Set Up Secrets](#3-set-up-secrets)
6. [Deploy to Cloudflare Pages](#4-deploy-to-cloudflare-pages)
7. [Storage Cascading Logic](#storage-cascading-logic)
8. [Testing Locally](#testing-locally)
9. [Monitoring Storage Usage](#monitoring-storage-usage)

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
npx wrangler kv:namespace create "KV_RATE_LIMIT"
```

Update `wrangler.toml` with the namespace IDs.

**Quick Navigation:**
- [D1 Database Setup](#create-d1-database)
- [KV Namespaces](#create-kv-namespaces)
- [Storage Providers](#configure-storage-providers)
- [Secrets Configuration](#set-up-secrets)
- [Deployment](#deploy-to-cloudflare-pages)

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
     - Variable `KV_RATE_LIMIT` → your rate limit namespace
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
# Cloudflare Pages Deployment Guide

## Prerequisites

- Cloudflare account with Pages access
- Wrangler CLI installed: `npm install -g wrangler`
- Git repository with your code

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create D1 Database

```bash
# Create the database
npx wrangler d1 create nightmare-library-db

# Copy the database_id from the output
# Update wrangler.toml with the database_id
```

## Step 3: Run Database Migrations

```bash
# Execute initial migration
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/0001_init.sql

# Execute features migration
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/0002_add_features.sql
```

## Step 4: Create KV Namespaces

```bash
# Create KV namespaces for sessions, cache, and rate limiting
npx wrangler kv:namespace create "KV_SESSIONS"
npx wrangler kv:namespace create "KV_CACHE"
npx wrangler kv:namespace create "KV_RATE_LIMIT"

# Each command will output an ID - copy these IDs
# Update wrangler.toml with the namespace IDs
```

## Step 5: Configure Secrets

### Required Secrets

1. **PASSWORD** - Your login password
   ```bash
   npx wrangler secret put PASSWORD
   # Enter a strong password (min 8 chars, recommend 16+)
   ```

2. **JWT_SECRET** - Session token secret
   ```bash
   # Generate a random secret
   openssl rand -hex 32
   
   # Set it as a secret
   npx wrangler secret put JWT_SECRET
   # Paste the generated secret
   ```

### Storage Provider Secrets (Choose at least one)

#### Option 1: Google Drive (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Get access token using OAuth 2.0 Playground or your app
6. Set secrets:
   ```bash
   npx wrangler secret put GDRIVE_ACCESS_TOKEN
   npx wrangler secret put GDRIVE_FOLDER_ID  # Optional
   ```

#### Option 2: Dropbox

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app with "Full Dropbox" access
3. Generate access token
4. Set secrets:
   ```bash
   npx wrangler secret put DROPBOX_ACCESS_TOKEN
   npx wrangler secret put DROPBOX_PATH  # Optional, e.g., "/NightmareLibrary"
   ```

#### Option 3: Mega.nz

1. Create or use existing Mega.nz account
2. Set secrets:
   ```bash
   npx wrangler secret put MEGA_EMAIL
   npx wrangler secret put MEGA_PASSWORD
   npx wrangler secret put MEGA_FOLDER_ID  # Optional
   ```

**Note**: Storing passwords as secrets is not ideal. Consider using app-specific passwords if available.

#### Option 4: GitHub (Fallback - 4GB Limit)

1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Generate new token with `repo` scope
3. Set secrets:
   ```bash
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler secret put GITHUB_OWNER  # Your GitHub username
   npx wrangler secret put GITHUB_REPO   # Optional, defaults to "nightmare-library-storage"
   ```

## Step 6: Test Locally

```bash
# Start local development server
npm run dev

# This runs: wrangler pages dev . --compatibility-date=2024-01-01
```

Visit `http://localhost:8788` to test your application.

## Step 7: Deploy to Cloudflare Pages

### Via Wrangler CLI

```bash
# Deploy to production
npm run deploy

# This runs: wrangler pages deploy .
```

### Via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Go to **Pages**
4. Click **Create a project**
5. Connect your Git repository
6. Configure build settings:
   - **Build command**: `echo "No build required"`
   - **Build output directory**: `./`
7. Add environment variables in **Settings > Environment variables**

## Step 8: Configure Custom Domain (Optional)

1. In Cloudflare Pages dashboard, go to your project
2. Click **Custom domains**
3. Add your domain
4. Update DNS records as instructed

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Change PASSWORD and JWT_SECRET every 90 days
   - Rotate storage tokens when suspicious activity detected

2. **Monitor Access Logs**
   - Check Cloudflare Analytics regularly
   - Set up alerts for unusual traffic patterns

3. **Use Least-Privilege Access**
   - Storage tokens should only have necessary permissions
   - GitHub tokens should be scoped to specific repositories

4. **Enable 2FA**
   - Enable two-factor authentication on your Cloudflare account
   - Enable 2FA on storage provider accounts

5. **Backup Database**
   ```bash
   # Export D1 database
   npx wrangler d1 export nightmare-library-db --output backup.sql
   ```

## Troubleshooting

### Database Migration Fails
```bash
# Check database connection
npx wrangler d1 info nightmare-library-db

# Re-run migrations
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/0001_init.sql
```

### KV Namespace Not Found
```bash
# List all KV namespaces
npx wrangler kv:namespace list

# Verify IDs in wrangler.toml match output
```

### Storage Upload Fails
- Verify secret values are set correctly
- Check token permissions in provider console
- Review Cloudflare Functions logs for error details

### Session Expires Immediately
- Verify JWT_SECRET is set
- Check cookie settings (Secure, SameSite)
- Ensure HTTPS is enabled

## Performance Optimization

1. **Enable Cloudflare Caching**
   - Static assets cached at edge
   - Custom cache rules for book covers

2. **Use Workers Analytics**
   - Monitor response times
   - Identify slow endpoints

3. **Optimize Images**
   - Use Cloudflare Images for cover processing
   - Enable WebP format for smaller sizes

## Monitoring

### View Logs
```bash
# Tail Pages Functions logs
npx wrangler pages deployment tail
```

### Analytics Dashboard
- Go to Cloudflare Dashboard > Pages > Your Project > Analytics
- Monitor requests, bandwidth, errors

## Support

For issues or questions:
- Check [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- Review [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- Open an issue in the repository
