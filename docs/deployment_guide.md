# Nightmare Library: Deployment Guide

## Enhanced Project Structure
- `src/`: Optimized frontend assets and HTML.
- `src/js/`: Modular application logic.
- `src/css/`: Modular stylesheets.
- `src/components/`: Reusable UI elements (Toasts, etc).
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

## Security Features
- **Secure Headers**: HSTS, CSP, X-Frame-Options.
- **Auth Middleware**: CORS and Hono secure-headers.
- **Input Sanitization**: Server-side validation.
