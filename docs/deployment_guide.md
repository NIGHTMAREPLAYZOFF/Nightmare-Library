# Nightmare Library: Deployment Guide

## Enhanced Project Structure
- `src/`: Optimized frontend assets and HTML.
- `functions/`: Cloudflare Pages Functions (Hono API).
- `database/`: Supabase and Firebase configuration scripts.
- `docs/`: Technical documentation and analysis.

## Setup Instructions
1. **Cloudflare Pages**:
   - Build Command: `npm run build`
   - Build Directory: `src`
2. **Databases**:
   - **Supabase**: Run `database/supabase/migrations.sql` in the SQL Editor.
   - **Firebase**: Apply rules from `database/firebase/rules.json`.
3. **Environment Variables**:
   - `PASSWORD`: Your secret library password.

## Potential Implementation Challenges
- **Cold Starts**: Cloudflare Workers may have slight latency on first request; mitigated by lightweight Hono framework.
- **Database Limits**: Free tiers have row/storage limits; sharding (as described in README) helps manage growth.
