# Nightmare Library

## Overview

Nightmare Library is a private digital library application for managing and reading EPUB and PDF books. It features an obsidian-black theme and runs entirely on Cloudflare's free tier infrastructure. The application provides password-protected access, book uploading with multi-provider cloud storage, reading progress tracking, shelves/collections organization, and AI-powered features like genre suggestions and reading analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Static HTML/CSS/JS** served from the `src/` directory (login) and `frontend/` directory (dashboard/reader)
- **Vanilla JavaScript** with ES6 modules - no framework dependencies
- **Modular script organization**: Separate files for main dashboard logic, reader functionality, theme management, DOM helpers, and feature-specific modules (AI, analytics, search, TTS)
- **XSS Prevention**: Uses safe DOM construction via `createElement` + `textContent` instead of innerHTML (see `frontend/scripts/dom-helpers.js`)
- **Offline Support**: Service Worker (`frontend/sw.js`) caches static assets and API responses

### Backend Architecture
- **Cloudflare Pages Functions** using Hono framework (v4.6.13)
- **File-based routing** in `functions/` directory - each `.ts` file maps to an API endpoint
- **Middleware layer** (`functions/_middleware.ts`) handles authentication, session validation, and route protection
- **Catch-all route** (`functions/[[path]].ts`) provides fallback API handling with CORS and security headers

### Database Strategy - Sharded D1
- **10 Cloudflare D1 databases** (DB_1 through DB_10) providing 5GB total storage
- **Consistent hashing** via `functions/db-router.ts` determines which database stores each book based on book ID
- **DatabaseRouter class** provides unified query interface across all shards
- `queryForBook(bookId)` - routes to correct shard for single-book operations
- `queryAll(sql)` - aggregates results from all 10 databases for listing/search

### File Storage Architecture
- **10-provider cascading fallback system** defined in `functions/storage-proxy.ts`
- Priority order: Google Drive → Dropbox → OneDrive → pCloud → Box → Yandex Disk → Koofr → Backblaze B2 → Mega.nz → GitHub
- Each provider configured via environment variables
- Files stored externally; database only stores `storage_provider` and `storage_id` references

### Authentication & Security
- **Single password authentication** - no user accounts, just one library password
- **KV-based sessions** stored in `KV_SESSIONS` namespace
- **Rate limiting** with lockout after 5 failed attempts (15-minute lockout)
- **Optional 2FA** layer via `functions/api/security/two-factor.ts`
- **Secure headers** applied via Hono middleware (CSP, HSTS, X-Frame-Options)

### Key API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth` | POST | Login with password |
| `/api/books/list` | GET | List all books (aggregated from all shards) |
| `/api/books/upload` | POST | Upload new book file |
| `/api/books/get` | GET | Retrieve book file for reading |
| `/api/books/progress` | GET/POST | Read/save reading progress |
| `/api/shelves/*` | Various | Manage book collections |
| `/api/ai/*` | Various | Genre suggestions, recommendations, analytics |

## External Dependencies

### Cloudflare Services (Free Tier)
- **Cloudflare Pages** - Static hosting and serverless functions
- **Cloudflare D1** - SQLite databases (10 instances for sharding)
- **Cloudflare KV** - Session storage (`KV_SESSIONS`) and caching (`KV_CACHE`, `KV_RATE_LIMIT`)

### NPM Dependencies
- **hono** (^4.6.13) - Lightweight web framework for Cloudflare Workers
- **@cloudflare/workers-types** (dev) - TypeScript types for Workers APIs
- **wrangler** (dev) - Cloudflare development and deployment CLI

### Cloud Storage Providers (User-Configured)
All storage providers require user-provided OAuth tokens or API keys:
- Google Drive, Dropbox, OneDrive, pCloud, Box
- Yandex Disk, Koofr, Backblaze B2, Mega.nz
- GitHub (fallback, 4GB limit per repo)

### Required Environment Variables
```
PASSWORD          - Library access password
JWT_SECRET        - Session token signing key
GDRIVE_ACCESS_TOKEN, GDRIVE_FOLDER_ID    - Google Drive credentials
DROPBOX_ACCESS_TOKEN, DROPBOX_PATH       - Dropbox credentials
# ... additional storage provider credentials as needed
```

### Database Bindings (Cloudflare Dashboard)
D1 databases must be bound as `DB_1` through `DB_10` in Cloudflare Pages settings.