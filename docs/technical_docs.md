# Technical Documentation: Cloudflare Configuration

## 1. Cloudflare Secrets (Dashboard)
**DO NOT use .env files for sensitive data.**
In **Cloudflare Dashboard** → **Pages** → **Settings** → **Environment variables**, add these under **Production** (and optionally Preview) using the "Secret" type:

| Key | Description |
|-----|-------------|
| `PASSWORD` | Library Access Password |
| `JWT_SECRET` | Secret for token signing |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase service role or anon key |

## 2. D1 Database Bindings
In **Settings** → **Functions** → **D1 database bindings**, bind your 10 databases:
- `DB_1`
- `DB_2`
- ... through `DB_10`

---

## Deployment (Mobile Friendly)
1. **Connect Repository**: Connect your GitHub repo to Cloudflare Pages.
2. **Setup Variables**: Add the Secrets listed above.
3. **Bind Databases**: Ensure all 10 D1 databases are bound as `DB_1` to `DB_10`.
4. **Deploy**: Cloudflare will automatically build and deploy using `npm run build`.
