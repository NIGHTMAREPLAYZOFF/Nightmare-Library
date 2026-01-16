# Technical Documentation: Secrets, KVs, and D1

## 1. Secrets (Environment Variables)
| Key | Description | Source |
|-----|-------------|--------|
| `PASSWORD` | Library Access Password | User Defined |
| `SUPABASE_URL` | Supabase Project URL | Supabase Console |
| `SUPABASE_KEY` | Supabase Anon Key | Supabase Console |
| `JWT_SECRET` | Token Signing Key | Generated (openssl rand -hex 32) |
| `GDRIVE_TOKEN` | Google Drive OAuth | Google Cloud Console |
| `DROPBOX_TOKEN` | Dropbox API Token | Dropbox Developer |

## 2. KV Namespaces
- `KV_SESSIONS`: Stores session tokens.
- `KV_CACHE`: Caches API results.

## 3. D1 Databases
- `DB_1` through `DB_10`: Sharded metadata storage.

---

## Deployment Guide (Cloudflare Dashboard)
1. **Pages**: Create project → Upload folder (root).
2. **Settings → Functions**: Bind 10 D1 databases as `DB_1`, `DB_2`...
3. **Settings → Environment Variables**: Add `PASSWORD`, etc.
4. **Settings → KV**: Bind `KV_SESSIONS`.

## Deployment Guide (Wrangler CLI)
```bash
# Bind D1
wrangler d1 create library-shard-1
# Repeat for 1-10
# Deploy
wrangler pages deploy .
```
