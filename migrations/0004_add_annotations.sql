
-- Annotations and Highlights
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter TEXT,
  position TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('highlight', 'note', 'bookmark')),
  color TEXT,
  text TEXT,
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_annotations_book_id ON annotations(book_id);
CREATE INDEX idx_annotations_type ON annotations(type);
