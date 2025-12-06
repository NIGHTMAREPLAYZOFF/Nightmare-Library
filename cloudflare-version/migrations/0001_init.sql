-- Nightmare Library Database Schema
-- Run with: npx wrangler d1 execute nightmare-library-db --remote --file=./migrations/0001_init.sql

-- Books table
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
    uploaded_at INTEGER NOT NULL,
    last_read_at INTEGER,
    last_read_position INTEGER DEFAULT 0
);

-- Shelves table
CREATE TABLE IF NOT EXISTS shelves (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#bb86fc',
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- Shelf items (many-to-many relationship)
CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (shelf_id, book_id),
    FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Reading progress
CREATE TABLE IF NOT EXISTS progress (
    book_id TEXT PRIMARY KEY,
    percent INTEGER NOT NULL DEFAULT 0,
    current_page INTEGER,
    current_chapter TEXT,
    last_read_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- User settings (single row for single-user app)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    reader_theme TEXT DEFAULT 'obsidian',
    reader_font_size INTEGER DEFAULT 16,
    sidebar_collapsed INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id, updated_at) VALUES (1, strftime('%s', 'now'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_uploaded ON books(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_progress_last_read ON progress(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_shelves_position ON shelves(position);
CREATE INDEX IF NOT EXISTS idx_shelf_items_book ON shelf_items(book_id);
