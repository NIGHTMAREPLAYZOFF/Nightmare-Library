/**
 * Nightmare Library - Replit Development Server
 * Express.js backend with SQLite database
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'nightmare-library-dev-secret-key-change-in-production';
const PASSWORD = process.env.PASSWORD || 'nightmare123';

// Ensure directories exist
const dbDir = path.join(__dirname, '..', 'database');
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// Database setup
const db = new Database(path.join(dbDir, 'library.db'));
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    storage_provider TEXT NOT NULL DEFAULT 'local',
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

  CREATE TABLE IF NOT EXISTS shelves (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#bb86fc',
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (shelf_id, book_id)
  );

  CREATE TABLE IF NOT EXISTS progress (
    book_id TEXT PRIMARY KEY,
    percent INTEGER NOT NULL DEFAULT 0,
    current_page INTEGER,
    current_chapter TEXT,
    last_read_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    reader_theme TEXT DEFAULT 'obsidian',
    reader_font_size INTEGER DEFAULT 16,
    sidebar_collapsed INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_books_uploaded ON books(uploaded_at DESC);
  CREATE INDEX IF NOT EXISTS idx_books_last_read ON books(last_read_at DESC);
`);

// Insert default settings if not exists
const settingsExists = db.prepare('SELECT 1 FROM settings WHERE id = 1').get();
if (!settingsExists) {
  db.prepare('INSERT INTO settings (id, updated_at) VALUES (1, ?)').run(Date.now());
}

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Multer for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}-${Date.now()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.epub' || ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only EPUB and PDF files are allowed'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Auth middleware - verifies JWT token
function authMiddleware(req, res, next) {
  const token = req.cookies.NMLR_SESSION;
  
  if (!token) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.redirect('/');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    return res.redirect('/');
  }
}

// HTML snippet generator
function generateBookCardHtml(book) {
  const progress = book.progress || 0;
  const tags = (book.tags || '').split(',').filter(t => t.trim());
  const badgesHtml = tags.slice(0, 2).map(t => 
    `<span class="badge">${escapeHtml(t.trim())}</span>`
  ).join('');

  return `<article class="book-card" data-id="${book.id}" role="listitem" tabindex="0">
    <div class="book-cover-container">
        <img class="book-cover" src="/api/books/cover/${book.id}" alt="${escapeHtml(book.title)} cover" loading="lazy" onerror="this.src='/frontend/assets/broken-image.svg'">
        <svg class="progress-ring" viewBox="0 0 36 36">
            <circle class="progress-ring-bg" cx="18" cy="18" r="16"/>
            <circle class="progress-ring-fill" cx="18" cy="18" r="16" stroke-dasharray="${progress}, 100"/>
            <text x="18" y="20" class="progress-text">${progress}%</text>
        </svg>
    </div>
    <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
    <p class="book-author">${escapeHtml(book.author) || 'Unknown Author'}</p>
    <div class="badges">${badgesHtml}</div>
    <button class="card-menu" aria-label="Book options">&#8942;</button>
</article>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Static files - serve from parent directory (Cloudflare structure)
app.use('/frontend', express.static(path.join(__dirname, '..', '..', 'frontend')));

// Root serves login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'index.html'));
});

// Protected frontend routes
app.get('/frontend/dashboard.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dashboard.html'));
});

app.get('/frontend/reader.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'reader.html'));
});

// ==================== AUTH API ====================

app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  
  if (password !== PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }
  
  const token = jwt.sign(
    { authenticated: true, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.cookie('NMLR_SESSION', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
  
  res.json({ success: true, redirect: '/frontend/dashboard.html' });
});

// ==================== BOOKS API ====================

app.get('/api/books/list', authMiddleware, (req, res) => {
  try {
    const books = db.prepare(`
      SELECT b.*, COALESCE(p.percent, 0) as progress
      FROM books b
      LEFT JOIN progress p ON b.id = p.book_id
      ORDER BY b.uploaded_at DESC
    `).all();
    
    const booksWithSnippets = books.map(book => ({
      ...book,
      snippet_html: generateBookCardHtml(book)
    }));
    
    res.json({ success: true, books: booksWithSnippets });
  } catch (error) {
    console.error('List books error:', error);
    res.status(500).json({ success: false, message: 'Failed to load books', books: [] });
  }
});

app.get('/api/books/get', authMiddleware, (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ success: false, message: 'Book ID required' });
  }
  
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    const progress = db.prepare('SELECT * FROM progress WHERE book_id = ?').get(id);
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    
    res.json({
      success: true,
      book,
      progress: progress || { percent: 0, current_page: 1 },
      settings: settings ? {
        readerTheme: settings.reader_theme,
        fontSize: settings.reader_font_size
      } : { readerTheme: 'obsidian', fontSize: 16 }
    });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ success: false, message: 'Failed to load book' });
  }
});

app.post('/api/books/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    
    const { title, author, tags } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title required' });
    }
    
    const bookId = `book-${nanoid(10)}`;
    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO books (id, title, author, storage_provider, storage_id, file_type, file_size, tags, uploaded_at)
      VALUES (?, ?, ?, 'local', ?, ?, ?, ?, ?)
    `).run(bookId, title, author || null, req.file.filename, fileType, req.file.size, tags || null, now);
    
    const book = { id: bookId, title, author, tags, file_type: fileType, progress: 0 };
    
    res.json({
      success: true,
      book: { ...book, snippet_html: generateBookCardHtml(book) }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

app.put('/api/books/update', authMiddleware, (req, res) => {
  const { id, title, author, tags } = req.body;
  
  if (!id || !title) {
    return res.status(400).json({ success: false, message: 'ID and title required' });
  }
  
  try {
    db.prepare('UPDATE books SET title = ?, author = ?, tags = ? WHERE id = ?')
      .run(title, author || null, tags || null, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

app.delete('/api/books/delete', authMiddleware, (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ success: false, message: 'Book ID required' });
  }
  
  try {
    const book = db.prepare('SELECT storage_id FROM books WHERE id = ?').get(id);
    if (book) {
      const filePath = path.join(uploadsDir, book.storage_id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    db.prepare('DELETE FROM shelf_items WHERE book_id = ?').run(id);
    db.prepare('DELETE FROM progress WHERE book_id = ?').run(id);
    db.prepare('DELETE FROM books WHERE id = ?').run(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

app.get('/api/books/cover/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'assets', 'broken-image.svg'));
});

app.get('/api/books/file/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  try {
    const book = db.prepare('SELECT storage_id, file_type FROM books WHERE id = ?').get(id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    
    const filePath = path.join(uploadsDir, book.storage_id);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const contentType = book.file_type === 'epub' ? 'application/epub+zip' : 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('File error:', error);
    res.status(500).json({ success: false, message: 'Failed to load file' });
  }
});

app.get('/api/books/progress', authMiddleware, (req, res) => {
  const { bookId } = req.query;
  if (!bookId) return res.status(400).json({ success: false, message: 'Book ID required' });
  
  const progress = db.prepare('SELECT * FROM progress WHERE book_id = ?').get(bookId);
  res.json({ success: true, progress: progress || { percent: 0, current_page: 1 } });
});

app.post('/api/books/progress', authMiddleware, (req, res) => {
  const { bookId, percent, currentPage, currentChapter } = req.body;
  if (!bookId) return res.status(400).json({ success: false, message: 'Book ID required' });
  
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO progress (book_id, percent, current_page, current_chapter, last_read_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(book_id) DO UPDATE SET
      percent = excluded.percent,
      current_page = excluded.current_page,
      current_chapter = excluded.current_chapter,
      last_read_at = excluded.last_read_at
  `).run(bookId, percent || 0, currentPage || null, currentChapter || null, now);
  
  db.prepare('UPDATE books SET last_read_at = ? WHERE id = ?').run(now, bookId);
  
  res.json({ success: true });
});

// ==================== SHELVES API ====================

app.get('/api/shelves/list', authMiddleware, (req, res) => {
  try {
    const shelves = db.prepare('SELECT * FROM shelves ORDER BY position ASC').all();
    
    const shelvesWithBooks = shelves.map(shelf => {
      const bookIds = db.prepare('SELECT book_id FROM shelf_items WHERE shelf_id = ?')
        .all(shelf.id).map(r => r.book_id);
      return { ...shelf, bookIds };
    });
    
    res.json({ success: true, shelves: shelvesWithBooks });
  } catch (error) {
    console.error('List shelves error:', error);
    res.status(500).json({ success: false, message: 'Failed to load shelves', shelves: [] });
  }
});

app.post('/api/shelves/create', authMiddleware, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required' });
  
  const shelfId = `shelf-${nanoid(8)}`;
  const now = Date.now();
  const maxPos = db.prepare('SELECT MAX(position) as max FROM shelves').get();
  const position = (maxPos?.max ?? -1) + 1;
  
  db.prepare('INSERT INTO shelves (id, name, color, position, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(shelfId, name, color || '#bb86fc', position, now);
  
  res.json({ success: true, shelf: { id: shelfId, name, color: color || '#bb86fc', position } });
});

app.put('/api/shelves/update', authMiddleware, (req, res) => {
  const { id, name, color } = req.body;
  if (!id || !name) return res.status(400).json({ success: false, message: 'ID and name required' });
  
  db.prepare('UPDATE shelves SET name = ?, color = ? WHERE id = ?').run(name, color || '#bb86fc', id);
  res.json({ success: true });
});

app.delete('/api/shelves/delete', authMiddleware, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Shelf ID required' });
  
  db.prepare('DELETE FROM shelf_items WHERE shelf_id = ?').run(id);
  db.prepare('DELETE FROM shelves WHERE id = ?').run(id);
  res.json({ success: true });
});

app.post('/api/shelves/add-book', authMiddleware, (req, res) => {
  const { bookId, shelfId } = req.body;
  if (!bookId || !shelfId) return res.status(400).json({ success: false, message: 'Book and shelf IDs required' });
  
  const existing = db.prepare('SELECT 1 FROM shelf_items WHERE shelf_id = ? AND book_id = ?').get(shelfId, bookId);
  if (existing) return res.status(400).json({ success: false, message: 'Book already in shelf' });
  
  db.prepare('INSERT INTO shelf_items (shelf_id, book_id, added_at) VALUES (?, ?, ?)').run(shelfId, bookId, Date.now());
  res.json({ success: true });
});

app.delete('/api/shelves/remove-book', authMiddleware, (req, res) => {
  const { bookId, shelfId } = req.body;
  if (!bookId || !shelfId) return res.status(400).json({ success: false, message: 'Book and shelf IDs required' });
  
  db.prepare('DELETE FROM shelf_items WHERE shelf_id = ? AND book_id = ?').run(shelfId, bookId);
  res.json({ success: true });
});

// ==================== SETTINGS API ====================

app.get('/api/settings/get', authMiddleware, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({
    success: true,
    settings: settings ? {
      readerTheme: settings.reader_theme,
      fontSize: settings.reader_font_size,
      sidebarCollapsed: !!settings.sidebar_collapsed
    } : { readerTheme: 'obsidian', fontSize: 16, sidebarCollapsed: false }
  });
});

app.put('/api/settings/update', authMiddleware, (req, res) => {
  const { readerTheme, fontSize, sidebarCollapsed } = req.body;
  
  db.prepare(`
    UPDATE settings SET
      reader_theme = COALESCE(?, reader_theme),
      reader_font_size = COALESCE(?, reader_font_size),
      sidebar_collapsed = COALESCE(?, sidebar_collapsed),
      updated_at = ?
    WHERE id = 1
  `).run(readerTheme || null, fontSize || null, sidebarCollapsed !== undefined ? (sidebarCollapsed ? 1 : 0) : null, Date.now());
  
  res.json({ success: true });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nightmare Library running at http://0.0.0.0:${PORT}`);
  console.log(`Default password: ${PASSWORD}`);
});
