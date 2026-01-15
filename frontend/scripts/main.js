/**
 * Nightmare Library - Main Dashboard Script
 * Handles book display, uploads, shelves, and user interactions
 */

import { createElement, createElementWithText, batchAppend, clearElement, replaceChildren, escapeHtml } from './dom-helpers.js';

// State
let allBooks = [];
let allShelves = [];
let currentView = 'all';
let currentBookId = null;
let currentFilter = 'all';
let currentSort = 'recent';
let settings = {
    readerTheme: 'obsidian',
    fontSize: 16
};
let isOffline = false;

// DOM Elements
const elements = {
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    menuToggle: document.getElementById('menu-toggle'),
    searchInput: document.getElementById('search-input'),
    booksGrid: document.getElementById('books-grid'),
    recentlyReadGrid: document.getElementById('recently-read-grid'),
    recentlyReadSection: document.getElementById('recently-read-section'),
    emptyState: document.getElementById('empty-state'),
    fab: document.getElementById('fab'),
    contextMenu: document.getElementById('context-menu'),
    shelvesList: document.getElementById('shelves-list'),
    tagsList: document.getElementById('tags-list'),
    bookCount: document.getElementById('book-count'),
    shelfCount: document.getElementById('shelf-count'),
    libraryTitle: document.getElementById('library-title'),
    toastContainer: document.getElementById('toast-container')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Lazy loading observer
let lazyLoadObserver = null;

// Undo stack for quick actions
let undoStack = [];
const MAX_UNDO = 10;

async function init() {
    setupEventListeners();
    setupLazyLoading();
    setupDragAndDrop();
    setupOfflineDetection();
    setupFilterAndSort();
    await loadData();
    initializeVirtualization();
}

function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const img = card.querySelector('img[data-src]');
                    if (img) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        card.classList.add('loaded');
                    }
                    lazyLoadObserver.unobserve(card);
                }
            });
        }, { rootMargin: '50px' });
    }
}

function initializeVirtualization() {
    // For large libraries (>100 books), use virtual scrolling
    if (allBooks.length > 100) {
        console.log('Virtualizing large library with', allBooks.length, 'books');
        // Virtual scrolling implementation would go here
    }
}

function setupOfflineDetection() {
    const updateOnlineStatus = () => {
        isOffline = !navigator.onLine;
        const indicator = document.getElementById('offline-indicator');
        
        if (!indicator) {
            const div = document.createElement('div');
            div.id = 'offline-indicator';
            div.className = 'offline-indicator';
            document.body.appendChild(div);
        }
        
        const indicatorEl = document.getElementById('offline-indicator');
        if (isOffline) {
            indicatorEl.textContent = '📡 Offline Mode';
            indicatorEl.classList.remove('online');
        } else {
            indicatorEl.textContent = '✓ Connected';
            indicatorEl.classList.add('online');
            setTimeout(() => {
                indicatorEl.style.display = 'none';
            }, 2000);
        }
        indicatorEl.style.display = 'block';
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    if (!navigator.onLine) {
        updateOnlineStatus();
    }
}

function setupFilterAndSort() {
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            applyFiltersAndSort();
        });
    });

    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFiltersAndSort();
        });
    }
}

function applyFiltersAndSort() {
    let filtered = [...allBooks];

    // Apply filter
    switch (currentFilter) {
        case 'favorites':
            filtered = filtered.filter(b => b.is_favorite);
            break;
        case 'recent':
            filtered = filtered.filter(b => b.last_read_at).sort((a, b) => b.last_read_at - a.last_read_at);
            break;
        case 'unread':
            filtered = filtered.filter(b => !b.progress || b.progress < 5);
            break;
        case 'reading':
            filtered = filtered.filter(b => b.progress > 5 && b.progress < 95);
            break;
        case 'finished':
            filtered = filtered.filter(b => b.progress >= 95);
            break;
    }

    // Apply sort
    switch (currentSort) {
        case 'title':
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'author':
            filtered.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
            break;
        case 'progress':
            filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
            break;
        case 'recent':
            filtered.sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0));
            break;
    }

    renderBooks(filtered, 'all-books-grid');
}

function setupDragAndDrop() {
    let draggedElement = null;
    let draggedBookId = null;

    elements.booksGrid.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.book-card');
        if (card) {
            draggedElement = card;
            draggedBookId = card.dataset.id;
            card.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    elements.booksGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const afterElement = getDragAfterElement(elements.booksGrid, e.clientY);
        const draggable = document.querySelector('.book-card[style*="opacity"]');

        if (afterElement == null) {
            elements.booksGrid.appendChild(draggable);
        } else {
            elements.booksGrid.insertBefore(draggable, afterElement);
        }
    });

    elements.booksGrid.addEventListener('dragend', (e) => {
        if (draggedElement) {
            draggedElement.style.opacity = '1';
            draggedElement = null;
            draggedBookId = null;
            saveBookOrder();
        }
    });

    elements.booksGrid.addEventListener('drop', (e) => {
        e.preventDefault();
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.book-card:not([style*="opacity"])')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveBookOrder() {
    const bookIds = [...elements.booksGrid.querySelectorAll('.book-card')].map(card => card.dataset.id);

    try {
        await fetch('/api/books/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookIds })
        });
        showToast('Book order saved', 'success');
    } catch (error) {
        console.error('Failed to save order:', error);
    }
}

function setupEventListeners() {
    // Sidebar toggle
    elements.menuToggle.addEventListener('click', toggleSidebar);

    // Search with debounce
    elements.searchInput.addEventListener('input', debounce(handleSearch, 200));

    // FAB
    elements.fab.addEventListener('click', openUploadModal);

    // Upload buttons
    document.getElementById('upload-sidebar-btn').addEventListener('click', openUploadModal);
    document.getElementById('empty-upload-btn')?.addEventListener('click', openUploadModal);

    // Modals
    setupModalListeners();

    // Context menu
    document.addEventListener('click', hideContextMenu);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Add shelf button
    document.getElementById('add-shelf-btn').addEventListener('click', () => openShelfModal());

    // Settings
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);

    // Sidebar navigation
    document.querySelector('[data-view="all"]').addEventListener('click', () => {
        setActiveView('all');
        renderBooks([], 'all-books-grid'); // Pass empty array to ensure virtualShelf renders
    });
}

function setupModalListeners() {
    // Upload modal
    const uploadModal = document.getElementById('upload-modal');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    document.getElementById('upload-modal-close').addEventListener('click', closeUploadModal);
    document.getElementById('upload-cancel')?.addEventListener('click', closeUploadModal);
    document.getElementById('upload-submit')?.addEventListener('click', handleUpload);

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', handleFileDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Edit modal
    document.getElementById('edit-modal-close').addEventListener('click', closeEditModal);
    document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
    document.getElementById('edit-submit').addEventListener('click', handleEditSubmit);

    // Shelf modal
    document.getElementById('shelf-modal-close').addEventListener('click', closeShelfModal);
    document.getElementById('shelf-cancel').addEventListener('click', closeShelfModal);
    document.getElementById('shelf-submit').addEventListener('click', handleShelfSubmit);

    // Add to shelf modal
    document.getElementById('add-to-shelf-modal-close').addEventListener('click', closeAddToShelfModal);

    // Delete modal
    document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
    document.getElementById('delete-confirm').addEventListener('click', handleDeleteConfirm);

    // Settings modal
    document.getElementById('settings-modal-close').addEventListener('click', closeSettingsModal);
    document.getElementById('settings-cancel').addEventListener('click', closeSettingsModal);
    document.getElementById('settings-save').addEventListener('click', handleSettingsSave);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
            }
        });
    });
}

// Data loading
async function loadData() {
    try {
        await Promise.all([
            loadBooks(),
            loadShelves(),
            loadSettings()
        ]);
        updateStats();
        renderTags(); // Render tags after all books are loaded
    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Failed to load library data', 'error');
    }
}

async function loadBooks() {
    try {
        const response = await fetch('/api/books/list');
        const data = await response.json();

        if (data.success) {
            allBooks = data.books || [];
            renderBooks([], 'all-books-grid'); // Initial render for virtual shelf
            renderRecentlyRead();
            updateFabVisibility();
        }
    } catch (error) {
        console.error('Failed to load books:', error);
    }
}

async function loadShelves() {
    try {
        const response = await fetch('/api/shelves/list');
        const data = await response.json();

        if (data.success) {
            allShelves = data.shelves || [];
            renderShelves();
        }
    } catch (error) {
        console.error('Failed to load shelves:', error);
    }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/settings/get');
        const data = await response.json();

        if (data.success && data.settings) {
            settings = data.settings;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}


// Virtualized Bookshelf for Performance
class VirtualBookshelf {
    constructor(containerId, itemHeight = 280, itemsPerRow = 4) {
        this.container = document.getElementById(containerId);
        this.itemHeight = itemHeight;
        this.itemsPerRow = itemsPerRow;
        this.books = [];
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTimeout = null;
        this.isInitialized = false; // Flag to prevent multiple initializations
    }

    setBooks(books) {
        this.books = books;
        if (!this.isInitialized) {
            this.setupScrollListener();
            this.isInitialized = true;
        }
        this.render();
        this.updateVisibleRange(); // Initial update
    }

    setupScrollListener() {
        if (!this.container) return;

        const handleScroll = () => {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.updateVisibleRange();
            }, 50); // More frequent updates during scroll
        };

        // Use window scroll for simplicity, assuming the bookshelf is the main content
        window.addEventListener('scroll', handleScroll);

        // Also listen for resize events to re-calculate ranges
        window.addEventListener('resize', () => {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.updateVisibleRange();
            }, 50);
        });
    }

    updateVisibleRange() {
        if (!this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const scrollTop = window.scrollY + containerRect.top; // Relative scroll within the container
        const viewportHeight = window.innerHeight;

        // Calculate the start and end rows that are potentially visible
        const startRow = Math.floor(scrollTop / this.itemHeight);
        const endRow = Math.ceil((scrollTop + viewportHeight) / this.itemHeight);

        // Calculate the exact indices for the books array
        this.visibleRange = {
            // Ensure we don't render too far before the visible area, and not past the beginning
            start: Math.max(0, startRow * this.itemsPerRow - this.itemsPerRow * 2),
            // Ensure we render enough to fill the viewport and a bit more, and not past the end
            end: Math.min(this.books.length, endRow * this.itemsPerRow + this.itemsPerRow * 2)
        };

        this.renderVisible();
    }

    renderVisible() {
        if (!this.container) return;

        const currentlyRenderedCount = this.container.children.length;
        const neededCount = this.visibleRange.end - this.visibleRange.start;

        // Only re-render if the number of needed items has significantly changed
        if (Math.abs(currentlyRenderedCount - neededCount) > this.itemsPerRow) {
            this.render();
        } else {
            // If counts are similar, update existing elements if needed (more complex optimization)
            // For now, we'll stick to re-rendering the whole visible set if count changes substantially
        }
    }

    render() {
        if (!this.container) return;

        const startIndex = this.visibleRange.start;
        const endIndex = this.visibleRange.end;
        const visibleBooks = this.books.slice(startIndex, endIndex);

        // Calculate the total height needed for the container to enable scrolling
        const totalHeight = this.books.length * this.itemHeight;
        this.container.style.height = `${totalHeight}px`;

        // Build cards using safe DOM methods
        const fragment = document.createDocumentFragment();
        
        visibleBooks.forEach((book, index) => {
            const bookIndexInAllBooks = startIndex + index;
            const topOffset = bookIndexInAllBooks * this.itemHeight;
            
            const card = createElement('div', {
                className: 'book-card',
                dataset: { bookId: book.id },
                tabindex: '0',
                role: 'button',
                'aria-label': `Open ${book.title || 'book'}`,
                style: {
                    position: 'absolute',
                    top: `${topOffset}px`,
                    left: '0',
                    width: '100%',
                    height: `${this.itemHeight}px`
                }
            });
            
            const content = this.createBookCardContent(book);
            card.appendChild(content);
            fragment.appendChild(card);
        });

        // Replace all children at once
        clearElement(this.container);
        this.container.appendChild(fragment);

        // Attach event listeners using event delegation
        this.attachEventListeners();
    }

    createBookCardContent(book) {
        const inner = createElement('div', {
            className: 'book-card-inner',
            style: {
                height: `${this.itemHeight}px`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '10px'
            }
        });

        // Cover container
        const coverContainer = createElement('div', { className: 'book-cover-container' });
        const coverImg = createElement('img', {
            className: 'book-cover',
            src: `/api/books/cover/${book.id}`,
            alt: `${book.title || 'Book'} cover`,
            loading: 'lazy',
            style: {
                height: `${this.itemHeight * 0.7}px`,
                objectFit: 'contain'
            }
        });
        coverImg.onerror = function() { this.src = '/frontend/assets/broken-image.svg'; };
        coverContainer.appendChild(coverImg);
        inner.appendChild(coverContainer);

        // Title
        const title = createElementWithText('h3', book.title || 'Untitled', {
            className: 'book-title',
            title: book.title || 'Untitled'
        });
        inner.appendChild(title);

        // Author
        const author = createElementWithText('p', book.author || 'Unknown Author', {
            className: 'book-author'
        });
        inner.appendChild(author);

        // Badges
        const tags = (book.tags || '').split(',').filter(t => t.trim());
        const badgesContainer = createElement('div', { className: 'badges' });
        tags.slice(0, 2).forEach(tag => {
            const badge = createElementWithText('span', tag.trim(), { className: 'badge' });
            badgesContainer.appendChild(badge);
        });
        inner.appendChild(badgesContainer);

        // Progress bar
        if (book.progress > 0) {
            const progressContainer = createElement('div', { className: 'book-progress' });
            const progressBar = createElement('div', { className: 'progress-bar' });
            const progressFill = createElement('div', {
                className: 'progress-fill',
                style: { width: `${book.progress}%` }
            });
            const progressText = createElementWithText('span', `${Math.round(book.progress)}%`, {
                className: 'progress-text'
            });
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            progressContainer.appendChild(progressText);
            inner.appendChild(progressContainer);
        }

        // Favorite badge
        if (book.is_favorite) {
            const favBadge = createElementWithText('span', '⭐', {
                className: 'favorite-badge',
                style: {
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    fontSize: '20px'
                }
            });
            inner.appendChild(favBadge);
        }

        // Menu button
        const menuBtn = createElementWithText('button', '⋮', {
            className: 'card-menu',
            'aria-label': 'Book options',
            'aria-haspopup': 'menu',
            style: {
                position: 'absolute',
                top: '5px',
                right: '5px'
            }
        });
        inner.appendChild(menuBtn);

        return inner;
    }

    attachEventListeners() {
        // Use event delegation on the container
        if (this.handleClick) this.container.removeEventListener('click', this.handleClick);
        if (this.handleKeyPress) this.container.removeEventListener('keypress', this.handleKeyPress);

        this.handleClick = (e) => {
            const card = e.target.closest('.book-card');
            if (card) {
                const menuButton = card.querySelector('.card-menu');
                if (menuButton && menuButton.contains(e.target)) {
                    e.stopPropagation(); // Prevent opening book if menu is clicked
                    showContextMenu(e, card.dataset.bookId);
                } else {
                    openBook(card.dataset.bookId);
                }
            }
        };

        this.handleKeyPress = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const card = e.target.closest('.book-card');
                if (card) {
                    e.preventDefault();
                    openBook(card.dataset.bookId);
                }
            }
        };

        this.container.addEventListener('click', this.handleClick);
        this.container.addEventListener('keypress', this.handleKeyPress);
    }

    // Method to get the singleton instance or create it
    static getInstance(containerId, itemHeight = 280, itemsPerRow = 4) {
        if (!VirtualBookshelf.instance) {
            VirtualBookshelf.instance = new VirtualBookshelf(containerId, itemHeight, itemsPerRow);
        }
        return VirtualBookshelf.instance;
    }
}

// Helper to get the singleton instance of VirtualBookshelf
function getVirtualShelfInstance() {
    return VirtualBookshelf.getInstance('all-books-grid');
}

// Initialize virtual shelf
const virtualShelf = getVirtualShelfInstance();

function renderBooks(books, containerId) {
    if (containerId === 'all-books-grid') {
        virtualShelf.setBooks(books);
    } else {
        // Legacy rendering for other grids like 'recently-read-grid'
        const container = document.getElementById(containerId);
        if (!container) return;

        if (books.length === 0) {
            clearElement(container);
            const emptyMsg = createElementWithText('p', 'No books yet. Upload your first book!', {
                style: {
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: '40px'
                }
            });
            container.appendChild(emptyMsg);
            return;
        }

        // Build cards safely
        const fragment = document.createDocumentFragment();
        const virtualShelfInstance = getVirtualShelfInstance();
        
        books.forEach(book => {
            const card = createElement('div', {
                className: 'book-card',
                dataset: { bookId: book.id },
                tabindex: '0',
                role: 'button'
            });
            
            const content = virtualShelfInstance.createBookCardContent(book);
            card.appendChild(content);
            
            // Add click handler
            card.addEventListener('click', (e) => {
                const menuButton = card.querySelector('.card-menu');
                if (menuButton && menuButton.contains(e.target)) {
                    e.stopPropagation();
                    showContextMenu(e, card.dataset.bookId);
                } else {
                    openBook(card.dataset.bookId);
                }
            });
            
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openBook(card.dataset.bookId);
                }
            });
            
            fragment.appendChild(card);
        });

        clearElement(container);
        container.appendChild(fragment);
    }
}

function renderRecentlyRead() {
    const recentBooks = [...allBooks]
        .filter(b => b.last_read_at)
        .sort((a, b) => b.last_read_at - a.last_read_at)
        .slice(0, 6);

    if (recentBooks.length === 0) {
        elements.recentlyReadSection.style.display = 'none';
        return;
    }

    elements.recentlyReadSection.style.display = 'block';
    // Use the renderBooks function for consistency, specifying the container
    renderBooks(recentBooks, 'recently-read-grid');
}

function renderShelves() {
    const fragment = document.createDocumentFragment();
    
    allShelves.forEach(shelf => {
        const isActive = currentView === `shelf:${shelf.id}`;
        const li = createElement('li', {
            className: `sidebar-item ${isActive ? 'active' : ''}`,
            dataset: { view: `shelf:${shelf.id}` }
        });
        
        const colorSpan = createElement('span', {
            className: 'shelf-color',
            style: { background: shelf.color || '#bb86fc' }
        });
        
        const nameSpan = createElementWithText('span', shelf.name);
        
        li.appendChild(colorSpan);
        li.appendChild(nameSpan);
        
        li.addEventListener('click', () => {
            const view = li.dataset.view;
            setActiveView(view);
            elements.libraryTitle.textContent = shelf.name;
            renderBooks([], 'all-books-grid');
        });
        
        fragment.appendChild(li);
    });

    clearElement(elements.shelvesList);
    elements.shelvesList.appendChild(fragment);
    updateStats();
}

function renderTags() {
    const allTags = new Set();
    allBooks.forEach(book => {
        if (book.tags) {
            book.tags.split(',').forEach(tag => {
                const t = tag.trim();
                if (t) allTags.add(t);
            });
        }
    });

    const fragment = document.createDocumentFragment();
    
    Array.from(allTags).slice(0, 8).forEach(tag => {
        const isActive = currentView === `tag:${tag}`;
        const li = createElement('li', {
            className: `sidebar-item ${isActive ? 'active' : ''}`,
            dataset: { view: `tag:${tag}` }
        });
        
        const icon = createElementWithText('span', '🏷️', {
            className: 'sidebar-item-icon'
        });
        
        const tagText = createElementWithText('span', tag);
        
        li.appendChild(icon);
        li.appendChild(tagText);
        
        li.addEventListener('click', () => {
            const view = li.dataset.view;
            setActiveView(view);
            elements.libraryTitle.textContent = tag;
            renderBooks([], 'all-books-grid');
        });
        
        fragment.appendChild(li);
    });

    clearElement(elements.tagsList);
    elements.tagsList.appendChild(fragment);
}

function updateStats() {
    elements.bookCount.textContent = allBooks.length;
    elements.shelfCount.textContent = allShelves.length;
}

function updateFabVisibility() {
    if (allBooks.length > 5) {
        elements.fab.classList.add('visible', 'pulsing');
    } else {
        elements.fab.classList.remove('visible', 'pulsing');
    }
}

// Sidebar
function toggleSidebar() {
    elements.sidebar.classList.toggle('collapsed');
    elements.sidebar.classList.toggle('open');
    elements.mainContent.classList.toggle('expanded');
}

function setActiveView(view) {
    currentView = view;
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    if (view === 'all') {
        elements.libraryTitle.textContent = 'Library';
    }
}

// Search
function handleSearch(e) {
    const query = e.target.value.trim();

    if (!query) {
        renderBooks([], 'all-books-grid'); // Re-render for virtual shelf
        return;
    }

    // Use fuzzy search on the client-side for immediate results
    const results = window.fuzzySearch.search(query, allBooks);

    if (results.length === 0) {
        elements.booksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">&#128269;</div>
                <h3 class="empty-state-title">No results found</h3>
                <p class="empty-state-text">Try different search terms</p>
            </div>
        `;
        return;
    }

    // Render search results using the virtual shelf's rendering mechanism
    renderBooks(results, 'all-books-grid');
}

// Context Menu
function showContextMenu(e, bookId) {
    currentBookId = bookId;
    const menu = elements.contextMenu;

    // Position the menu
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.classList.add('visible');

    // Adjust position if overflowing viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    // Set up menu actions
    menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.onclick = () => handleContextMenuAction(item.dataset.action);
    });
}

function hideContextMenu() {
    elements.contextMenu.classList.remove('visible');
}

function handleContextMenuAction(action) {
    hideContextMenu();

    switch (action) {
        case 'open':
            openBook(currentBookId);
            break;
        case 'add-to-shelf':
            openAddToShelfModal(currentBookId);
            break;
        case 'edit':
            openEditModal(currentBookId);
            break;
        case 'delete':
            openDeleteModal(currentBookId);
            break;
    }
}

// Book Actions
function openBook(bookId) {
    window.location.href = `/frontend/reader.html?id=${bookId}`;
}

// Upload Modal
function openUploadModal() {
    document.getElementById('upload-modal').classList.add('visible');
    resetUploadForm();
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.remove('visible');
    resetUploadForm();
}

function resetUploadForm() {
    document.getElementById('file-input').value = '';
    document.getElementById('upload-form').style.display = 'none';
    document.getElementById('upload-modal-footer').style.display = 'none';
    document.getElementById('drop-zone').style.display = 'block';
}

function handleFileDrop(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
}

let selectedFile = null;

function processFile(file) {
    const validTypes = ['application/epub+zip', 'application/pdf'];
    const validExtensions = ['.epub', '.pdf'];

    const hasValidType = validTypes.includes(file.type);
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExt) {
        showToast('Please select an EPUB or PDF file', 'error');
        return;
    }

    selectedFile = file;

    // Show form
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('upload-form').style.display = 'block';
    document.getElementById('upload-modal-footer').style.display = 'flex';

    // Pre-fill title from filename
    const title = file.name.replace(/\.(epub|pdf)$/i, '').replace(/[-_]/g, ' ');
    document.getElementById('upload-title').value = title;
}

async function handleUpload() {
    if (!selectedFile) return;

    const title = document.getElementById('upload-title').value.trim();
    const author = document.getElementById('upload-author').value.trim();
    const tags = document.getElementById('upload-tags').value.trim();

    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    formData.append('author', author);
    formData.append('tags', tags);

    try {
        const btn = document.getElementById('upload-submit');
        btn.disabled = true;
        btn.textContent = 'Uploading...';

        const response = await fetch('/api/books/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast('Book uploaded successfully!', 'success');
            closeUploadModal();
            await loadBooks();
            renderTags();
        } else {
            showToast(data.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed. Please try again.', 'error');
    } finally {
        const btn = document.getElementById('upload-submit');
        btn.disabled = false;
        btn.textContent = 'Upload';
    }
}

// Edit Modal
function openEditModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('edit-book-id').value = bookId;
    document.getElementById('edit-title').value = book.title || '';
    document.getElementById('edit-author').value = book.author || '';
    document.getElementById('edit-tags').value = book.tags || '';

    document.getElementById('edit-modal').classList.add('visible');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('visible');
}

async function handleEditSubmit() {
    const bookId = document.getElementById('edit-book-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const author = document.getElementById('edit-author').value.trim();
    const tags = document.getElementById('edit-tags').value.trim();

    if (!title) {
        showToast('Title is required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/books/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: bookId, title, author, tags })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Book updated successfully!', 'success');
            closeEditModal();
            await loadBooks();
            renderTags();
        } else {
            showToast(data.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Update error:', error);
        showToast('Update failed', 'error');
    }
}

// Shelf Modal
function openShelfModal(shelfId = null) {
    const modal = document.getElementById('shelf-modal');
    const title = document.getElementById('shelf-modal-title');
    const submitBtn = document.getElementById('shelf-submit');

    if (shelfId) {
        const shelf = allShelves.find(s => s.id === shelfId);
        if (!shelf) return;

        title.textContent = 'Edit Shelf';
        submitBtn.textContent = 'Save';
        document.getElementById('shelf-id').value = shelfId;
        document.getElementById('shelf-name').value = shelf.name;
        document.getElementById('shelf-color').value = shelf.color || '#bb86fc';
    } else {
        title.textContent = 'Create Shelf';
        submitBtn.textContent = 'Create';
        document.getElementById('shelf-id').value = '';
        document.getElementById('shelf-name').value = '';
        document.getElementById('shelf-color').value = '#bb86fc';
    }

    modal.classList.add('visible');
}

function closeShelfModal() {
    document.getElementById('shelf-modal').classList.remove('visible');
}

async function handleShelfSubmit() {
    const shelfId = document.getElementById('shelf-id').value;
    const name = document.getElementById('shelf-name').value.trim();
    const color = document.getElementById('shelf-color').value;

    if (!name) {
        showToast('Shelf name is required', 'error');
        return;
    }

    const endpoint = shelfId ? '/api/shelves/update' : '/api/shelves/create';
    const method = shelfId ? 'PUT' : 'POST';

    try {
        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: shelfId, name, color })
        });

        const data = await response.json();

        if (data.success) {
            showToast(shelfId ? 'Shelf updated!' : 'Shelf created!', 'success');
            closeShelfModal();
            await loadShelves();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Shelf error:', error);
        showToast('Operation failed', 'error');
    }
}

// Add to Shelf Modal
function openAddToShelfModal(bookId) {
    document.getElementById('add-to-shelf-book-id').value = bookId;
    
    const shelfOptionsContainer = document.getElementById('shelf-options');
    clearElement(shelfOptionsContainer);

    if (allShelves.length === 0) {
        const emptyMsg = createElementWithText('p', 'No shelves created yet', {
            style: { color: 'var(--text-muted)' }
        });
        shelfOptionsContainer.appendChild(emptyMsg);
    } else {
        const fragment = document.createDocumentFragment();
        
        allShelves.forEach(shelf => {
            const item = createElement('div', {
                className: 'sidebar-item',
                dataset: { shelfId: shelf.id },
                style: { cursor: 'pointer' }
            });
            
            const colorSpan = createElement('span', {
                className: 'shelf-color',
                style: { background: shelf.color || '#bb86fc' }
            });
            
            const nameSpan = createElementWithText('span', shelf.name);
            
            item.appendChild(colorSpan);
            item.appendChild(nameSpan);
            
            item.addEventListener('click', () => addBookToShelf(bookId, shelf.id));
            
            fragment.appendChild(item);
        });
        
        shelfOptionsContainer.appendChild(fragment);
    }

    document.getElementById('add-to-shelf-modal').classList.add('visible');
}

function closeAddToShelfModal() {
    document.getElementById('add-to-shelf-modal').classList.remove('visible');
}

async function addBookToShelf(bookId, shelfId) {
    try {
        const response = await fetch('/api/shelves/add-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, shelfId })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Book added to shelf!', 'success');
            closeAddToShelfModal();
            await loadShelves();
        } else {
            showToast(data.message || 'Failed to add book', 'error');
        }
    } catch (error) {
        console.error('Add to shelf error:', error);
        showToast('Failed to add book to shelf', 'error');
    }
}

// Undo/Redo functionality
function addToUndoStack(action) {
    undoStack.push({
        action: action.type,
        data: action.data,
        timestamp: Date.now()
    });

    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    }

    showUndoNotification(action.type);
}

function showUndoNotification(actionType) {
    const messages = {
        delete: 'Book deleted',
        move: 'Book moved',
        edit: 'Book edited'
    };

    const toast = createElement('div', {
        className: 'toast info'
    });
    
    const messageSpan = createElementWithText('span', messages[actionType] || 'Action completed');
    toast.appendChild(messageSpan);
    
    const undoBtn = createElementWithText('button', 'Undo', {
        style: {
            marginLeft: '12px',
            padding: '4px 8px',
            background: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        }
    });
    undoBtn.onclick = undoLastAction;
    toast.appendChild(undoBtn);

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

async function undoLastAction() {
    if (undoStack.length === 0) {
        showToast('Nothing to undo', 'info');
        return;
    }

    const action = undoStack.pop();

    try {
        switch (action.action) {
            case 'delete':
                // Restore deleted book
                await fetch('/api/books/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookData: action.data })
                });
                await loadBooks();
                showToast('Book restored', 'success');
                break;
            case 'move':
                // Restore previous position
                await fetch('/api/books/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookIds: action.data.previousOrder })
                });
                await loadBooks();
                showToast('Position restored', 'success');
                break;
        }
    } catch (error) {
        console.error('Undo failed:', error);
        showToast('Undo failed', 'error');
    }
}

// Quick filters (deprecated - use applyFiltersAndSort instead)
function applyQuickFilter(filter) {
    currentFilter = filter;
    applyFiltersAndSort();
}

// Delete Modal
function openDeleteModal(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('delete-book-id').value = bookId;
    document.getElementById('delete-book-title').textContent = book.title;

    document.getElementById('delete-modal').classList.add('visible');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('visible');
}

async function handleDeleteConfirm() {
    const bookId = document.getElementById('delete-book-id').value;
    const book = allBooks.find(b => b.id === bookId);

    try {
        // Save to undo stack before deleting
        addToUndoStack({
            type: 'delete',
            data: book
        });

        const response = await fetch('/api/books/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: bookId })
        });

        const data = await response.json();

        if (data.success) {
            closeDeleteModal();
            await loadBooks(); // Reload books to update the virtual shelf
            renderTags();
            updateFabVisibility();
        } else {
            showToast(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Delete failed', 'error');
    }
}

// Settings Modal
function openSettingsModal() {
    document.getElementById('settings-theme').value = settings.readerTheme || 'obsidian';
    document.getElementById('settings-font-size').value = settings.fontSize || 16;
    
    // Load 2FA status
    const twoFACheckbox = document.getElementById('settings-twofa');
    const twoFAGroup = document.getElementById('twofa-password-group');
    
    fetch('/api/security/two-factor')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                twoFACheckbox.checked = data.enabled || false;
                twoFACheckbox.dataset.previousState = data.enabled ? 'true' : 'false';
                twoFAGroup.style.display = data.enabled ? 'block' : 'none';
            }
        })
        .catch(e => console.error('Failed to load 2FA status:', e));
    
    document.getElementById('settings-modal').classList.add('visible');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('visible');
}

async function handleSettingsSave() {
    const theme = document.getElementById('settings-theme').value;
    const fontSize = parseInt(document.getElementById('settings-font-size').value);
    
    // 2FA settings
    const twoFACheckbox = document.getElementById('settings-twofa');
    const twoFAEnabled = twoFACheckbox?.checked || false;
    const twoFAPassword = document.getElementById('settings-twofa-password')?.value || '';

    try {
        const response = await fetch('/api/settings/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ readerTheme: theme, fontSize })
        });

        const data = await response.json();

        if (data.success) {
            settings = { readerTheme: theme, fontSize };
            
            // Handle 2FA separately if changed
            if (twoFAEnabled && twoFAPassword) {
                const twoFAResponse = await fetch('/api/security/two-factor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'enable',
                        newPassword: twoFAPassword
                    })
                });
                
                const twoFAData = await twoFAResponse.json();
                if (!twoFAData.success) {
                    showToast('2FA setup failed: ' + (twoFAData.message || 'Unknown error'), 'error');
                    return;
                }
            } else if (!twoFAEnabled && twoFACheckbox?.dataset.previousState === 'true') {
                // Disabling 2FA - might need password to confirm (future enhancement)
                const twoFAResponse = await fetch('/api/security/two-factor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'disable',
                        password: twoFAPassword
                    })
                });
                
                const twoFAData = await twoFAResponse.json();
                if (!twoFAData.success) {
                    showToast('2FA disable failed: ' + (twoFAData.message || 'Unknown error'), 'error');
                    return;
                }
            }
            
            showToast('Settings saved!', 'success');
            closeSettingsModal();
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        console.error('Settings error:', error);
        showToast('Failed to save settings', 'error');
    }
}

// Keyboard Shortcuts
function handleKeyboard(e) {
    // Don't trigger if typing in input or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
        case 'u':
            e.preventDefault();
            openUploadModal();
            break;
        case 'escape':
            // Close any visible modals
            document.querySelectorAll('.modal-overlay.visible').forEach(modal => {
                modal.classList.remove('visible');
            });
            hideContextMenu(); // Hide context menu if open
            break;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = createElement('div', {
        className: `toast ${type}`
    });
    
    const messageSpan = createElementWithText('span', message);
    toast.appendChild(messageSpan);

    elements.toastContainer.appendChild(toast);

    // Remove toast after a delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fuzzy search initialization (assuming fuzzySearch library is available globally)
// Example: window.fuzzySearch = new Fuse(allBooks, { keys: ['title', 'author', 'tags'] });
// This should be called after allBooks is loaded.
// For now, we assume it's handled elsewhere or available globally.
// A more robust implementation would initialize it here after data load.

