/**
 * Nightmare Library - Main Dashboard Script
 * Handles book display, uploads, shelves, and user interactions
 */

// State
let allBooks = [];
let allShelves = [];
let currentView = 'all';
let currentBookId = null;
let settings = {
    readerTheme: 'obsidian',
    fontSize: 16
};

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
        renderBooks();
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
            renderBooks();
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

// Rendering
function renderBooks() {
    let booksToRender = [...allBooks];

    // Filter by view
    if (currentView.startsWith('shelf:')) {
        const shelfId = currentView.replace('shelf:', '');
        const shelf = allShelves.find(s => s.id === shelfId);
        if (shelf && shelf.bookIds) {
            booksToRender = booksToRender.filter(b => shelf.bookIds.includes(b.id));
        }
    } else if (currentView.startsWith('tag:')) {
        const tag = currentView.replace('tag:', '');
        booksToRender = booksToRender.filter(b => {
            const tags = (b.tags || '').split(',').map(t => t.trim().toLowerCase());
            return tags.includes(tag.toLowerCase());
        });
    }

    // Handle empty state
    if (allBooks.length === 0) {
        elements.booksGrid.innerHTML = '';
        elements.emptyState.style.display = 'block';
        elements.recentlyReadSection.style.display = 'none';
        return;
    }

    elements.emptyState.style.display = 'none';
    elements.recentlyReadSection.style.display = 'block';

    // Render books using snippet_html from backend
    if (booksToRender.length === 0) {
        elements.booksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">&#128269;</div>
                <h3 class="empty-state-title">No books found</h3>
                <p class="empty-state-text">Try a different filter or add some books</p>
            </div>
        `;
        return;
    }

    let html = booksToRender.map(book => book.snippet_html || generateBookCard(book)).join('');

    // Add upload tile if <= 5 books
    if (allBooks.length <= 5) {
        html += `
            <div class="upload-tile" id="upload-tile" onclick="openUploadModal()">
                <div class="upload-tile-icon">+</div>
                <p class="upload-tile-text">Upload Book</p>
            </div>
        `;
    }

    elements.booksGrid.innerHTML = html;

    // Attach event listeners to book cards
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-menu')) {
                openBook(card.dataset.id);
            }
        });

        const menuBtn = card.querySelector('.card-menu');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showContextMenu(e, card.dataset.id);
            });
        }
    });
}

function generateBookCard(book) {
    const progress = book.progress || 0;
    const tags = (book.tags || '').split(',').filter(t => t.trim());
    const badgesHtml = tags.slice(0, 2).map(t => 
        `<span class="badge">${escapeHtml(t.trim())}</span>`
    ).join('');

    return `
        <article class="book-card" data-id="${book.id}" role="listitem" tabindex="0">
            <div class="book-cover-container">
                <img 
                    class="book-cover" 
                    src="/api/books/cover/${book.id}" 
                    alt="${escapeHtml(book.title)} cover"
                    loading="lazy"
                    onerror="this.src='/frontend/assets/broken-image.svg'"
                >
                <svg class="progress-ring" viewBox="0 0 36 36">
                    <circle class="progress-ring-bg" cx="18" cy="18" r="16"/>
                    <circle class="progress-ring-fill" cx="18" cy="18" r="16" 
                            stroke-dasharray="${progress}, 100"/>
                    <text x="18" y="20" class="progress-text">${progress}%</text>
                </svg>
            </div>
            <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
            <p class="book-author">${escapeHtml(book.author || 'Unknown Author')}</p>
            <div class="badges">${badgesHtml}</div>
            <button class="card-menu" aria-label="Book options" aria-haspopup="menu">&#8942;</button>
        </article>
    `;
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
    elements.recentlyReadGrid.innerHTML = recentBooks
        .map(book => book.snippet_html || generateBookCard(book))
        .join('');

    // Attach event listeners
    elements.recentlyReadGrid.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-menu')) {
                openBook(card.dataset.id);
            }
        });
    });
}

function renderShelves() {
    elements.shelvesList.innerHTML = allShelves.map(shelf => `
        <li class="sidebar-item ${currentView === 'shelf:' + shelf.id ? 'active' : ''}" 
            data-view="shelf:${shelf.id}">
            <span class="shelf-color" style="background: ${shelf.color || '#bb86fc'}"></span>
            <span>${escapeHtml(shelf.name)}</span>
        </li>
    `).join('');

    // Attach event listeners
    elements.shelvesList.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            setActiveView(view);
            elements.libraryTitle.textContent = item.querySelector('span:last-child').textContent;
            renderBooks();
        });
    });

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

    elements.tagsList.innerHTML = Array.from(allTags).slice(0, 8).map(tag => `
        <li class="sidebar-item ${currentView === 'tag:' + tag ? 'active' : ''}" 
            data-view="tag:${tag}">
            <span class="sidebar-item-icon">&#127991;</span>
            <span>${escapeHtml(tag)}</span>
        </li>
    `).join('');

    // Attach event listeners
    elements.tagsList.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            setActiveView(view);
            elements.libraryTitle.textContent = item.querySelector('span:last-child').textContent;
            renderBooks();
        });
    });
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
        renderBooks();
        return;
    }

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

    elements.booksGrid.innerHTML = results
        .map(book => book.snippet_html || generateBookCard(book))
        .join('');

    // Re-attach event listeners
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-menu')) {
                openBook(card.dataset.id);
            }
        });

        const menuBtn = card.querySelector('.card-menu');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showContextMenu(e, card.dataset.id);
            });
        }
    });
}

// Context Menu
function showContextMenu(e, bookId) {
    currentBookId = bookId;
    const menu = elements.contextMenu;

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.classList.add('visible');

    // Adjust position if overflowing
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

    const options = allShelves.map(shelf => `
        <div class="sidebar-item" data-shelf-id="${shelf.id}" style="cursor: pointer;">
            <span class="shelf-color" style="background: ${shelf.color || '#bb86fc'}"></span>
            <span>${escapeHtml(shelf.name)}</span>
        </div>
    `).join('');

    document.getElementById('shelf-options').innerHTML = options || '<p style="color: var(--text-muted);">No shelves created yet</p>';

    // Attach click handlers
    document.querySelectorAll('#shelf-options .sidebar-item').forEach(item => {
        item.addEventListener('click', () => addBookToShelf(bookId, item.dataset.shelfId));
    });

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
    
    const toast = document.createElement('div');
    toast.className = 'toast info';
    toast.innerHTML = `
        <span>${messages[actionType] || 'Action completed'}</span>
        <button onclick="undoLastAction()" style="margin-left: 12px; padding: 4px 8px; background: var(--accent-primary); border: none; border-radius: 4px; cursor: pointer;">Undo</button>
    `;
    
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

// Quick filters
function applyQuickFilter(filter) {
    let filtered = [...allBooks];
    
    switch (filter) {
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
    
    renderFilteredBooks(filtered);
}

function renderFilteredBooks(books) {
    if (books.length === 0) {
        elements.booksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">&#128269;</div>
                <h3 class="empty-state-title">No books match this filter</h3>
            </div>
        `;
        return;
    }
    
    elements.booksGrid.innerHTML = books
        .map(book => book.snippet_html || generateBookCard(book))
        .join('');
    
    attachBookCardListeners();
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
            await loadBooks();
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
    document.getElementById('settings-modal').classList.add('visible');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('visible');
}

async function handleSettingsSave() {
    const theme = document.getElementById('settings-theme').value;
    const fontSize = parseInt(document.getElementById('settings-font-size').value);

    try {
        const response = await fetch('/api/settings/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ readerTheme: theme, fontSize })
        });

        const data = await response.json();

        if (data.success) {
            settings = { readerTheme: theme, fontSize };
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
    // Don't trigger if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
        case 'u':
            e.preventDefault();
            openUploadModal();
            break;
        case 'escape':
            document.querySelectorAll('.modal-overlay.visible').forEach(modal => {
                modal.classList.remove('visible');
            });
            hideContextMenu();
            break;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    elements.toastContainer.appendChild(toast);

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
