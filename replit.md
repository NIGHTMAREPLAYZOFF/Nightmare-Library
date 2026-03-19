# replit.md

## Overview

Nightmare Library is a private digital library for EPUB and PDF files. It runs entirely on **Cloudflare Pages** (free tier) using serverless Workers Functions, with no build step required. All configuration is done via the Cloudflare Dashboard (no `.env` files).

## User Preferences

Preferred communication style: Simple, everyday language.

## File Structure

```
/                       ← Static files served by Cloudflare Pages CDN
├── index.html          ← Login page
├── dashboard.html      ← Main library dashboard (requires auth)
├── reader.html         ← EPUB/PDF reader (requires auth)
├── css/
│   ├── main.css        ← Shared base styles (obsidian-black theme)
│   ├── dashboard.css   ← Dashboard-specific styles
│   └── reader.css      ← Reader-specific styles
├── js/
│   ├── app.js          ← Login page logic
│   ├── dashboard.js    ← Dashboard logic (book listing, upload, search)
│   └── reader.js       ← EPUB/PDF reader logic
├── assets/             ← Icons and static assets
├── functions/          ← Cloudflare Pages Functions (run at edge)
│   ├── _middleware.ts  ← Auth guard for all protected routes
│   ├── index.ts        ← Root API handler
│   ├── api/
│   │   ├── [[path]].ts ← Main Hono API router (auth, books)
│   │   ├── auth.ts     ← Auth sub-routes
│   │   ├── books/      ← Book CRUD endpoints
│   │   ├── shelves/    ← Shelf management endpoints
│   │   └── settings/   ← Settings endpoints
│   ├── db-router.ts    ← Sharded D1 database router
│   ├── storage-github.ts  ← GitHub storage provider
│   └── storage-proxy.ts   ← Multi-provider storage with failover
├── _headers            ← Cloudflare security headers
├── _redirects          ← Cloudflare URL rewrites
└── wrangler.toml       ← Cloudflare config (bindings reference, no secrets)
```

## System Architecture

### Platform
- **Cloudflare Pages** — Static hosting + edge functions (free tier)
- **Cloudflare Workers** — Serverless TypeScript functions via Pages Functions
- **Hono** — Lightweight web framework for Workers
- **No build step** — Files are served directly; TypeScript is compiled by Cloudflare at deploy time

### Authentication
- Password stored as a **Cloudflare Dashboard Secret** (`PASSWORD`)
- Sessions stored in **KV_SESSIONS** namespace with 7-day TTL
- Rate limiting stored in **KV_RATE_LIMIT** namespace (10 attempts / 15 min)
- Session cookie: `NMLR_SESSION` (HttpOnly, SameSite=Strict, Secure in prod)

### Database — 10 Sharded D1 Databases
- Bindings: `DB_1` through `DB_10`
- Books are distributed using consistent hashing on `book.id`
- All 10 shards are queried in parallel on `/api/books`

### Storage — Multi-Provider with Automatic Failover
Priority order (highest → lowest):
1. Google Drive (`GDRIVE_ACCESS_TOKEN`)
2. Dropbox (`DROPBOX_ACCESS_TOKEN`)
3. OneDrive (`ONEDRIVE_ACCESS_TOKEN`)
4. pCloud (`PCLOUD_ACCESS_TOKEN`)
5. Box (`BOX_ACCESS_TOKEN`)
6. Yandex Disk (`YANDEX_ACCESS_TOKEN`)
7. Koofr (`KOOFR_ACCESS_TOKEN`)
8. Backblaze B2 (`B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_ID`, `B2_BUCKET_NAME`)
9. Mega.nz (`MEGA_EMAIL`, `MEGA_PASSWORD`, `MEGA_FOLDER_ID`)
10. GitHub (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`) — 4GB hard limit per repo, auto-rotates to new repos

## Required Cloudflare Dashboard Secrets
Set all of these in **Pages → Settings → Environment Variables** as **Encrypted Secrets**:

| Variable | Required | Description |
|---|---|---|
| `PASSWORD` | Yes | Library login password |
| `JWT_SECRET` | Yes | Random string for session signing |
| `GITHUB_TOKEN` | Yes | GitHub PAT for storage fallback |
| `GITHUB_OWNER` | Yes | GitHub username/org |
| `GITHUB_REPO` | No | Storage repo name (default: nightmare-library-storage) |
| `GDRIVE_ACCESS_TOKEN` | No | Google Drive OAuth token |
| `DROPBOX_ACCESS_TOKEN` | No | Dropbox access token |
| `ONEDRIVE_ACCESS_TOKEN` | No | OneDrive/Graph API token |
| `PCLOUD_ACCESS_TOKEN` | No | pCloud access token |
| `BOX_ACCESS_TOKEN` | No | Box access token |
| `YANDEX_ACCESS_TOKEN` | No | Yandex Disk token |
| `KOOFR_ACCESS_TOKEN` | No | Koofr access token |
| `B2_KEY_ID` | No | Backblaze B2 Key ID |
| `B2_APPLICATION_KEY` | No | Backblaze B2 Application Key |
| `B2_BUCKET_ID` | No | Backblaze B2 Bucket ID |
| `B2_BUCKET_NAME` | No | Backblaze B2 Bucket Name |
| `MEGA_EMAIL` | No | Mega.nz email |
| `MEGA_PASSWORD` | No | Mega.nz password |
| `MEGA_FOLDER_ID` | No | Mega.nz folder ID |

## Required Cloudflare Dashboard Bindings
Set these in **Pages → Settings → Functions**:

### KV Namespaces
- `KV_SESSIONS` → Create in Dashboard → KV → Create Namespace
- `KV_RATE_LIMIT` → Create in Dashboard → KV → Create Namespace

### D1 Databases
- `DB_1` through `DB_10` → Create 10 databases in Dashboard → D1

## External Dependencies

### Cloudflare Services
- **Cloudflare Pages**: Static site hosting with edge functions (free tier)
- **Cloudflare Workers**: Serverless function execution at edge
- **Cloudflare D1**: SQLite databases at the edge (10 shards)
- **Cloudflare KV**: Key-value store for sessions and rate limiting

### Development Dependencies
- TypeScript for type-safe functions
- Hono v4 for the API framework
- Wrangler v3 (devDependency only, for local dev)
## Environment Restoration Note (January 19, 2026)
Following a manual deletion of replit.nix, the environment has been partially restored. 
Workflows are currently configured to use absolute Nix paths for critical tools:
- Python: /nix/store/flbj8bq2vznkcwss7sm0ky8rd0k6kar7-python-wrapped-0.1.0/bin/python3
- Bun: /nix/store/c2fmismsm893gbrl9i7aw08ggj2vf1ws-bun-1.2.16-wrapped/bin/bun

To fully restore the shell environment (including 'node' and 'npm' in PATH), the user should re-add these modules via the Replit 'Packages' or 'Modules' UI, which will regenerate the replit.nix file.

## AI Capabilities
- **Ollama**: Installed via Nix system package. Available globally as `ollama`.
- **Local Models**: Recommended to run Qwen 2.5 Coder or DeepSeek R1 (smaller parameter versions) for coding assistance within the shell.
- **Startup**: Use `./start_ollama.sh` to ensure the server is running.

## Manual Restore Paths
Workflows use absolute Nix paths for critical tools:
- Python: /nix/store/flbj8bq2vznkcwss7sm0ky8rd0k6kar7-python-wrapped-0.1.0/bin/python3
- Bun: /nix/store/c2fmismsm893gbrl9i7aw08ggj2vf1ws-bun-1.2.16-wrapped/bin/bun
