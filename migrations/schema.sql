-- ============================================
-- Nightmare Library D1 Database Schema
-- Cloudflare D1 Compatible
-- ============================================
-- Run with: npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/schema.sql

-- ============================================
-- BOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    storage_provider TEXT NOT NULL,
    storage_id TEXT NOT NULL,
    cover_url TEXT,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    tags TEXT,
    total_pages INTEGER,
    is_favorite INTEGER DEFAULT 0,
    custom_order INTEGER DEFAULT 0,
    uploaded_at INTEGER NOT NULL,
    last_read_at INTEGER,
    last_read_position INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_books_uploaded ON books(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_favorite ON books(is_favorite);

-- ============================================
-- SHELVES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shelves (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#bb86fc',
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shelves_position ON shelves(position);

-- ============================================
-- SHELF ITEMS (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (shelf_id, book_id),
    FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shelf_items_book ON shelf_items(book_id);

-- ============================================
-- READING PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS progress (
    book_id TEXT PRIMARY KEY,
    percent INTEGER NOT NULL DEFAULT 0,
    current_page INTEGER,
    current_chapter TEXT,
    last_read_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_last_read ON progress(last_read_at DESC);

-- ============================================
-- USER SETTINGS (single-user app)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    reader_theme TEXT DEFAULT 'obsidian',
    reader_font_size INTEGER DEFAULT 16,
    sidebar_collapsed INTEGER DEFAULT 0,
    performance_mode INTEGER DEFAULT 0,
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_hash TEXT,
    updated_at INTEGER NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id, updated_at) VALUES (1, strftime('%s', 'now') * 1000);

-- ============================================
-- FULL-TEXT SEARCH INDEX
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_content_book ON book_content_index(book_id, position);

-- ============================================
-- READING STATISTICS
-- ============================================
CREATE TABLE IF NOT EXISTS reading_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    session_start INTEGER,
    session_end INTEGER,
    pages_read INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reading_stats_book ON reading_stats(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_stats_start ON reading_stats(session_start DESC);

-- ============================================
-- OFFLINE CACHE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS offline_cache (
    book_id TEXT PRIMARY KEY,
    cached_at INTEGER,
    cache_size INTEGER,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ============================================
-- STORAGE PROVIDER STATUS
-- ============================================
CREATE TABLE IF NOT EXISTS storage_providers (
    type TEXT PRIMARY KEY,
    healthy INTEGER DEFAULT 1,
    last_check INTEGER,
    error_count INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0
);

-- Insert default provider entries
INSERT OR IGNORE INTO storage_providers (type, healthy, last_check) 
VALUES 
    ('gdrive', 1, 0),
    ('dropbox', 1, 0),
    ('onedrive', 1, 0),
    ('pcloud', 1, 0),
    ('box', 1, 0),
    ('yandex', 1, 0),
    ('koofr', 1, 0),
    ('b2', 1, 0),
    ('mega', 1, 0),
    ('github', 1, 0);

-- ============================================
-- PROVIDER MAPPING (which provider has which file)
-- ============================================
CREATE TABLE IF NOT EXISTS provider_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    storage_id TEXT NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_verified INTEGER,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(book_id, provider_type, storage_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_mapping_book ON provider_mapping(book_id);
CREATE INDEX IF NOT EXISTS idx_provider_mapping_provider ON provider_mapping(provider_type);
CREATE INDEX IF NOT EXISTS idx_provider_mapping_primary ON provider_mapping(is_primary);

-- ============================================
-- 2FA SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS two_factor_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER DEFAULT 0,
    password_hash TEXT,
    backup_codes TEXT,
    created_at INTEGER,
    updated_at INTEGER NOT NULL
);
