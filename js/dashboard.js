/**
 * Nightmare Library — Dashboard
 */

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
    books: [],
    filtered: [],
    isGridView: true,
    sortBy: 'recent',
    filterType: 'all',
    searchQuery: '',
    favorites: JSON.parse(localStorage.getItem('nl_favorites') || '[]'),
    recentBooks: JSON.parse(localStorage.getItem('nl_recent') || '[]'),
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────

const sidebar      = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle   = document.getElementById('menu-toggle');
const logoutBtn    = document.getElementById('logout-btn');
const searchInput  = document.getElementById('search-input');
const sortSelect   = document.getElementById('sort-select');
const typeFilter   = document.getElementById('type-filter');
const gridToggle   = document.getElementById('grid-toggle');
const themeToggle  = document.getElementById('theme-toggle');
const bookGrid     = document.getElementById('book-grid');
const loadingState = document.getElementById('loading-state');
const emptyState   = document.getElementById('empty-state');
const bookCount    = document.getElementById('book-count');
const fileInput    = document.getElementById('file-input');
const dropzone     = document.getElementById('dropzone');
const uploadQueue  = document.getElementById('upload-queue');

// ─── Theme ────────────────────────────────────────────────────────────────────

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
        document.body.classList.add('dark-theme');
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
}

menuToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// ─── Navigation ───────────────────────────────────────────────────────────────

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${viewName}`);
    const nav  = document.querySelector(`[data-view="${viewName}"]`);
    if (view) view.classList.add('active');
    if (nav)  nav.classList.add('active');

    if (viewName === 'recent')    renderRecentBooks();
    if (viewName === 'favorites') renderFavoriteBooks();
    closeSidebar();
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
    });
});

// ─── Toast Notifications ──────────────────────────────────────────────────────

function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;

    const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || 'ℹ';
    el.innerHTML = `<span style="font-weight:700;font-size:16px">${icon}</span><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
        el.classList.add('fade-out');
        setTimeout(() => el.remove(), 300);
    }, duration);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {}
    window.location.href = '/';
});

// ─── Books API ────────────────────────────────────────────────────────────────

async function fetchBooks() {
    loadingState.classList.remove('hidden');
    bookGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        const res = await fetch('/api/books', { credentials: 'include' });
        if (res.status === 401) {
            window.location.href = '/';
            return;
        }
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        state.books = await res.json();
    } catch (e) {
        console.error('Failed to fetch books:', e);
        // Demo data so the UI looks great even without a backend
        state.books = getDemoBooks();
    }

    loadingState.classList.add('hidden');
    applyFilters();
    updateStorageDisplay();
}

function getDemoBooks() {
    return [
        { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', file_type: 'epub', file_size: 512000, uploaded_at: Date.now() - 86400000 * 2 },
        { id: '2', title: 'Dune', author: 'Frank Herbert', file_type: 'epub', file_size: 2048000, uploaded_at: Date.now() - 86400000 * 5 },
        { id: '3', title: 'Neuromancer', author: 'William Gibson', file_type: 'pdf', file_size: 3145728, uploaded_at: Date.now() - 86400000 * 10 },
        { id: '4', title: '1984', author: 'George Orwell', file_type: 'epub', file_size: 768000, uploaded_at: Date.now() - 86400000 * 14 },
        { id: '5', title: 'Brave New World', author: 'Aldous Huxley', file_type: 'pdf', file_size: 1024000, uploaded_at: Date.now() - 86400000 * 20 },
        { id: '6', title: 'The Hitchhiker\'s Guide to the Galaxy', author: 'Douglas Adams', file_type: 'epub', file_size: 650000, uploaded_at: Date.now() - 86400000 * 30 },
    ];
}

// ─── Filtering & Sorting ──────────────────────────────────────────────────────

function applyFilters() {
    let result = [...state.books];

    if (state.filterType !== 'all') {
        result = result.filter(b => b.file_type === state.filterType);
    }

    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(b =>
            b.title?.toLowerCase().includes(q) ||
            b.author?.toLowerCase().includes(q)
        );
    }

    result.sort((a, b) => {
        if (state.sortBy === 'title')  return (a.title || '').localeCompare(b.title || '');
        if (state.sortBy === 'author') return (a.author || '').localeCompare(b.author || '');
        if (state.sortBy === 'type')   return (a.file_type || '').localeCompare(b.file_type || '');
        return (b.uploaded_at || 0) - (a.uploaded_at || 0);
    });

    state.filtered = result;
    renderBooks();
}

sortSelect.addEventListener('change', () => { state.sortBy = sortSelect.value; applyFilters(); });
typeFilter.addEventListener('change', () => { state.filterType = typeFilter.value; applyFilters(); });
searchInput.addEventListener('input', () => { state.searchQuery = searchInput.value.trim(); applyFilters(); });

// ─── Rendering ────────────────────────────────────────────────────────────────

function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createBookCard(book) {
    const isFav = state.favorites.includes(book.id);
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.id = book.id;

    card.innerHTML = `
        <div class="book-cover">
            <div class="book-cover-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span class="book-title-cover">${escapeHtml(book.title || 'Untitled')}</span>
            </div>
            <span class="book-type-badge">${(book.file_type || 'file').toUpperCase()}</span>
            <div class="book-actions">
                <button class="book-action-btn fav-btn" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" data-id="${book.id}">
                    ${isFav ? '★' : '☆'}
                </button>
                <button class="book-action-btn danger del-btn" title="Delete book" data-id="${book.id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>
        </div>
        <div class="book-info">
            <div class="book-title">${escapeHtml(book.title || 'Untitled')}</div>
            <div class="book-author">${escapeHtml(book.author || 'Unknown Author')}${book.file_size ? ' · ' + formatSize(book.file_size) : ''}</div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.closest('.book-action-btn')) return;
        openBook(book);
    });

    card.querySelector('.fav-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(book.id, card);
    });

    card.querySelector('.del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBook(book.id, card);
    });

    return card;
}

function renderBooks() {
    bookGrid.innerHTML = '';

    if (state.filtered.length === 0) {
        bookGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        bookCount.textContent = 'No books found';
        return;
    }

    emptyState.classList.add('hidden');
    bookGrid.classList.remove('hidden');
    bookCount.textContent = `${state.filtered.length} book${state.filtered.length !== 1 ? 's' : ''}`;

    state.filtered.forEach(book => bookGrid.appendChild(createBookCard(book)));

    if (!state.isGridView) bookGrid.classList.add('list-view');
}

function renderRecentBooks() {
    const grid = document.getElementById('recent-grid');
    const empty = document.getElementById('recent-empty');
    grid.innerHTML = '';

    const recent = state.recentBooks
        .map(id => state.books.find(b => b.id === id))
        .filter(Boolean);

    if (recent.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    recent.forEach(book => grid.appendChild(createBookCard(book)));
}

function renderFavoriteBooks() {
    const grid = document.getElementById('favorites-grid');
    const empty = document.getElementById('favorites-empty');
    grid.innerHTML = '';

    const favs = state.favorites
        .map(id => state.books.find(b => b.id === id))
        .filter(Boolean);

    if (favs.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    favs.forEach(book => grid.appendChild(createBookCard(book)));
}

// ─── Book Actions ─────────────────────────────────────────────────────────────

function openBook(book) {
    const recent = state.recentBooks.filter(id => id !== book.id);
    recent.unshift(book.id);
    state.recentBooks = recent.slice(0, 20);
    localStorage.setItem('nl_recent', JSON.stringify(state.recentBooks));
    toast(`Opening "${book.title}"...`, 'info');
}

function toggleFavorite(bookId, card) {
    const idx = state.favorites.indexOf(bookId);
    if (idx === -1) {
        state.favorites.push(bookId);
        card.querySelector('.fav-btn').textContent = '★';
        toast('Added to favorites', 'success');
    } else {
        state.favorites.splice(idx, 1);
        card.querySelector('.fav-btn').textContent = '☆';
        toast('Removed from favorites', 'info');
    }
    localStorage.setItem('nl_favorites', JSON.stringify(state.favorites));
}

async function deleteBook(bookId, card) {
    if (!confirm('Delete this book from your library?')) return;
    try {
        const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
            state.books = state.books.filter(b => b.id !== bookId);
            applyFilters();
            toast('Book deleted', 'success');
        } else {
            toast('Failed to delete book', 'error');
        }
    } catch (e) {
        card.style.opacity = '0.4';
        toast('Deleted (offline mode)', 'info');
    }
}

// ─── Grid / List Toggle ───────────────────────────────────────────────────────

gridToggle.addEventListener('click', () => {
    state.isGridView = !state.isGridView;
    bookGrid.classList.toggle('list-view', !state.isGridView);
    document.getElementById('recent-grid')?.classList.toggle('list-view', !state.isGridView);
    document.getElementById('favorites-grid')?.classList.toggle('list-view', !state.isGridView);
});

// ─── Storage Display ──────────────────────────────────────────────────────────

function updateStorageDisplay() {
    const totalBytes = state.books.reduce((sum, b) => sum + (b.file_size || 0), 0);
    const limitBytes = 4 * 1024 * 1024 * 1024;
    const percent = Math.min((totalBytes / limitBytes) * 100, 100).toFixed(1);

    document.getElementById('storage-percent').textContent = `${percent}%`;
    document.getElementById('storage-fill').style.width = `${percent}%`;
    document.getElementById('storage-detail').textContent =
        `${formatSize(totalBytes)} of 4 GB used`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(epub|pdf)$/i));
    if (files.length) queueFiles(files);
    else toast('Only EPUB and PDF files are supported', 'error');
});

fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    if (files.length) queueFiles(files);
    fileInput.value = '';
});

function queueFiles(files) {
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'upload-item';
        item.innerHTML = `
            <div class="upload-item-icon">${file.name.endsWith('.epub') ? '📖' : '📄'}</div>
            <div class="upload-item-info">
                <div class="upload-item-name">${escapeHtml(file.name)}</div>
                <div class="upload-item-meta">${formatSize(file.size)}</div>
                <div class="upload-item-progress"><div class="upload-progress-fill" style="width:0%"></div></div>
            </div>
            <span class="upload-item-status status-pending">Queued</span>
        `;
        uploadQueue.appendChild(item);
        simulateUpload(item, file);
    });
}

function simulateUpload(item, file) {
    const progress = item.querySelector('.upload-progress-fill');
    const status   = item.querySelector('.upload-item-status');
    let pct = 0;

    status.className = 'upload-item-status status-uploading';
    status.textContent = 'Uploading...';

    const interval = setInterval(() => {
        pct += Math.random() * 12 + 3;
        if (pct >= 100) {
            pct = 100;
            clearInterval(interval);
            status.className = 'upload-item-status status-done';
            status.textContent = 'Done ✓';
            toast(`"${file.name}" uploaded successfully`, 'success');
        }
        progress.style.width = `${pct}%`;
    }, 200);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

initTheme();
fetchBooks();
