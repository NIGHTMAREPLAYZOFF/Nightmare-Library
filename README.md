# Nightmare Library

A private, self-hosted digital library for managing and reading EPUB and PDF books with an obsidian-black themed interface.

## Project Structure

- **Root** - Cloudflare Pages version (production-ready)
- **`/replit-version`** - Replit development version for local testing

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

## Cloudflare Deployment

See `CLOUDFLARE_SETUP.md` for complete deployment instructions.

```bash
# Deploy to Cloudflare Pages
npm run deploy
```

## Replit Development

```bash
# Run the Replit development version
npm run replit:dev
```

## Theme

- Primary Background: `#0a0a0a`
- Secondary Background: `#111111`
- Card Background: `#1a1a1a`
- Accent Color: `#bb86fc`
- Text Primary: `#e0e0e0`

## License

MIT
