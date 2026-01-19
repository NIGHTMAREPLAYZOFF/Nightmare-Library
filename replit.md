# replit.md

## Overview

This is a Cloudflare Pages/Workers project that uses Wrangler for development and deployment. The project appears to be a web application deployed to Cloudflare's edge computing platform, with serverless functions handling backend logic. The repository includes security scanning reports (Wapiti vulnerability scanner output), suggesting security is a consideration for this project.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Edge Computing Platform
- **Platform**: Cloudflare Pages with Workers for serverless functions
- **Build Tool**: Wrangler CLI for local development and deployment
- **Runtime**: Cloudflare Workers runtime (V8 isolates)

### Request Handling
- Middleware pattern for request processing with facade architecture
- Request body draining middleware for proper resource cleanup
- JSON error handling middleware for development (Miniflare)
- CF-Connecting-IP header stripping for security in outbound requests

### Development Setup
- Local development uses Wrangler's Pages dev server
- Temporary build bundles are generated in `.wrangler/tmp/` directories
- Functions are compiled to ESM format (`.mjs` files)

### Security Considerations
- Security scanning with Wapiti (vulnerability reports in `security_report/`)
- Semgrep rules configured for TypeScript security auditing
- CORS regex validation rules to prevent misconfigured wildcards

## External Dependencies

### Cloudflare Services
- **Cloudflare Pages**: Static site hosting with edge functions
- **Cloudflare Workers**: Serverless function execution
- **Wrangler**: CLI tool for development and deployment (configured in `.config/.wrangler/`)

### Security Tools
- **Wapiti**: Web application vulnerability scanner (reports stored in `security_report/`)
- **Nuclei**: Security vulnerability scanning templates (configured in `.config/nuclei/`)
- **Semgrep**: Static analysis for security auditing (rules in `.config/replit/.semgrep/`)

### Development Dependencies
- Node.js runtime environment
- TypeScript for type-safe development
- ESBuild (bundled with Wrangler) for fast compilation