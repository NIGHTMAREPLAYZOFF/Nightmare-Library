# Nightmare Library - Changes Log

## Version 2.0.0 - Major Refactor (December 2024)

This update completely overhauls Nightmare Library for Cloudflare Pages compliance, security, performance, and feature accuracy.

---

### Infrastructure Changes

#### Storage Providers Expanded (4 → 10)
**Added:**
- OneDrive (5GB free)
- pCloud (10GB free)
- Box (10GB free)
- Yandex Disk (10GB free)
- Koofr (10GB free)
- Backblaze B2 (10GB free)

**Existing:**
- Google Drive (15GB free)
- Dropbox (2GB free)
- Mega.nz (20GB, ONE account only)
- GitHub (4GB fallback limit)

**Why:** More storage options = more free space for users without credit cards.

#### Cascading Failover Logic
- Automatic failover between providers
- Provider health tracking with automatic recovery
- Priority-based ordering
- GitHub remains final fallback (4GB limit enforced)

**File:** `functions/storage-proxy.ts`

---

### AI Features Refactor

#### Removed (Bloat/Inaccuracy)
- ❌ Auto-genre assignment - Removed completely
- ❌ Client-side AI processing - Moved to backend

#### Backend-Only AI (New)
- ✅ `/api/ai/recommend` - Book recommendations based on reading history
- ✅ `/api/ai/analytics` - Reading statistics, XP, achievements, streaks
- ✅ `/api/ai/summary` - Chapter summary extraction (first sentences)
- ✅ `/api/ai/genre` - User-initiated genre suggestions (must confirm)

**Why:** AI features must provide measurable value. Auto-genre was inaccurate and bloated.

---

### Security Enhancements

#### Optional 2FA Protection
- Lock all books under user-defined password
- Enable/disable via settings
- Constant-time password comparison
- Session-based verification

**File:** `functions/api/security/two-factor.ts`

#### Existing Security (Verified)
- Input sanitization via `dom-helpers.js`
- Secure session management (HttpOnly, Secure, SameSite cookies)
- Rate limiting on login attempts
- IP/User-Agent session validation
- HTTPS enforced

---

### Performance Optimization

#### Performance Mode Toggle
- ⚡ Performance Mode: No animations, no shadows, minimal styling
- ✨ Visual Mode: Full features, animations, gradients

**File:** `frontend/scripts/performance-mode.js`

#### Text-Only Reader Fallback
- For extremely low-end devices (Nokia-level)
- No EPUB.js or PDF.js required
- Plain text rendering with chapters
- Touch swipe navigation

**File:** `frontend/scripts/text-only-reader.js`

#### Service Worker (Offline Caching)
- Static assets cached on install
- Book content cached for offline reading
- API responses cached with stale-while-revalidate
- Background sync for reading progress

**File:** `frontend/sw.js`

#### Bundle Size Targets
- Target: <200KB per feature
- Lazy loading for images
- Virtual scrolling for large libraries
- Debounced event handlers

---

### Database Changes

#### Consolidated Schema
Old migration files merged into single D1-compatible schema:
- `migrations/schema.sql` - Complete database structure

#### New Tables
- `storage_providers` - Provider health tracking
- Added `two_factor_enabled`, `two_factor_hash` to settings
- Added `performance_mode` to settings

#### Removed
- Old migration files (0001_init.sql, 0002_add_features.sql)

---

### Documentation Updates

#### CLOUDFLARE_SETUP.md
- Updated for 10 storage providers
- D1 SQL schema included
- KV namespace setup
- Secret management guide

#### This File (CHANGES.md)
- Complete changelog with quirks/humor
- Bloat removal justifications
- Compliance reasons

---

### Files Modified

| File | Purpose |
|------|---------|
| `functions/storage-proxy.ts` | 10 storage providers with failover |
| `functions/api/ai/recommend.ts` | Backend recommendations |
| `functions/api/ai/analytics.ts` | Reading statistics & XP |
| `functions/api/ai/summary.ts` | Chapter summaries |
| `functions/api/ai/genre.ts` | User-initiated genre suggestions |
| `functions/api/security/two-factor.ts` | Optional 2FA |
| `frontend/scripts/ai-features.js` | Client wrapper for backend AI |
| `frontend/scripts/performance-mode.js` | Performance/Visual toggle |
| `frontend/scripts/text-only-reader.js` | Minimal reader fallback |
| `frontend/sw.js` | Service Worker for offline |
| `frontend/dashboard.html` | Added SW registration |
| `migrations/schema.sql` | Consolidated D1 schema |
| `wrangler.toml` | Updated secrets documentation |
| `CLOUDFLARE_SETUP.md` | Complete setup guide |

---

### Bloat Removed

1. **Auto-genre on upload** - Inaccurate, annoying, removed entirely
2. **Client-side AI processing** - Moved to backend for accuracy
3. **Duplicate DOM manipulation** - Using safe helpers only
4. **Unused analytics tracking** - Removed dead code
5. **Heavy frontend logic** - Backend handles computation

---

### Quirks & Notes

🐛 **The Mega.nz Situation**: Mega requires complex client-side encryption. Current implementation is simplified. For full Mega support, a proper library would be needed. Consider it "best effort" until then.

📱 **Performance Mode Auto-Detection**: The app will politely suggest Performance Mode if it detects a potato device. Users can dismiss this forever if they're brave.

⚡ **GitHub 4GB Limit**: The app tracks total GitHub storage usage to prevent hitting the limit. If you manage to fill 4GB with books, congratulations on your reading habits!

🔐 **2FA Password**: This is separate from your main login password. Yes, you can have two different passwords. No, we won't judge your security paranoia.

---

### Compliance Checklist

- [x] Cloudflare Pages compatible
- [x] Static frontend only
- [x] /functions for heavy computation
- [x] WASM only for animations (none currently used)
- [x] Secrets in Cloudflare Dashboard only
- [x] D1 database compatible
- [x] KV namespaces for caching/sessions
- [x] HTTPS enforced
- [x] Input sanitization
- [x] Secure session management
- [x] Performance optimized for low-end devices

---

### Next Steps (Future Improvements)

1. Implement proper Mega.nz encryption
2. Add book cover generation from EPUB
3. Implement TOTP-based 2FA (optional upgrade)
4. Add reading statistics visualization
5. Implement cloud bookmark sync

---

*Built with spite and determination. May your books never be lost to the void.*
