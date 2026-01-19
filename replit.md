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
## Environment Restoration Note (January 19, 2026)
Following a manual deletion of replit.nix, the environment has been partially restored. 
Workflows are currently configured to use absolute Nix paths for critical tools:
- Python: /nix/store/flbj8bq2vznkcwss7sm0ky8rd0k6kar7-python-wrapped-0.1.0/bin/python3
- Bun: /nix/store/c2fmismsm893gbrl9i7aw08ggj2vf1ws-bun-1.2.16-wrapped/bin/bun

To fully restore the shell environment (including 'node' and 'npm' in PATH), the user should re-add these modules via the Replit 'Packages' or 'Modules' UI, which will regenerate the replit.nix file.

## AI Capabilities
- **Ollama**: Installed via Nix system package. Available globally as `ollama`.
- **Local Models**: Recommended to run Qwen 2.5 Coder or DeepSeek R1 (smaller parameter versions) for coding assistance within the shell.
- **Startup**: Use `./start_ollama.sh` to ensure the server is running.

## Manual Restore Paths
Workflows use absolute Nix paths for critical tools:
- Python: /nix/store/flbj8bq2vznkcwss7sm0ky8rd0k6kar7-python-wrapped-0.1.0/bin/python3
- Bun: /nix/store/c2fmismsm893gbrl9i7aw08ggj2vf1ws-bun-1.2.16-wrapped/bin/bun
