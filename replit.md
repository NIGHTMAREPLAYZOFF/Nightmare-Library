# Nightmare Library - Project Documentation

## Overview

A dual-structure digital library application. Root level is for Cloudflare Pages deployment, while `/replit-version` contains a development-friendly Express.js version.

## Project Structure

```
nightmare-library/
├── index.html              # Login page (Cloudflare)
├── frontend/               # Shared frontend (HTML, CSS, JS)
├── functions/              # Cloudflare Workers backend
├── migrations/             # D1 database schema
├── wrangler.toml           # Cloudflare configuration
├── CLOUDFLARE_SETUP.md     # Deployment guide
│
└── replit-version/         # Development version
    ├── src/                # Express.js backend
    ├── database/           # SQLite storage
    └── uploads/            # Local file storage
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
- Cloudflare: Multi-provider abstraction (R2, S3, GCS, Backblaze)
- Replit: Local filesystem storage
- GitHub fallback: Creates private repos when primary storage fails

## Development Commands

- `npm run replit:dev` - Start Replit development server
- `npm run dev` - Start Cloudflare local development
- `npm run deploy` - Deploy to Cloudflare Pages

## Recent Changes

- Initial project setup
- Dual structure: Cloudflare at root, Replit in subfolder

## User Preferences

- Dark obsidian theme preferred
- No frameworks on frontend (vanilla HTML/CSS/JS)
- TypeScript for backend only
