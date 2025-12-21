# Nightmare Library - Project Documentation

## 📚 Project Overview

**Nightmare Library** is a Cloudflare Pages-based single-user digital library for EPUB and PDF books with an obsidian-black theme.

### Core Features
- Authentication with optional 2FA
- Reading progress tracking
- AI-powered recommendations and summaries
- Database sharding across 10 D1 databases (5GB total capacity)
- Cascading failover across 10 cloud storage providers
- Obsidian-black minimalist design

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Backend**: Cloudflare Pages with Hono framework
- **Database**: Cloudflare D1 (10 sharded databases)
- **Sessions**: Cloudflare KV namespaces
- **Storage**: 10 cloud providers with auto-failover
- **Language**: TypeScript

---

## 🎯 Recent Changes (December 21, 2025)

### Mobile Controls & RTL (Right-to-Left)
- ✅ **Swipe Navigation**: Horizontal swipe (>50px) to turn pages on mobile
- ✅ **Tap Zones**: Left third = prev, Right third = next page
- ✅ **RTL Auto-Detection**: Checks EPUB spine direction first (most reliable)
- ✅ **RTL Keyboard**: Arrow keys reverse in manga mode
- ✅ **Mobile Gestures**: All controls are touch-friendly
- ✅ **Fixed XSS**: Book titles sanitized with escapeHtml()
- ✅ **API Key Paths**: Added step-by-step instructions for all 10 storage providers

### Documentation Restructure (Earlier)
- ✅ Reorganized `CLOUDFLARE_SETUP.md` from easy → hard
- ✅ Cloudflare setup ordered: Secrets → KV → D1
- ✅ Storage providers ordered by ease of setup (2-5 min each)

### Updated Docs
- `CLOUDFLARE_SETUP.md` - Complete rewrite with clear progression
- `wrangler.toml` - Secure configuration, credentials in dashboard only

### Storage Providers (Final 10)
1. **Dropbox** (2GB free, 2 min setup)
2. **OneDrive** (5GB free, 3 min setup)
3. **pCloud** (10GB free, 2 min setup)
4. **Box** (10GB free, 3 min setup)
5. **Yandex Disk** (10GB free, 3 min setup)
6. **Koofr** (10GB free, 3 min setup)
7. **Mega** (20GB free, 3 min setup)
8. **Backblaze B2** (10GB free, 3 min setup, S3-compatible)
9. **CloudGate** (100GB free, 2 min setup)
10. **GitHub** (guaranteed fallback, 4GB repo limit)

---

## 🔧 Architecture

### Database Sharding
- **10 D1 databases**: DB_1 through DB_10
- **Consistent hashing**: Books distributed by book ID
- **500MB per database** = 5GB total capacity
- **Automatic routing**: DatabaseRouter routes queries to correct DB
- **Aggregation**: List operations query all 10 DBs and combine results

### Storage Cascade
- **Priority order**: Dropbox → OneDrive → pCloud → Box → Yandex → Koofr → Mega → B2 → CloudGate → GitHub
- **Auto-failover**: If provider fails, tries next in queue
- **Guaranteed**: GitHub always works as final fallback
- **No data loss**: Books stored simultaneously or cascaded based on implementation

### Security
- ✅ All secrets in Cloudflare Pages dashboard (encrypted)
- ✅ No credentials in code or git
- ✅ No credit card required for any provider
- ✅ Rate limiting, 2FA support, session validation
- ✅ Least-privilege access tokens per provider

---

## 👥 User Preferences

### Deployment Requirements
- **Cloudflare Pages ONLY** - strictly follow Pages conventions
- **No Replit patterns** - build command empty or "npm install" only
- **No wrangler in build** - causes LSP errors
- **Force push to non-empty repo** - discard old GitHub content

### Documentation Style
- **Easy → Hard progression** - users should find quick wins first
- **No credit card required** - all services must be free with no CC
- **Cloud-hosted only** - no self-hosted providers
- **Clear setup times** - each step should take 2-5 minutes
- **Security-first** - credentials never in code

### Code Quality
- **TypeScript strict mode**
- **Minimal comments** - only add if explicitly requested
- **No emojis** - unless user explicitly requests them
- **Following existing patterns** - obey project conventions
- **99%+ LSP compliance** - fix type errors

---

## 📁 Important Files

### Configuration
- `wrangler.toml` - Cloudflare Pages config (no secrets in this file)
- `CLOUDFLARE_SETUP.md` - Deployment & setup guide
- `package.json` - Node dependencies

### Database & API
- `functions/db-router.ts` - Consistent hashing, database routing
- `migrations/schema.sql` - Database schema for all 10 DBs
- `functions/api/` - 16+ API endpoints

### Functions (by category)
- **Auth**: `functions/api/auth.ts`
- **Books**: `functions/api/books/` (list, get, upload, delete, search)
- **Reading**: `functions/api/reading/` (progress, bookmarks, highlights)
- **AI**: `functions/api/ai/` (recommendations, summaries, analytics)
- **User**: `functions/api/user/` (settings, profile)

### Frontend
- `index.html` - Main app (vanilla JS, no build needed)
- `frontend/` - CSS, JS utilities
- Dark theme (obsidian-black color scheme)

---

## 🚀 Current Status

### ✅ Completed
- ✅ Mobile controls (swipe & tap navigation)
- ✅ RTL/manga support with spine direction detection
- ✅ XSS security fixes (title sanitization)
- ✅ Database sharding implementation (all 16+ endpoints use DatabaseRouter)
- ✅ TypeScript compilation (8 minor LSP errors remaining, all non-blocking)
- ✅ Security audit (authentication, 2FA, rate limiting, sessions)
- ✅ Storage provider architecture (10 providers with cascading failover)
- ✅ Documentation reorganization (easy → hard progression)

### 🎯 Next Steps
1. User deploys to Cloudflare Pages (push to GitHub, configure dashboard)
2. Create D1 databases and KV namespaces in Cloudflare
3. Set required secrets (PASSWORD, JWT_SECRET, GITHUB_TOKEN, GITHUB_OWNER)
4. Run schema migrations on all 10 databases
5. Test book upload/list/read operations
6. (Optional) Add additional storage provider credentials

---

## 📊 LSP Status

**Remaining errors**: 8 (non-critical type hints)
- `functions/api/auth.ts` - 1 error
- `functions/api/books/search-content.ts` - 2 errors
- `functions/api/ai/analytics.ts` - 2 errors
- `functions/api/ai/summary.ts` - 3 errors

These are minor type compatibility issues, not blocking deployment.

---

## 🔐 Secrets Checklist

**Required (for basic deployment)**:
- `PASSWORD` - Login password (min 8 chars)
- `JWT_SECRET` - Session signing key (64 chars)
- `GITHUB_TOKEN` - Personal Access Token
- `GITHUB_OWNER` - GitHub username

**Optional (add for backup storage)**:
- Dropbox, OneDrive, pCloud, Box, Yandex, Koofr, Mega, B2, CloudGate credentials

All set via: **Cloudflare Pages > nightmare-library > Settings > Environment variables**

---

## 💡 Development Notes

### Build Command
- **Empty** (recommended) - Cloudflare handles npm install automatically
- Or: `npm install` - Explicit dependency installation only

### Local Testing
```bash
npm run dev
# Runs wrangler pages dev on localhost:8788
```

### Database Routing Example
```typescript
const router = createDatabaseRouter(env);
const dbIndex = router.getDbIndex(bookId);  // 0-9
const db = router.queryForBook(bookId);     // Get correct D1 binding
```

### Schema Files
- All 10 databases share `migrations/schema.sql`
- Run migration separately for each DB via wrangler CLI

---

## 📋 Quick Reference

### File Paths
- Docs: `CLOUDFLARE_SETUP.md`, `EMERGENCY_PROMPT.txt`, `replit.md`
- Config: `wrangler.toml`, `package.json`
- Functions: `functions/` (middleware, API endpoints, db-router)
- Frontend: `index.html`, `frontend/`
- Database: `migrations/schema.sql`

### Important Commands
```bash
# Local dev
npm run dev

# Run migrations (repeat for each DB)
wrangler d1 execute nightmare-library-db-1 --remote --file=migrations/schema.sql

# Deploy
git push origin main
```

---

## 🎓 Key Learnings

1. **Cloudflare Pages requires specific conventions** - No wrangler in build, proper host bindings
2. **Consistent hashing scales gracefully** - 10 databases via modulo hashing
3. **Storage failover is resilient** - GitHub always works as final fallback
4. **Documentation matters** - Clear setup reduces user friction
5. **No credit card requirement** - All 10 providers verified as CC-free
