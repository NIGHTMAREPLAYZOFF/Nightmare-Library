# Nightmare Library

A private, self-hosted digital library for managing and reading EPUB and PDF books with an obsidian-black themed interface.

## Project Structure

This project contains two versions:

- **`/cloudflare-version`** - Production-ready for Cloudflare Pages deployment
- **`/replit-version`** - Development version for local testing in Replit

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

## Quick Start (Replit Development)

```bash
npm run dev
```

## Cloudflare Deployment

See `cloudflare-version/CLOUDFLARE_SETUP.md` for complete deployment instructions.

```bash
npm run cf:deploy
```

## Theme

- Primary Background: `#0a0a0a`
- Secondary Background: `#111111`
- Card Background: `#1a1a1a`
- Accent Color: `#bb86fc`
- Text Primary: `#e0e0e0`

## License

MIT
