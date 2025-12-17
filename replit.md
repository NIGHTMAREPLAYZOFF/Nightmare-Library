# Nightmare Library

A private digital library for EPUB and PDF books with cascading storage fallback, backend-only AI features, optional 2FA security, offline caching, and performance optimization.

## Overview

- **Purpose**: Personal digital library for ebooks
- **Stack**: Cloudflare Pages, D1 Database, KV Storage
- **Frontend**: Static HTML/CSS/JS
- **Backend**: Cloudflare Functions (TypeScript)

## Project Structure

```
/
├── frontend/           # Static frontend files
│   ├── dashboard.html  # Main library view
│   ├── reader.html     # Book reader
│   ├── styles/         # CSS files
│   │   ├── main.css    # Main styles + performance mode
│   │   └── reader.css  # Reader-specific styles
│   ├── scripts/        # JavaScript files
│   │   ├── main.js     # Dashboard logic
│   │   ├── ai-features.js    # AI API client
│   │   ├── performance-mode.js # Performance toggle
│   │   ├── text-only-reader.js # Minimal reader fallback
│   │   └── ...
│   ├── sw.js           # Service Worker for offline
│   └── assets/         # Static assets
├── functions/          # Cloudflare Functions (backend)
│   ├── api/
│   │   ├── ai/         # AI endpoints
│   │   │   ├── recommend.ts   # Book recommendations
│   │   │   ├── analytics.ts   # Reading statistics
│   │   │   ├── summary.ts     # Chapter summaries
│   │   │   └── genre.ts       # Genre suggestions (user-initiated)
│   │   ├── security/
│   │   │   └── two-factor.ts  # Optional 2FA
│   │   └── books/      # Book CRUD
│   └── storage-proxy.ts # 10-provider cascading storage
├── migrations/
│   └── schema.sql      # D1 database schema
├── wrangler.toml       # Cloudflare configuration
├── CHANGES.md          # Detailed changelog
└── CLOUDFLARE_SETUP.md # Deployment guide
```

## Recent Changes (December 2024)

### Storage Providers (4 → 10)
- Added: OneDrive, pCloud, Box, Yandex Disk, Koofr, Backblaze B2
- Total potential free storage: ~96GB

### AI Features (Backend-Only)
- Removed auto-genre assignment
- All AI endpoints moved to `/api/ai/*`
- Genre suggestions are user-initiated only

### Security
- Optional 2FA with password protection
- Session validation with IP/User-Agent

### Performance
- Performance Mode toggle (disables animations)
- Text-only reader for low-end devices
- Service Worker for offline caching

## Key Decisions

1. **No Auto-Genre**: User must explicitly request and confirm genre suggestions
2. **Cascading Storage**: Tries 10 providers in priority order with automatic failover
3. **Backend AI**: All AI processing happens in Functions, not client-side
4. **Optional 2FA**: Separate from login password, locks all books

## Development

```bash
# Start local dev server
npm run dev

# Deploy to Cloudflare
npm run deploy

# Run database migrations
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/schema.sql
```

## User Preferences

- Dark theme by default
- Performance mode for low-end devices
- Offline caching enabled
