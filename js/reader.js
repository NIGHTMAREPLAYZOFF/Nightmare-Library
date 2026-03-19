/**
 * Reader — Nightmare Library
 * Handles EPUB and PDF rendering
 */

const readerFrame = document.getElementById('reader-frame');
const pdfContainer = document.getElementById('pdf-container');
const readerLoading = document.getElementById('reader-loading');
const bookTitle = document.getElementById('book-title');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');
const prevBtn = document.getElementById('prev-page-btn');
const nextBtn = document.getElementById('next-page-btn');
const backBtn = document.getElementById('back-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const fontIncBtn = document.getElementById('font-increase-btn');
const fontDecBtn = document.getElementById('font-decrease-btn');
const readerThemeBtn = document.getElementById('reader-theme-btn');

let currentPage = 1;
let totalPages = 1;
let fontSize = 16;
let bookId = null;
let bookType = null;

// ── Navigation ───────────────────────────────────────────────────────────────
backBtn?.addEventListener('click', () => window.location.href = '/dashboard.html');

fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
});

// ── Theme ────────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.classList.toggle('dark-theme', savedTheme === 'dark');
readerThemeBtn?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// ── Font Size ────────────────────────────────────────────────────────────────
fontIncBtn?.addEventListener('click', () => {
    fontSize = Math.min(fontSize + 2, 28);
    applyFontSize();
});
fontDecBtn?.addEventListener('click', () => {
    fontSize = Math.max(fontSize - 2, 10);
    applyFontSize();
});
const applyFontSize = () => {
    if (readerFrame?.contentDocument?.body) {
        readerFrame.contentDocument.body.style.fontSize = `${fontSize}px`;
    }
    localStorage.setItem('reader-font-size', fontSize);
};

// ── Page Navigation ──────────────────────────────────────────────────────────
const updatePageUI = () => {
    currentPageEl.textContent = currentPage;
    totalPagesEl.textContent = totalPages;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
};

prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; updatePageUI(); }
});
nextBtn?.addEventListener('click', () => {
    if (currentPage < totalPages) { currentPage++; updatePageUI(); }
});

// ── Load Book ────────────────────────────────────────────────────────────────
const loadBook = async (id) => {
    bookId = id;
    try {
        const res = await fetch(`/api/books/${encodeURIComponent(id)}`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = '/'; return; }
        if (!res.ok) throw new Error('Book not found');

        const book = await res.json();
        bookTitle.textContent = book.title || 'Unknown Title';
        document.title = `${book.title} — Nightmare Library`;
        bookType = book.file_type;

        const fileRes = await fetch(`/api/books/${encodeURIComponent(id)}/file`, { credentials: 'include' });
        if (!fileRes.ok) throw new Error('Failed to load book file');

        readerLoading.classList.add('hidden');

        if (bookType === 'pdf') {
            await loadPDF(fileRes);
        } else {
            await loadEPUB(fileRes, book);
        }

        savedFontSize = parseInt(localStorage.getItem('reader-font-size') || '16');
        fontSize = savedFontSize;
    } catch (err) {
        readerLoading.querySelector('p').textContent = `Error: ${err.message}`;
    }
};

const loadPDF = async (res) => {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    pdfContainer.classList.remove('hidden');
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = 'application/pdf';
    embed.style.cssText = 'width:100%;height:100%;border:none;';
    pdfContainer.style.cssText = 'width:100%;height:100%;padding:0;';
    pdfContainer.appendChild(embed);
};

const loadEPUB = async (res, book) => {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    readerFrame.classList.remove('hidden');
    readerFrame.src = url;
};

// ── Init ─────────────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
if (id) {
    loadBook(id);
} else {
    readerLoading.querySelector('p').textContent = 'No book specified.';
}

updatePageUI();
