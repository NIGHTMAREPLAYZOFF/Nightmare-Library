# Cloudflare Setup Instructions

## 1. Create D1 Database

Run this command to create the D1 database:

```bash
npx wrangler d1 create nightmare-library-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml` under `[[d1_databases]]`.

## 2. Create KV Namespaces

Run these commands to create KV namespaces:

```bash
npx wrangler kv:namespace create "KV_SESSIONS"
npx wrangler kv:namespace create "KV_CACHE"
```

Copy each `id` from the output and paste into `wrangler.toml` under the corresponding `[[kv_namespaces]]`.

## 3. Run Database Migrations

After creating D1, run the SQL schema:

```bash
npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/0001_init.sql
```

## 4. Set All Required Secrets

### SECRET: PASSWORD
- **Purpose**: Master password for login authentication
- **Required Data**: A strong password string (min 12 characters recommended)
- **Command**: `npx wrangler secret put PASSWORD`

### SECRET: JWT_SECRET
- **Purpose**: Signs authentication tokens
- **Required Data**: Random 64+ character string (use a password generator)
- **Command**: `npx wrangler secret put JWT_SECRET`

### SECRET: STORAGE_PROVIDER_1_TYPE
- **Purpose**: Type of primary storage provider
- **Required Data**: One of: `r2`, `s3`, `gcs`, `backblaze`
- **Command**: `npx wrangler secret put STORAGE_PROVIDER_1_TYPE`

### SECRET: STORAGE_PROVIDER_1_BUCKET
- **Purpose**: Bucket name for primary storage
- **Required Data**: Your bucket name (e.g., `nightmare-library-books`)
- **Command**: `npx wrangler secret put STORAGE_PROVIDER_1_BUCKET`

### SECRET: STORAGE_PROVIDER_1_ACCESS_KEY
- **Purpose**: Access key/ID for storage provider
- **Required Data**: 
  - For R2: R2 Access Key ID from Cloudflare dashboard
  - For S3: AWS Access Key ID
  - For GCS: Service account client email
- **Command**: `npx wrangler secret put STORAGE_PROVIDER_1_ACCESS_KEY`

### SECRET: STORAGE_PROVIDER_1_SECRET_KEY
- **Purpose**: Secret key for storage provider
- **Required Data**:
  - For R2: R2 Secret Access Key from Cloudflare dashboard
  - For S3: AWS Secret Access Key
  - For GCS: Service account private key (JSON string)
- **Command**: `npx wrangler secret put STORAGE_PROVIDER_1_SECRET_KEY`

### SECRET: STORAGE_PROVIDER_1_ENDPOINT (Optional for S3/R2)
- **Purpose**: Custom endpoint URL
- **Required Data**: 
  - For R2: `https://<account_id>.r2.cloudflarestorage.com`
  - For S3: Leave empty or custom endpoint
- **Command**: `npx wrangler secret put STORAGE_PROVIDER_1_ENDPOINT`

### SECRET: STORAGE_PROVIDER_1_REGION (Optional)
- **Purpose**: Storage region
- **Required Data**: Region code (e.g., `us-east-1`, `auto` for R2)
- **Command**: `npx wrangler secret put STORAGE_PROVIDER_1_REGION`

### SECRET: GITHUB_FALLBACK_TOKEN
- **Purpose**: GitHub Personal Access Token for fallback storage
- **Required Data**: GitHub PAT with `repo` scope (for creating private repos)
- **How to create**:
  1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
  2. Generate new token (classic) with `repo` scope
  3. Copy the token
- **Command**: `npx wrangler secret put GITHUB_FALLBACK_TOKEN`

### SECRET: GITHUB_FALLBACK_OWNER
- **Purpose**: GitHub username for fallback storage repos
- **Required Data**: Your GitHub username
- **Command**: `npx wrangler secret put GITHUB_FALLBACK_OWNER`

## 5. Connect GitHub to Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project" → "Connect to Git"
3. Authorize GitHub and select your repository
4. Configure build settings:
   - Project name: `nightmare-library`
   - Production branch: `main`
   - Build command: `npm run build` (or leave empty if no build needed)
   - Build output directory: `/cloudflare-version`
5. Go to Settings → Functions → Add bindings for D1 and KV
6. Go to Settings → Environment Variables → Add all secrets
7. Deploy!

## Summary of All Secrets

| Secret Name | Required | Description |
|-------------|----------|-------------|
| PASSWORD | Yes | Master login password |
| JWT_SECRET | Yes | Random 64+ char string for token signing |
| STORAGE_PROVIDER_1_TYPE | Yes | `r2`, `s3`, `gcs`, or `backblaze` |
| STORAGE_PROVIDER_1_BUCKET | Yes | Bucket name |
| STORAGE_PROVIDER_1_ACCESS_KEY | Yes | Provider access key/ID |
| STORAGE_PROVIDER_1_SECRET_KEY | Yes | Provider secret key |
| STORAGE_PROVIDER_1_ENDPOINT | No | Custom endpoint URL |
| STORAGE_PROVIDER_1_REGION | No | Region code |
| GITHUB_FALLBACK_TOKEN | Yes | GitHub PAT for fallback storage |
| GITHUB_FALLBACK_OWNER | Yes | GitHub username |

## GitHub Fallback Storage

When primary storage is unavailable or returns errors, the system automatically:

1. Creates a private repository named `nightmare-library-storage-{timestamp}`
2. Uploads files as base64-encoded content
3. Stores file references in the database
4. Seamlessly retrieves files when needed

This ensures your library remains functional even if your primary storage provider has issues.

## Testing Locally

```bash
cd cloudflare-version
npx wrangler pages dev
```

Create a `.dev.vars` file with your secrets for local testing:

```
PASSWORD=your-test-password
JWT_SECRET=your-64-char-secret-key-here-make-it-long-and-random
STORAGE_PROVIDER_1_TYPE=r2
STORAGE_PROVIDER_1_BUCKET=test-bucket
STORAGE_PROVIDER_1_ACCESS_KEY=your-access-key
STORAGE_PROVIDER_1_SECRET_KEY=your-secret-key
GITHUB_FALLBACK_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_FALLBACK_OWNER=your-github-username
```
