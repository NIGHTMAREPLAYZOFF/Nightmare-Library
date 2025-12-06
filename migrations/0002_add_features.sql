
-- Add favorites and tags
ALTER TABLE books ADD COLUMN is_favorite INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN custom_order INTEGER DEFAULT 0;

-- Create full-text search index table
CREATE TABLE IF NOT EXISTS book_content_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    chapter TEXT,
    content_text TEXT,
    snippet TEXT,
    position INTEGER,
    created_at INTEGER,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_content_search ON book_content_index(content_text);
CREATE INDEX idx_book_content ON book_content_index(book_id, position);

-- Add reading statistics
CREATE TABLE IF NOT EXISTS reading_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    session_start INTEGER,
    session_end INTEGER,
    pages_read INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Add offline cache tracking
CREATE TABLE IF NOT EXISTS offline_cache (
    book_id TEXT PRIMARY KEY,
    cached_at INTEGER,
    cache_size INTEGER,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
