# Nightmare Library

A private, self-hosted digital library for managing and reading EPUB and PDF books with an obsidian-black themed interface.

## Features

- Password-based authentication with JWT tokens
- EPUB and PDF book management
- Reading progress tracking with visual indicators
- Custom shelves and tag organization
- Client-side fuzzy search
- Responsive book grid layout
- Obsidian-black theme with purple accents
- Multi-provider storage (R2, S3, GCS, Backblaze)
- GitHub fallback storage for reliability

## Quick Start

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd nightmare-library
npm install
```

### 2. Configure Cloudflare Resources
```bash
# Create D1 database
npx wrangler d1 create nightmare-library-db

# Create KV namespaces
npx wrangler kv:namespace create "KV_SESSIONS"
npx wrangler kv:namespace create "KV_CACHE"
npx wrangler kv:namespace create "KV_RATE_LIMIT"

# Update wrangler.toml with the IDs from above commands
```

### 3. Set Secrets
```bash
# Required secrets
npx wrangler secret put PASSWORD
npx wrangler secret put JWT_SECRET

# At least one storage provider (GitHub recommended for fallback)
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_OWNER
```

### 4. Run Migrations
```bash
npm run db:migrate:all
```

### 5. Deploy
```bash
# Validate configuration first
npm run predeploy

# Deploy to Cloudflare Pages
npm run deploy
```

## Local Development

```bash
# Test locally with Wrangler
npm run dev
```

Visit http://localhost:8788 to access your local instance.

## Deployment

See `CLOUDFLARE_SETUP.md` for complete deployment instructions including storage provider setup.

## Theme

- Primary Background: `#0a0a0a`
- Secondary Background: `#111111`
- Card Background: `#1a1a1a`
- Accent Color: `#bb86fc`
- Text Primary: `#e0e0e0`

## License

MIT
