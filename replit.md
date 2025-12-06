# Nightmare Library - Project Documentation

## Overview

A dual-structure digital library application designed for Cloudflare Pages deployment with a Replit-compatible development version. The project uses an obsidian-black theme with purple accents for a dark, modern aesthetic.

## Project Structure

```
nightmare-library/
├── cloudflare-version/     # Production Cloudflare Pages structure
│   ├── index.html          # Login page
│   ├── frontend/           # Dashboard, reader, assets
│   ├── functions/          # Cloudflare Workers backend
│   ├── migrations/         # D1 database schema
│   ├── wrangler.toml       # Cloudflare configuration
│   └── CLOUDFLARE_SETUP.md # Deployment guide
│
├── replit-version/         # Development version
│   ├── public/             # Frontend files
│   ├── src/                # Express.js backend
│   ├── database/           # SQLite storage
│   └── uploads/            # Local file storage
│
├── package.json            # Root scripts
└── README.md               # Project overview
```

## Architecture

### Backend Pattern
- Backend generates pre-rendered HTML snippets
- Frontend receives `snippet_html` field and inserts directly
- NO business logic in frontend

### Authentication
- Password-based with JWT tokens
- HttpOnly, Secure, SameSite=Strict cookies
- 24-hour session TTL
- Cookie name: `NMLR_SESSION`

### Storage
- Multi-provider abstraction (R2, S3, GCS, Backblaze)
- GitHub fallback: Creates private repos when primary storage fails

## Development Commands

- `npm run dev` - Start Replit development server
- `npm run cf:dev` - Start Cloudflare local development
- `npm run cf:deploy` - Deploy to Cloudflare Pages

## Recent Changes

- Initial project setup

## User Preferences

- Dark obsidian theme preferred
- No frameworks on frontend (vanilla HTML/CSS/JS)
- TypeScript for backend only
