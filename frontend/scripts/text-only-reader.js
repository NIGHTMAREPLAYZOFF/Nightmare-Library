/**
 * Text-Only Reader Fallback
 * Minimal reader for extremely low-end devices
 * No EPUB.js, no PDF.js - just plain text rendering
 */

class TextOnlyReader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.content = '';
        this.chapters = [];
        this.currentChapter = 0;
        this.fontSize = 16;
        this.lineHeight = 1.6;
        this.theme = 'dark';
    }

    /**
     * Initialize the text-only reader
     */
    init() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="text-reader" id="text-reader-wrapper">
                <header class="text-reader-header">
                    <button id="text-reader-back" class="text-btn">Back</button>
                    <span id="text-reader-title">Loading...</span>
                    <button id="text-reader-menu" class="text-btn">Menu</button>
                </header>
                <main class="text-reader-content" id="text-reader-content">
                    <p>Loading book content...</p>
                </main>
                <nav class="text-reader-nav">
                    <button id="text-prev-chapter" class="text-btn">Previous</button>
                    <span id="text-chapter-info">Chapter 1</span>
                    <button id="text-next-chapter" class="text-btn">Next</button>
                </nav>
                <div class="text-reader-menu-panel" id="text-reader-menu-panel" hidden>
                    <h3>Settings</h3>
                    <div class="menu-section">
                        <label>Font Size</label>
                        <div class="font-size-controls">
                            <button id="text-font-decrease">A-</button>
                            <span id="text-font-size">16px</span>
                            <button id="text-font-increase">A+</button>
                        </div>
                    </div>
                    <div class="menu-section">
                        <label>Theme</label>
                        <div class="theme-controls">
                            <button class="theme-btn dark" data-theme="dark">Dark</button>
                            <button class="theme-btn light" data-theme="light">Light</button>
                            <button class="theme-btn sepia" data-theme="sepia">Sepia</button>
                        </div>
                    </div>
                    <div class="menu-section">
                        <h4>Chapters</h4>
                        <ul id="text-chapter-list"></ul>
                    </div>
                    <button id="text-close-menu" class="text-btn">Close</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.applyTheme();
        this.applyFontSize();
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('text-prev-chapter')?.addEventListener('click', () => {
            this.prevChapter();
        });

        document.getElementById('text-next-chapter')?.addEventListener('click', () => {
            this.nextChapter();
        });

        // Menu
        document.getElementById('text-reader-menu')?.addEventListener('click', () => {
            this.toggleMenu();
        });

        document.getElementById('text-close-menu')?.addEventListener('click', () => {
            this.toggleMenu(false);
        });

        // Font size
        document.getElementById('text-font-decrease')?.addEventListener('click', () => {
            this.changeFontSize(-2);
        });

        document.getElementById('text-font-increase')?.addEventListener('click', () => {
            this.changeFontSize(2);
        });

        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
            });
        });

        // Back button
        document.getElementById('text-reader-back')?.addEventListener('click', () => {
            window.location.href = '/frontend/dashboard.html';
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevChapter();
            if (e.key === 'ArrowRight') this.nextChapter();
            if (e.key === 'Escape') this.toggleMenu(false);
        });

        // Touch swipe
        let touchStartX = 0;
        const content = document.getElementById('text-reader-content');
        content?.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        content?.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                if (diff > 0) this.nextChapter();
                else this.prevChapter();
            }
        });
    }

    /**
     * Load book content
     * @param {string} bookId - Book ID
     */
    async loadBook(bookId) {
        try {
            const response = await fetch(`/api/books/text/${bookId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load book');
            }

            const data = await response.json();
            
            if (data.success) {
                this.chapters = data.chapters || [{ title: 'Content', content: data.content }];
                this.setTitle(data.title || 'Book');
                this.renderChapter(0);
                this.updateChapterList();
            } else {
                this.showError('Failed to load book content');
            }
        } catch (error) {
            console.error('Text reader error:', error);
            this.showError('Unable to load book. Please try again.');
        }
    }

    /**
     * Parse raw text content into chapters
     * @param {string} text - Raw book text
     */
    parseContent(text) {
        // Try to detect chapter markers
        const chapterPatterns = [
            /^Chapter\s+\d+/gim,
            /^CHAPTER\s+\d+/gm,
            /^Part\s+\d+/gim,
            /^Section\s+\d+/gim,
            /^\d+\./gm
        ];

        for (const pattern of chapterPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 1) {
                const parts = text.split(pattern);
                this.chapters = matches.map((title, i) => ({
                    title: title.trim(),
                    content: parts[i + 1]?.trim() || ''
                }));
                return;
            }
        }

        // No chapters detected, split by paragraphs for easier reading
        const paragraphs = text.split(/\n\n+/);
        const chunkSize = 20; // paragraphs per "chapter"
        
        this.chapters = [];
        for (let i = 0; i < paragraphs.length; i += chunkSize) {
            this.chapters.push({
                title: `Section ${Math.floor(i / chunkSize) + 1}`,
                content: paragraphs.slice(i, i + chunkSize).join('\n\n')
            });
        }
    }

    renderChapter(index) {
        if (index < 0 || index >= this.chapters.length) return;

        this.currentChapter = index;
        const chapter = this.chapters[index];
        const contentEl = document.getElementById('text-reader-content');

        if (contentEl) {
            // Render as plain text with paragraph breaks
            contentEl.textContent = '';
            const paragraphs = chapter.content.split(/\n\n+/).filter(p => p.trim());
            paragraphs.forEach(p => {
                const para = document.createElement('p');
                para.textContent = p.trim();
                contentEl.appendChild(para);
            });
        }

        // Update chapter info
        const chapterInfo = document.getElementById('text-chapter-info');
        if (chapterInfo) {
            chapterInfo.textContent = `${chapter.title} (${index + 1}/${this.chapters.length})`;
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('text-prev-chapter');
        const nextBtn = document.getElementById('text-next-chapter');
        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index === this.chapters.length - 1;

        // Scroll to top
        contentEl?.scrollTo(0, 0);

        // Save progress
        this.saveProgress();
    }

    prevChapter() {
        if (this.currentChapter > 0) {
            this.renderChapter(this.currentChapter - 1);
        }
    }

    nextChapter() {
        if (this.currentChapter < this.chapters.length - 1) {
            this.renderChapter(this.currentChapter + 1);
        }
    }

    goToChapter(index) {
        this.renderChapter(index);
        this.toggleMenu(false);
    }

    updateChapterList() {
        const list = document.getElementById('text-chapter-list');
        if (!list) return;

        list.textContent = '';
        
        this.chapters.forEach((ch, i) => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.className = `chapter-link ${i === this.currentChapter ? 'active' : ''}`;
            button.dataset.index = String(i);
            button.textContent = ch.title;
            button.addEventListener('click', () => {
                this.goToChapter(parseInt(button.dataset.index));
            });
            li.appendChild(button);
            list.appendChild(li);
        });
    }

    toggleMenu(show) {
        const panel = document.getElementById('text-reader-menu-panel');
        if (panel) {
            if (show === undefined) {
                panel.hidden = !panel.hidden;
            } else {
                panel.hidden = !show;
            }
        }
    }

    setTitle(title) {
        const titleEl = document.getElementById('text-reader-title');
        if (titleEl) titleEl.textContent = title;
    }

    changeFontSize(delta) {
        this.fontSize = Math.max(12, Math.min(24, this.fontSize + delta));
        this.applyFontSize();
        localStorage.setItem('textReaderFontSize', String(this.fontSize));
    }

    applyFontSize() {
        const content = document.getElementById('text-reader-content');
        if (content) {
            content.style.fontSize = `${this.fontSize}px`;
        }
        const sizeDisplay = document.getElementById('text-font-size');
        if (sizeDisplay) {
            sizeDisplay.textContent = `${this.fontSize}px`;
        }
    }

    setTheme(theme) {
        this.theme = theme;
        this.applyTheme();
        localStorage.setItem('textReaderTheme', theme);
    }

    applyTheme() {
        const wrapper = document.getElementById('text-reader-wrapper');
        if (wrapper) {
            wrapper.className = `text-reader theme-${this.theme}`;
        }

        // Update active theme button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.theme);
        });
    }

    saveProgress() {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId) {
            const progress = {
                chapter: this.currentChapter,
                percent: Math.round((this.currentChapter / this.chapters.length) * 100)
            };
            localStorage.setItem(`textProgress_${bookId}`, JSON.stringify(progress));

            // Sync to server if online
            if (navigator.onLine) {
                fetch('/api/books/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId, ...progress })
                }).catch(() => { /* Ignore sync errors */ });
            }
        }
    }

    loadProgress() {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId) {
            const saved = localStorage.getItem(`textProgress_${bookId}`);
            if (saved) {
                const { chapter } = JSON.parse(saved);
                if (chapter > 0 && chapter < this.chapters.length) {
                    this.renderChapter(chapter);
                }
            }
        }
    }

    showError(message) {
        const content = document.getElementById('text-reader-content');
        if (content) {
            content.textContent = '';
            const p = document.createElement('p');
            p.className = 'error-message';
            p.textContent = message;
            content.appendChild(p);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use
window.TextOnlyReader = TextOnlyReader;
