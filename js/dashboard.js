/**
 * Dashboard — Nightmare Library
 * Handles book listing, search, upload and navigation
 */

const booksContainer = document.getElementById('books-container');
const searchInput = document.getElementById('search-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadModal = document.getElementById('upload-modal');
const closeUploadModal = document.getElementById('close-upload-modal');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const logoutBtn = document.getElementById('logout-btn');
const shelvesList = document.getElementById('shelves-list');

let allBooks = [];
let currentFilter = 'all';
let currentView = 'grid';

// ── Theme ────────────────────────────────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle');
const applyTheme = (theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('theme', theme);
};
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
themeBtn?.addEventListener('click', () => {
    const next = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
});

// ── Logout ───────────────────────────────────────────────────────────────────
logoutBtn?.addEventListener('click', async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
        window.location.href = '/';
    }
});

// ── View toggle ──────────────────────────────────────────────────────────────
gridViewBtn?.addEventListener('click', () => {
    currentView = 'grid';
    booksContainer.className = 'books-grid';
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    renderBooks(filteredBooks());
});
listViewBtn?.addEventListener('click', () => {
    currentView = 'list';
    booksContainer.className = 'books-list';
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
    renderBooks(filteredBooks());
});

// ── Sidebar filter ───────────────────────────────────────────────────────────
document.querySelectorAll('.sidebar-item[data-filter]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentFilter = item.dataset.filter;
        renderBooks(filteredBooks());
    });
});

// ── Search ───────────────────────────────────────────────────────────────────
searchInput?.addEventListener('input', () => {
    renderBooks(filteredBooks());
});

const filteredBooks = () => {
    const q = searchInput?.value?.toLowerCase() || '';
    return allBooks.filter(book => {
        const matchesSearch = !q ||
            book.title?.toLowerCase().includes(q) ||
            book.author?.toLowerCase().includes(q) ||
            book.tags?.toLowerCase().includes(q);
        const matchesFilter =
            currentFilter === 'all' ||
            (currentFilter === 'epub' && book.file_type === 'epub') ||
            (currentFilter === 'pdf' && book.file_type === 'pdf') ||
            (currentFilter === 'recent' && book.progress > 0);
        return matchesSearch && matchesFilter;
    });
};

// ── Render Books ─────────────────────────────────────────────────────────────
const renderBooks = (books) => {
    if (!books.length) {
        booksContainer.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <h3>No books found</h3>
                <p>Upload your first EPUB or PDF to get started.</p>
            </div>`;
        return;
    }

    booksContainer.innerHTML = books.map(book => {
        const progress = book.progress || 0;
        const coverHtml = book.cover_url
            ? `<img src="${escHtml(book.cover_url)}" alt="${escHtml(book.title)}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="book-cover-placeholder">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                 <span>${escHtml(book.file_type?.toUpperCase())}</span>
               </div>`;
        return `
            <div class="book-card" data-id="${escHtml(book.id)}" onclick="openBook('${escHtml(book.id)}')">
                <div class="book-cover">
                    ${coverHtml}
                    <span class="book-type-badge">${escHtml(book.file_type)}</span>
                </div>
                <div class="book-info">
                    <div class="book-title">${escHtml(book.title)}</div>
                    <div class="book-author">${escHtml(book.author || 'Unknown Author')}</div>
                    ${progress > 0 ? `<div class="book-progress"><div class="book-progress-fill" style="width:${progress}%"></div></div>` : ''}
                </div>
            </div>`;
    }).join('');
};

const escHtml = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

const openBook = (id) => {
    window.location.href = `/reader.html?id=${encodeURIComponent(id)}`;
};

// ── Fetch Books ──────────────────────────────────────────────────────────────
const loadBooks = async () => {
    try {
        const res = await fetch('/api/books', { credentials: 'include' });
        if (res.status === 401) { window.location.href = '/'; return; }
        allBooks = await res.json();
        renderBooks(filteredBooks());
    } catch (err) {
        booksContainer.innerHTML = `<div class="empty-state"><h3>Failed to load library</h3><p>${err.message}</p></div>`;
    }
};

// ── Upload Modal ─────────────────────────────────────────────────────────────
uploadBtn?.addEventListener('click', () => uploadModal.classList.remove('hidden'));
closeUploadModal?.addEventListener('click', () => uploadModal.classList.add('hidden'));
uploadModal?.querySelector('.modal-overlay')?.addEventListener('click', () => uploadModal.classList.add('hidden'));

dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
});
fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleUpload(file);
});

const handleUpload = async (file) => {
    const allowed = ['application/epub+zip', 'application/pdf'];
    const allowedExts = ['.epub', '.pdf'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
        alert('Only EPUB and PDF files are supported.');
        return;
    }

    dropZone.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    progressFill.style.width = '10%';
    progressText.textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/books/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        progressFill.style.width = '100%';
        if (res.ok) {
            progressText.textContent = 'Upload complete!';
            setTimeout(() => {
                uploadModal.classList.add('hidden');
                dropZone.classList.remove('hidden');
                uploadProgress.classList.add('hidden');
                progressFill.style.width = '0%';
                fileInput.value = '';
                loadBooks();
            }, 1000);
        } else {
            const data = await res.json();
            progressText.textContent = `Upload failed: ${data.message || 'Unknown error'}`;
        }
    } catch (err) {
        progressText.textContent = `Upload failed: ${err.message}`;
    }
};

// ── Init ─────────────────────────────────────────────────────────────────────
loadBooks();
