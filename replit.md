# Nightmare Library - Project Documentation

## Overview
A private digital library for EPUB and PDF books with obsidian-black theme, built with Cloudflare Pages, vanilla JavaScript, and TypeScript.

## Current Architecture
- **Frontend**: Vanilla HTML/CSS/JavaScript in `/frontend`
- **Backend**: Cloudflare Pages Functions in `/functions`
- **Auth**: Session-based with KV storage
- **Database**: D1 (Cloudflare's SQLite)
- **Routing**: Cloudflare Pages file-based routing + `/functions/_middleware.ts` for auth

## Key Components

### Frontend Files
- `index.html` - Login page
- `frontend/dashboard.html` - Main book library interface
- `frontend/reader.html` - EPUB/PDF reader interface
- `frontend/scripts/main.js` - Dashboard logic
- `frontend/scripts/reader.js` - Reader core functionality
- `frontend/scripts/dom-helpers.js` - Safe DOM manipulation utilities

### Backend Structure
- `functions/_middleware.ts` - Global authentication middleware (Cloudflare Pages)
- `functions/api/auth.ts` - Login endpoint with rate limiting
- `functions/api/books/*` - Book management endpoints
- `functions/api/shelves/*` - Shelf management endpoints
- `functions/api/settings/*` - User settings endpoints
- `functions/index.ts` - Hono API router (unified error handling and health check)

## Recent Fixes (Dec 24, 2025)

### UI/UX Button Fixes
1. **Removed duplicate `renderBooks()` function** - eliminated event listener conflicts
2. **Fixed event listener memory leak** - properly remove old listeners before adding new ones
3. **Removed duplicate DOM load handlers** - prevented double initialization
4. **Fixed 2FA toggle listener** - prevents listener accumulation

### Cloudflare Pages Architecture Review
1. **Removed conflicting route handlers** - `dashboard.ts` and `reader.ts` were unnecessary duplicates
2. **Consolidated to static file serving** - Cloudflare Pages handles HTML serving natively
3. **Middleware-based auth** - All page access goes through `_middleware.ts` for session validation
4. **Added cache control headers** - HTML files use `no-cache, must-revalidate` to prevent stale content

### Server Status
- ✅ Running on port 5000
- ✅ Using Wrangler 3.114.15
- ✅ All buttons functional
- ✅ No architectural conflicts

## Dependencies
- **hono**: ^4.6.13 (API router, error handling)
- **wrangler**: ^3.22.4 (Cloudflare Pages dev server)
- **typescript**: ^5.3.3
- **@cloudflare/workers-types**: ^4.20240117.0

## Authentication Flow
1. User submits password on `/index.html`
2. POST to `/api/auth` with password validation
3. Server creates session token, stores in KV
4. Sets `NMLR_SESSION` cookie (HttpOnly, Secure)
5. Middleware validates on every protected route

## User Preferences
- **Framework**: Cloudflare Pages (static + functions) - NO major refactor desired
- **Dependencies**: No Replit-specific packages
- **Redirects**: All use direct file paths (`/frontend/dashboard.html`, `/frontend/reader.html`)
- **Caching**: Aggressive on assets, no-cache on HTML
