# Cloudflare Pages Deployment & Database Sharding Setup

## Overview
This application is deployed to Cloudflare Pages with database sharding across 10 Cloudflare D1 databases. This architecture enables **up to 5GB total storage** (10 × 500MB limit per D1 database) while staying within free tier limits.

## Architecture

### Database Sharding
- **10 D1 Databases**: DB_1 through DB_10
- **Consistent Hashing**: Books are distributed across databases by book ID using a hash function
- **Automatic Routing**: The `DatabaseRouter` class automatically routes queries to the correct database
- **Aggregation**: List operations query all 10 databases and aggregate results

### Storage Providers (Cascading)
- Google Drive
- Dropbox
- OneDrive
- pCloud
- Box
- Yandex Disk
- Koofr
- Backblaze B2
- Mega
- GitHub (fallback)

## Setup Instructions

### 1. Create D1 Databases in Cloudflare Dashboard

Create 10 D1 databases in your Cloudflare account. Name them:
```
nightmare-library-db-1
nightmare-library-db-2
nightmare-library-db-3
nightmare-library-db-4
nightmare-library-db-5
nightmare-library-db-6
nightmare-library-db-7
nightmare-library-db-8
nightmare-library-db-9
nightmare-library-db-10
```

### 2. Get Database IDs

For each database, note the database ID from the Cloudflare Dashboard. You'll need these to configure bindings.

### 3. Configure Cloudflare Pages Bindings

In your Cloudflare Pages project settings, add these environment bindings:

**Production:**
```
DB_1 = nightmare-library-db-1 (D1 Database)
DB_2 = nightmare-library-db-2 (D1 Database)
DB_3 = nightmare-library-db-3 (D1 Database)
DB_4 = nightmare-library-db-4 (D1 Database)
DB_5 = nightmare-library-db-5 (D1 Database)
DB_6 = nightmare-library-db-6 (D1 Database)
DB_7 = nightmare-library-db-7 (D1 Database)
DB_8 = nightmare-library-db-8 (D1 Database)
DB_9 = nightmare-library-db-9 (D1 Database)
DB_10 = nightmare-library-db-10 (D1 Database)
```

**Also configure:**
- `KV_SESSIONS`: Cloudflare Workers KV namespace for sessions
- `KV_CACHE`: Cloudflare Workers KV namespace for caching
- `JWT_SECRET`: Your JWT secret key

### 4. Initialize Database Schemas

Run the migration script on each database. Use Cloudflare Wrangler:

```bash
# For each database, run:
wrangler d1 execute nightmare-library-db-1 --remote --file=migrations/schema.sql
wrangler d1 execute nightmare-library-db-2 --remote --file=migrations/schema.sql
# ... repeat for DB_3 through DB_10
```

### 5. Deploy to GitHub

Push to your GitHub repository. Cloudflare Pages will automatically build and deploy:

```bash
git push origin main
```

## Database Routing Logic

### How Data is Distributed

The `DatabaseRouter` class in `functions/db-router.ts` uses **consistent hashing**:

```typescript
function hashBookId(bookId: string): number {
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    const char = bookId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 10; // Returns 0-9
}
```

Each book's ID is hashed to determine which of the 10 databases stores it.

### Example
- Book ID `book_123` hashes to database 3 → stored in `DB_3`
- When fetching the book, the router automatically queries `DB_3`
- List operations query all 10 databases and aggregate

## API Functions Updated for Sharding

- **`/api/books/list`**: Queries all 10 databases, aggregates results
- **`/api/books/get`**: Routes to correct database by book ID
- **`/api/books/upload`**: Routes to correct database by book ID
- **`/api/books/delete`**: Routes to correct database by book ID

## Monitoring & Debugging

### Check Database Index
To see which database a book is stored in:
```typescript
const router = createDatabaseRouter(env);
const dbIndex = router.getDbIndex(bookId);
console.log(`Book stored in database: DB_${dbIndex + 1}`);
```

### Query Specific Database
```typescript
const router = createDatabaseRouter(env);
const db = router.queryForBook(bookId);
const result = await db.prepare("SELECT * FROM books WHERE id = ?").bind(bookId).first();
```

### Check Database Sizes
In Cloudflare Dashboard → D1 Databases, view the storage usage for each database.

## Environment Variables Required

```
DB_1 through DB_10      # D1 Database bindings
KV_SESSIONS             # Session storage
KV_CACHE                # Query caching
JWT_SECRET              # Session signing

# Optional storage provider credentials
GDRIVE_ACCESS_TOKEN, GDRIVE_FOLDER_ID
DROPBOX_ACCESS_TOKEN, DROPBOX_PATH
ONEDRIVE_ACCESS_TOKEN, ONEDRIVE_FOLDER_ID
# ... etc for other providers
```

## Next Steps

1. Create 10 D1 databases
2. Configure Cloudflare Pages bindings
3. Run schema migrations
4. Deploy to GitHub
5. Test book upload/list/read operations

The database router will automatically handle distribution and querying!
