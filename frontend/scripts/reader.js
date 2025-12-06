/**
 * Nightmare Library - Reader Script
 * Handles EPUB and PDF rendering with navigation and progress tracking
 */

// State
let book = null;
let rendition = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let progress = 0;
let bookId = null;
let fileType = null;
let fontSize = 16;
let currentTheme = 'obsidian';
let isFullscreen = false;
let autoSaveInterval = null;

// Enhanced Reader Customization
let lineHeight = parseFloat(localStorage.getItem('reader-line-height')) || 1.6;
let fontFamily = localStorage.getItem('reader-font-family') || 'default';
let letterSpacing = parseFloat(localStorage.getItem('reader-letter-spacing')) || 0;

// DOM Elements
const elements = {
    loading: document.getElementById('reader-loading'),
    error: document.getElementById('reader-error'),
    errorMessage: document.getElementById('error-message'),
    container: document.getElementById('reader-container'),
    header: document.getElementById('reader-header'),
    nav: document.getElementById('reader-nav'),
    bookTitle: document.getElementById('book-title'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    progressCircle: document.getElementById('progress-circle'),
    progressRingText: document.getElementById('progress-ring-text'),
    pageIndicator: document.getElementById('page-indicator'),
    epubContainer: document.getElementById('epub-container'),
    pdfContainer: document.getElementById('pdf-container'),
    pdfCanvas: document.getElementById('pdf-canvas'),
    tocSidebar: document.getElementById('toc-sidebar'),
    tocOverlay: document.getElementById('toc-overlay'),
    tocList: document.getElementById('toc-list'),
    shortcutsHint: document.getElementById('shortcuts-hint'),
    backBtn: document.getElementById('back-btn') // Added for clarity, assuming it exists based on changes
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Get book ID from URL
    const params = new URLSearchParams(window.location.search);
    bookId = params.get('id');

    if (!bookId) {
        showError('No book specified');
        return;
    }

    setupEventListeners();
    await loadBook();
    loadThemePreference();

    // Start analytics session
    if (window.readingAnalytics) {
        window.readingAnalytics.startSession(bookId);
    }

    // Show shortcuts hint briefly
    elements.shortcutsHint.classList.add('visible');
    setTimeout(() => elements.shortcutsHint.classList.remove('visible'), 5000);
}

function setupEventListeners() {
    // Navigation
    document.getElementById('back-btn').addEventListener('click', goToLibrary);
    document.getElementById('prev-btn').addEventListener('click', prevPage);
    document.getElementById('next-btn').addEventListener('click', nextPage);

    // Font controls
    document.getElementById('font-decrease').addEventListener('click', decreaseFontSize);
    document.getElementById('font-increase').addEventListener('click', increaseFontSize);

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    // TOC
    document.getElementById('toc-btn').addEventListener('click', toggleToc);
    document.getElementById('toc-close').addEventListener('click', closeToc);
    elements.tocOverlay.addEventListener('click', closeToc);

    // Fullscreen
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Auto-save progress
    autoSaveInterval = setInterval(saveProgress, 30000);

    // Save on page unload
    window.addEventListener('beforeunload', saveProgress);
}

async function loadBook() {
    try {
        // Fetch book details
        const response = await fetch(`/api/books/get?id=${bookId}`);
        const data = await response.json();

        if (!data.success) {
            showError(data.message || 'Failed to load book');
            return;
        }

        const bookData = data.book;
        elements.bookTitle.textContent = bookData.title;
        document.title = `${bookData.title} - Nightmare Library`;
        fileType = bookData.file_type;

        // Load saved progress
        if (bookData.progress) {
            progress = bookData.progress.percent || 0;
            currentPage = bookData.progress.current_page || 1;
        }

        // Load settings
        if (data.settings) {
            fontSize = data.settings.fontSize || 16;
            currentTheme = data.settings.readerTheme || 'obsidian';
            setTheme(currentTheme); // Ensure theme is applied on load
        }

        // Load book content
        if (fileType === 'epub') {
            await loadEpub(`/api/books/file/${bookId}`);
        } else if (fileType === 'pdf') {
            await loadPdf(`/api/books/file/${bookId}`);
        } else {
            showError('Unsupported file format');
            return;
        }

        // Show reader
        elements.loading.style.display = 'none';
        elements.container.style.display = 'flex';

    } catch (error) {
        console.error('Error loading book:', error);
        showError('Failed to load book');
    }
}

async function loadEpub(url) {
    try {
        book = ePub(url);

        rendition = book.renderTo(elements.epubContainer, {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'paginated'
        });

        // Apply theme
        applyEpubTheme();

        // Display book
        await rendition.display();

        // Navigate to saved position
        if (progress > 0) {
            const location = book.locations.cfiFromPercentage(progress / 100);
            if (location) {
                await rendition.display(location);
            }
        }

        // Generate locations for progress tracking
        await book.locations.generate(1024);

        // Load TOC
        const toc = await book.loaded.navigation;
        renderToc(toc.toc);

        // Update progress on page change
        rendition.on('relocated', (location) => {
            if (location && book.locations.length()) {
                progress = Math.round(book.locations.percentageFromCfi(location.start.cfi) * 100);
                updateProgressUI();
            }
        });

        elements.pdfContainer.style.display = 'none';
        elements.epubContainer.style.display = 'block';

    } catch (error) {
        console.error('EPUB load error:', error);
        throw error;
    }
}

async function loadPdf(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;

        elements.epubContainer.style.display = 'none';
        elements.pdfContainer.style.display = 'flex';

        // Render saved page or first page
        await renderPdfPage(currentPage);
        updateProgressUI();

    } catch (error) {
        console.error('PDF load error:', error);
        throw error;
    }
}

async function renderPdfPage(pageNum) {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;

    currentPage = pageNum;
    const page = await pdfDoc.getPage(pageNum);

    const canvas = elements.pdfCanvas;
    const ctx = canvas.getContext('2d');

    // Calculate scale to fit viewport
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = elements.pdfContainer.clientWidth - 40;
    const scale = containerWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({
        canvasContext: ctx,
        viewport: scaledViewport
    }).promise;

    progress = Math.round((currentPage / totalPages) * 100);
    elements.pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    updateProgressUI();
}

function renderToc(toc) {
    if (!toc || toc.length === 0) {
        elements.tocList.innerHTML = '<p style="padding: 20px; color: #666;">No table of contents available</p>';
        return;
    }

    const renderItems = (items, nested = false) => {
        return items.map(item => `
            <div class="toc-item ${nested ? 'nested' : ''}" data-href="${item.href}">
                ${item.label}
            </div>
            ${item.subitems ? renderItems(item.subitems, true) : ''}
        `).join('');
    };

    elements.tocList.innerHTML = renderItems(toc);

    // Attach click handlers
    elements.tocList.querySelectorAll('.toc-item').forEach(item => {
        item.addEventListener('click', () => {
            const href = item.dataset.href;
            if (rendition && href) {
                rendition.display(href);
                closeToc();
            }
        });
    });
}

function applyEpubTheme() {
    if (!rendition) return;

    const themes = {
        obsidian: { body: { background: '#0a0a0a', color: '#e0e0e0' } },
        sepia: { body: { background: '#f4ecd8', color: '#5c4b37' } },
        light: { body: { background: '#ffffff', color: '#212121' } }
    };

    rendition.themes.register('custom', themes[currentTheme] || themes.obsidian);
    rendition.themes.select('custom');
    rendition.themes.fontSize(`${fontSize}px`);
}

function updateProgressUI() {
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `${progress}%`;
    elements.progressCircle.setAttribute('stroke-dasharray', `${progress}, 100`);
    elements.progressRingText.textContent = `${progress}%`;
}

// Navigation
function prevPage() {
    if (fileType === 'epub' && rendition) {
        rendition.prev();
    } else if (fileType === 'pdf' && currentPage > 1) {
        renderPdfPage(currentPage - 1);
    }
}

function nextPage() {
    if (fileType === 'epub' && rendition) {
        rendition.next();
    } else if (fileType === 'pdf' && currentPage < totalPages) {
        renderPdfPage(currentPage + 1);
    }
}

function goToLibrary() {
    saveProgress();
    window.location.href = '/frontend/dashboard.html';
}

// Reading customization
function decreaseFontSize() {
    if (fontSize > 12) {
        fontSize -= 2;
        applyReaderStyles();
    }
}

function increaseFontSize() {
    if (fontSize < 28) {
        fontSize += 2;
        applyReaderStyles();
    }
}

// Add customization controls to header
function addCustomizationControls() {
    const readerControls = document.querySelector('.reader-controls');
    if (!readerControls || readerControls.querySelector('.customization-menu')) return;

    const customBtn = document.createElement('button');
    customBtn.className = 'icon-btn';
    customBtn.innerHTML = '⚙️';
    customBtn.title = 'Customize Reader';
    customBtn.onclick = toggleCustomizationMenu;

    readerControls.insertBefore(customBtn, readerControls.querySelector('.theme-selector'));

    const menu = document.createElement('div');
    menu.className = 'customization-menu';
    menu.style.cssText = 'display: none; position: absolute; top: 60px; right: 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; width: 280px; z-index: 1000;';
    menu.innerHTML = `
        <h3 style="margin: 0 0 12px 0; font-size: 14px;">Reader Settings</h3>
        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; margin-bottom: 4px;">Font Family</label>
            <select id="font-family-select" style="width: 100%; padding: 6px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
                <option value="default">Default</option>
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="monospace">Monospace</option>
            </select>
        </div>
        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; margin-bottom: 4px;">Line Height: <span id="line-height-value">${lineHeight}</span></label>
            <input type="range" id="line-height-slider" min="1.2" max="2.4" step="0.1" value="${lineHeight}" style="width: 100%;">
        </div>
        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; margin-bottom: 4px;">Letter Spacing: <span id="letter-spacing-value">${letterSpacing}px</span></label>
            <input type="range" id="letter-spacing-slider" min="-1" max="3" step="0.5" value="${letterSpacing}" style="width: 100%;">
        </div>
        <button onclick="resetReaderSettings()" style="width: 100%; padding: 8px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Reset to Defaults</button>
    `;
    document.body.appendChild(menu);

    // Event listeners
    document.getElementById('font-family-select').value = fontFamily;
    document.getElementById('font-family-select').addEventListener('change', (e) => {
        fontFamily = e.target.value;
        applyReaderStyles();
    });

    document.getElementById('line-height-slider').addEventListener('input', (e) => {
        lineHeight = parseFloat(e.target.value);
        document.getElementById('line-height-value').textContent = lineHeight;
        applyReaderStyles();
    });

    document.getElementById('letter-spacing-slider').addEventListener('input', (e) => {
        letterSpacing = parseFloat(e.target.value);
        document.getElementById('letter-spacing-value').textContent = letterSpacing + 'px';
        applyReaderStyles();
    });
}

function toggleCustomizationMenu() {
    const menu = document.querySelector('.customization-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

window.resetReaderSettings = function() {
    fontSize = 18;
    lineHeight = 1.6;
    fontFamily = 'default';
    letterSpacing = 0;
    document.getElementById('font-family-select').value = 'default';
    document.getElementById('line-height-slider').value = 1.6;
    document.getElementById('line-height-value').textContent = '1.6';
    document.getElementById('letter-spacing-slider').value = 0;
    document.getElementById('letter-spacing-value').textContent = '0px';
    applyReaderStyles();
};

function applyReaderStyles() {
    // PDF rendering does not directly support these EPUB theme overrides.
    // For PDF, font styling is more complex and might require re-rendering with different options.
    // We'll focus on EPUB styling here.
    if (rendition) {
        const fontMap = {
            'default': 'Georgia, serif',
            'serif': 'Georgia, "Times New Roman", serif',
            'sans-serif': 'Arial, Helvetica, sans-serif',
            'monospace': '"Courier New", monospace'
        };

        rendition.themes.fontSize(fontSize + 'px');
        rendition.themes.override('line-height', lineHeight);
        rendition.themes.override('letter-spacing', letterSpacing + 'px');
        if (fontFamily !== 'default') {
            rendition.themes.override('font-family', fontMap[fontFamily]);
        }

        localStorage.setItem('reader-font-size', fontSize);
        localStorage.setItem('reader-line-height', lineHeight);
        localStorage.setItem('reader-font-family', fontFamily);
        localStorage.setItem('reader-letter-spacing', letterSpacing);
    }
}

// Search within book
let searchResults = [];
let currentSearchIndex = 0;

async function searchInBook(query) {
    if (!query || query.length < 2) return;

    searchResults = [];
    currentSearchIndex = 0;

    if (fileType === 'epub' && book) {
        const spine = await book.loaded.spine;

        for (let item of spine.items) {
            const doc = await item.load(book.load.bind(book));
            const bodyText = doc.body.textContent;

            const regex = new RegExp(query, 'gi');
            let match;

            while ((match = regex.exec(bodyText)) !== null) {
                searchResults.push({
                    cfi: item.cfiBase,
                    excerpt: bodyText.substring(Math.max(0, match.index - 50), match.index + 50),
                    position: match.index
                });
            }
        }

        if (searchResults.length > 0) {
            highlightSearchResults(query);
            showSearchNavigation();
        }
    }
}

function highlightSearchResults(query) {
    if (rendition) {
        rendition.annotations.remove(null, 'highlight');

        searchResults.forEach(result => {
            rendition.annotations.add('highlight', result.cfi, {}, null, 'search-highlight');
        });

        // Jump to first result
        if (searchResults[0]) {
            rendition.display(searchResults[0].cfi);
        }
    }
}

function nextSearchResult() {
    if (searchResults.length === 0) return;
    currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
    rendition.display(searchResults[currentSearchIndex].cfi);
}

function prevSearchResult() {
    if (searchResults.length === 0) return;
    currentSearchIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    rendition.display(searchResults[currentSearchIndex].cfi);
}

function showSearchNavigation() {
    const nav = document.createElement('div');
    nav.id = 'search-nav';
    nav.innerHTML = `
        <button onclick="prevSearchResult()">◀</button>
        <span>${currentSearchIndex + 1} of ${searchResults.length}</span>
        <button onclick="nextSearchResult()">▶</button>
        <button onclick="clearSearch()">✕</button>
    `;
    document.body.appendChild(nav);
}

function clearSearch() {
    searchResults = [];
    if (rendition) {
        rendition.annotations.remove(null, 'highlight');
    }
    const nav = document.getElementById('search-nav');
    if (nav) nav.remove();
}

// Theme Management
function setTheme(theme) {
    currentTheme = theme; // Update the global currentTheme state
    document.body.className = `theme-${theme}`;

    // Update active button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    // Apply to EPUB if rendition is available
    if (rendition) {
        applyEpubTheme();
    }

    // Save preference
    localStorage.setItem('reader-theme', theme);
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('reader-theme') || 'obsidian';
    setTheme(savedTheme);
}

// TOC
function toggleToc() {
    elements.tocSidebar.classList.toggle('open');
    elements.tocOverlay.classList.toggle('visible');
}

function closeToc() {
    elements.tocSidebar.classList.remove('open');
    elements.tocOverlay.classList.remove('visible');
}

// Fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        isFullscreen = true;
        document.body.classList.add('fullscreen');
        // Hide controls in fullscreen for immersive reading
        setTimeout(() => {
            elements.header.style.transform = 'translateY(-100%)';
            elements.nav.style.transform = 'translateY(100%)';
        }, 2000);
    } else {
        document.exitFullscreen();
        isFullscreen = false;
        document.body.classList.remove('fullscreen');
        elements.header.style.transform = 'translateY(0)';
        elements.nav.style.transform = 'translateY(0)';
    }
}

// Show controls on mouse movement in fullscreen
let hideControlsTimeout;
document.addEventListener('mousemove', () => {
    if (isFullscreen) {
        elements.header.style.transform = 'translateY(0)';
        elements.nav.style.transform = 'translateY(0)';
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            if (isFullscreen) {
                elements.header.style.transform = 'translateY(-100%)';
                elements.nav.style.transform = 'translateY(100%)';
            }
        }, 3000);
    }
});

// Keyboard shortcuts
function handleKeyboard(e) {
    // Don't trigger if in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowleft':
            e.preventDefault();
            prevPage();
            break;
        case 'k':
        case 'arrowright':
            e.preventDefault();
            nextPage();
            break;
        case 'l':
            e.preventDefault();
            goToLibrary();
            break;
        case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'escape':
            if (elements.tocSidebar.classList.contains('open')) {
                closeToc();
            } else if (isFullscreen) {
                toggleFullscreen();
            }
            break;
    }
}

// Progress saving
async function saveProgress() {
    if (!bookId) return;

    try {
        let currentChapter = null;
        if (rendition && rendition.location) {
            const loc = rendition.location;
            if (loc.start && loc.start.href) {
                currentChapter = loc.start.href;
            }
        }

        // Security: Use parameterized queries or prepared statements if backend allows,
        // or ensure bookId is validated server-side to prevent injection.
        // For this client-side script, we assume backend handles validation.
        await fetch('/api/books/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Security: Add CSRF token if applicable
                // 'X-CSRF-Token': getCsrfToken()
            },
            body: JSON.stringify({
                bookId,
                percent: progress,
                currentPage: fileType === 'pdf' ? currentPage : null,
                currentChapter
            })
        });
    } catch (error) {
        console.error('Failed to save progress:', error);
        // Security: Log detailed error on client-side only for debugging,
        // but avoid exposing sensitive info to end-users.
    }
}

// Error handling
function showError(message) {
    elements.loading.style.display = 'none';
    elements.errorMessage.textContent = escapeHtml(message); // Sanitize message
    elements.error.style.display = 'flex';
}

// Utility
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Cleanup
window.addEventListener('unload', () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    if (book) {
        book.destroy();
    }
    
    // End analytics session
    if (window.readingAnalytics) {
        window.readingAnalytics.endSession();
        
        // Track if book is finished
        if (progress >= 95) {
            window.readingAnalytics.trackBookFinished(bookId);
        }
    }
});

// Initialize customization on load
// Use a slight delay to ensure all elements are available
setTimeout(addCustomizationControls, 1000);