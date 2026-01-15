/**
 * EPUB Reader using EPUB.js
 * Renders EPUBs with chapter navigation and progress tracking
 */

class EPUBReader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.book = null;
        this.rendition = null;
        this.currentLocation = 0;
        this.isRTL = false; // Right-to-left for manga
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    /**
     * Initialize EPUB reader
     */
    init() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="epub-reader" id="epub-reader-wrapper">
                <header class="epub-reader-header">
                    <button id="epub-reader-back" class="epub-btn">Back</button>
                    <span id="epub-reader-title">Loading...</span>
                    <button id="epub-reader-menu" class="epub-btn">Menu</button>
                </header>
                <div class="epub-viewer" id="epub-container"></div>
                <nav class="epub-reader-nav">
                    <button id="epub-prev-chapter" class="epub-btn">← Previous</button>
                    <span id="epub-progress">0%</span>
                    <button id="epub-next-chapter" class="epub-btn">Next →</button>
                </nav>
                <div class="epub-reader-menu" id="epub-reader-menu-panel" hidden>
                    <h3>Reader Settings</h3>
                    <div class="menu-section">
                        <label>Font Size</label>
                        <div class="font-controls">
                            <button id="epub-font-decrease">A-</button>
                            <span id="epub-font-size">16px</span>
                            <button id="epub-font-increase">A+</button>
                        </div>
                    </div>
                    <div class="menu-section">
                        <label>Reading Mode</label>
                        <div class="rtl-controls">
                            <button id="epub-rtl-toggle" class="epub-btn">RTL (Manga) Mode</button>
                        </div>
                    </div>
                    <div class="menu-section">
                        <h4>Chapters</h4>
                        <ul id="epub-chapter-list"></ul>
                    </div>
                    <button id="epub-close-menu" class="epub-btn">Close</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.setupMobileControls();
        this.loadEPUBLibrary();
    }

    loadEPUBLibrary() {
        if (!window.ePub) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js';
            document.head.appendChild(script);
        }
    }

    setupEventListeners() {
        document.getElementById('epub-prev-chapter')?.addEventListener('click', () => this.prev());
        document.getElementById('epub-next-chapter')?.addEventListener('click', () => this.next());
        document.getElementById('epub-reader-back')?.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
        document.getElementById('epub-reader-menu')?.addEventListener('click', () => this.toggleMenu());
        document.getElementById('epub-close-menu')?.addEventListener('click', () => this.toggleMenu(false));
        document.getElementById('epub-font-increase')?.addEventListener('click', () => this.increaseFontSize());
        document.getElementById('epub-font-decrease')?.addEventListener('click', () => this.decreaseFontSize());
        document.getElementById('epub-rtl-toggle')?.addEventListener('click', () => this.toggleRTL());

        document.addEventListener('keydown', (e) => {
            if (this.isRTL) {
                // In RTL mode, arrows are reversed (right = prev, left = next)
                if (e.key === 'ArrowLeft') this.next();
                if (e.key === 'ArrowRight') this.prev();
            } else {
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'ArrowRight') this.next();
            }
            if (e.key === 'Escape') this.toggleMenu(false);
        });
    }

    setupMobileControls() {
        const container = document.getElementById('epub-container');
        if (!container) return;

        // Swipe detection for page navigation
        container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, false);

        container.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = this.touchStartX - touchEndX;
            const diffY = this.touchStartY - touchEndY;

            // Require horizontal swipe (not vertical)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (this.isRTL) {
                    // In RTL: swipe right = prev, swipe left = next
                    if (diffX > 0) this.next();
                    else this.prev();
                } else {
                    // In LTR: swipe right = prev, swipe left = next
                    if (diffX > 0) this.prev();
                    else this.next();
                }
            }
        }, false);

        // Tap zones: left side = prev, right side = next
        const epubWrapper = document.getElementById('epub-reader-wrapper');
        epubWrapper?.addEventListener('click', (e) => {
            const rect = container.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const isLeftThird = clickX < rect.width / 3;
            const isRightThird = clickX > (rect.width * 2) / 3;

            // Only trigger on tap zones, not buttons
            if (e.target === container || e.target?.parentElement === container) {
                if (this.isRTL) {
                    if (isLeftThird) this.next();
                    if (isRightThird) this.prev();
                } else {
                    if (isLeftThird) this.prev();
                    if (isRightThird) this.next();
                }
            }
        });
    }

    async loadBook(bookId) {
        try {
            const response = await fetch(`/api/books/get?id=${bookId}`);
            const data = await response.json();

            if (data.success && data.book) {
                document.getElementById('epub-reader-title').textContent = data.book.title;
                
                if (!window.ePub) {
                    setTimeout(() => this.loadBook(bookId), 500);
                    return;
                }

                await this.renderEPUB(data.book.file_url);
                this.loadProgress();
            }
        } catch (error) {
            console.error('EPUB load error:', error);
            this.showError('Failed to load EPUB');
        }
    }

    async renderEPUB(url) {
        try {
            this.book = new window.ePub(url);
            
            // Check if book metadata indicates RTL (manga/Japanese/Arabic)
            const metadata = this.book.packaging.metadata;
            const language = metadata?.language?.['#text'] || '';
            const dir = metadata?.dir || '';
            
            // Check spine direction first (most reliable)
            let spineRTL = false;
            try {
                const spine = this.book.packaging.spine;
                spineRTL = spine?.[0]?.dir === 'rtl' || spine?.['page-progression-direction'] === 'rtl';
            } catch (e) {}
            
            this.isRTL = spineRTL || dir === 'rtl' || /^(ja|ar|he|fa|ur)/.test(language);
            
            // Get saved RTL preference
            const bookId = new URLSearchParams(window.location.search).get('id');
            const savedRTL = localStorage.getItem(`epubRTL_${bookId}`);
            if (savedRTL !== null) this.isRTL = JSON.parse(savedRTL);
            
            this.rendition = this.book.renderTo('epub-container', {
                width: '100%',
                height: '100%',
                flow: 'paginated',
                dir: this.isRTL ? 'rtl' : 'ltr'
            });

            // Apply RTL styles if needed
            if (this.isRTL) {
                document.getElementById('epub-reader-wrapper')?.classList.add('epub-rtl');
                document.getElementById('epub-rtl-toggle').textContent = '✓ RTL (Manga) Mode';
            }

            await this.rendition.display();
            this.setupRenditionListeners();
            this.populateChapters();
        } catch (error) {
            console.error('EPUB rendering error:', error);
            this.showError('Failed to render EPUB');
        }
    }

    setupRenditionListeners() {
        this.rendition.on('relocated', (location) => {
            this.currentLocation = location.start.cfi;
            this.updateProgress();
            // Don't auto-save on every page - save only on beforeunload
        });
        
        // Save progress only when leaving the page
        window.addEventListener('beforeunload', () => this.saveProgress());
        
        // Cross-tab sync
        window.addEventListener('storage', (e) => {
            const bookId = new URLSearchParams(window.location.search).get('id');
            if (e.key === `epubProgress_${bookId}` && e.newValue) {
                const newProgress = JSON.parse(e.newValue);
                // Update UI to reflect other tab's progress
                document.getElementById('epub-progress').textContent = newProgress.percent + '%';
            }
        });
    }

    async populateChapters() {
        try {
            const nav = await this.book.loaded.navigation;
            const list = document.getElementById('epub-chapter-list');
            
            if (list && nav.toc) {
                list.innerHTML = '';
                nav.toc.forEach((chapter) => {
                    const li = document.createElement('li');
                    const btn = document.createElement('button');
                    btn.textContent = chapter.label;
                    btn.onclick = () => {
                        this.rendition.display(chapter.href);
                        this.toggleMenu(false);
                    };
                    li.appendChild(btn);
                    list.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Failed to load chapters:', error);
        }
    }

    prev() {
        if (this.rendition) {
            this.rendition.prev();
        }
    }

    next() {
        if (this.rendition) {
            this.rendition.next();
        }
    }

    increaseFontSize() {
        if (this.rendition) {
            this.rendition.themes.fontSize('1.5em');
            document.getElementById('epub-font-size').textContent = '1.5em';
        }
    }

    decreaseFontSize() {
        if (this.rendition) {
            this.rendition.themes.fontSize('0.8em');
            document.getElementById('epub-font-size').textContent = '0.8em';
        }
    }

    toggleMenu(show) {
        const panel = document.getElementById('epub-reader-menu-panel');
        if (panel) {
            panel.hidden = show === undefined ? !panel.hidden : !show;
        }
    }

    toggleRTL() {
        this.isRTL = !this.isRTL;
        const bookId = new URLSearchParams(window.location.search).get('id');
        localStorage.setItem(`epubRTL_${bookId}`, JSON.stringify(this.isRTL));
        
        const wrapper = document.getElementById('epub-reader-wrapper');
        const btn = document.getElementById('epub-rtl-toggle');
        
        if (this.isRTL) {
            wrapper?.classList.add('epub-rtl');
            btn.textContent = '✓ RTL (Manga) Mode';
            const nav = document.querySelector('.epub-reader-nav');
            nav?.classList.add('rtl');
        } else {
            wrapper?.classList.remove('epub-rtl');
            btn.textContent = 'RTL (Manga) Mode';
            const nav = document.querySelector('.epub-reader-nav');
            nav?.classList.remove('rtl');
        }
        
        if (this.rendition && this.currentLocation) {
            this.rendition.display(this.currentLocation);
        }
    }

    updateProgress() {
        if (this.book && this.rendition) {
            const percent = Math.round((this.rendition.currentLocation().progress * 100) || 0);
            document.getElementById('epub-progress').textContent = percent + '%';
        }
    }

    saveProgress() {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId && this.rendition) {
            const progress = {
                percent: Math.round((this.rendition.currentLocation().progress * 100) || 0),
                currentChapter: this.rendition.currentLocation().start.href
            };
            // Save locally first (instant)
            localStorage.setItem(`epubProgress_${bookId}`, JSON.stringify(progress));
            
            // Send to server async (don't block page unload)
            if (navigator.onLine) {
                fetch('/api/books/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId, ...progress }),
                    keepalive: true // Keep request alive even if page closes
                }).catch(() => {});
            }
        }
    }

    loadProgress() {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId) {
            const saved = localStorage.getItem(`epubProgress_${bookId}`);
            if (saved) {
                const { currentChapter } = JSON.parse(saved);
                if (currentChapter && this.rendition) {
                    this.rendition.display(currentChapter);
                }
            }
        }
    }

    toggleMenu(show) {
        const panel = document.getElementById('epub-reader-menu-panel');
        if (panel) {
            panel.hidden = show === undefined ? !panel.hidden : !show;
        }
    }

    showError(message) {
        const container = document.getElementById('epub-container');
        if (container) {
            container.innerHTML = `<p class="error-message">${message}</p>`;
        }
    }
}

window.EPUBReader = EPUBReader;
