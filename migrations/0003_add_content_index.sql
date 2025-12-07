
-- Book Content Index for Full-Text Search
CREATE TABLE IF NOT EXISTS book_content_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id TEXT NOT NULL,
  chapter TEXT,
  snippet TEXT NOT NULL,
  content_text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_content_book_id ON book_content_index(book_id);
CREATE INDEX idx_content_search ON book_content_index(content_text);
