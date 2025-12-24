/**
 * PDF Reader using PDF.js
 * Renders PDFs with chapter navigation and progress tracking
 */

class PDFReader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.pdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1;
        this.theme = 'light';
    }

    /**
     * Initialize PDF reader
     */
    init() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="pdf-reader" id="pdf-reader-wrapper">
                <header class="pdf-reader-header">
                    <button id="pdf-reader-back" class="pdf-btn">Back</button>
                    <span id="pdf-reader-title">Loading...</span>
                    <button id="pdf-reader-menu" class="pdf-btn">Menu</button>
                </header>
                <div class="pdf-viewer" id="pdf-canvas-container">
                    <canvas id="pdf-canvas"></canvas>
                </div>
                <nav class="pdf-reader-nav">
                    <button id="pdf-prev-page" class="pdf-btn">← Previous</button>
                    <input type="number" id="pdf-page-input" min="1" value="1" />
                    <span id="pdf-page-info">/ 0</span>
                    <button id="pdf-next-page" class="pdf-btn">Next →</button>
                </nav>
                <div class="pdf-reader-menu" id="pdf-reader-menu-panel" hidden>
                    <h3>Reader Settings</h3>
                    <div class="menu-section">
                        <label>Zoom</label>
                        <div class="zoom-controls">
                            <button id="pdf-zoom-out">−</button>
                            <span id="pdf-zoom-level">100%</span>
                            <button id="pdf-zoom-in">+</button>
                        </div>
                    </div>
                    <button id="pdf-close-menu" class="pdf-btn">Close</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.setupPDFWorker();
    }

    setupPDFWorker() {
        // Load PDF.js from CDN if not already loaded
        if (!window.pdfjsLib) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            };
            document.head.appendChild(script);
        }
    }

    setupEventListeners() {
        document.getElementById('pdf-prev-page')?.addEventListener('click', () => this.prevPage());
        document.getElementById('pdf-next-page')?.addEventListener('click', () => this.nextPage());
        document.getElementById('pdf-reader-back')?.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
        document.getElementById('pdf-reader-menu')?.addEventListener('click', () => this.toggleMenu());
        document.getElementById('pdf-close-menu')?.addEventListener('click', () => this.toggleMenu(false));
        document.getElementById('pdf-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('pdf-zoom-out')?.addEventListener('click', () => this.zoomOut());
        
        document.getElementById('pdf-page-input')?.addEventListener('change', (e) => {
            const page = parseInt(e.target.value);
            if (page > 0 && page <= this.totalPages) {
                this.goToPage(page);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
            if (e.key === 'Escape') this.toggleMenu(false);
        });
    }

    async loadBook(bookId) {
        try {
            const response = await fetch(`/api/books/get?id=${bookId}`);
            const data = await response.json();

            if (data.success && data.book) {
                document.getElementById('pdf-reader-title').textContent = data.book.title;
                await this.loadPDF(data.book.file_url);
                this.loadProgress();
                
                // Save on page unload only
                window.addEventListener('beforeunload', () => this.saveProgress());
                
                // Cross-tab sync
                window.addEventListener('storage', (e) => {
                    if (e.key === `pdfProgress_${bookId}` && e.newValue) {
                        const newProgress = JSON.parse(e.newValue);
                        document.getElementById('pdf-page-info').textContent = `/ ${this.totalPages}`;
                    }
                });
            }
        } catch (error) {
            console.error('PDF load error:', error);
            this.showError('Failed to load PDF');
        }
    }

    async loadPDF(url) {
        try {
            if (!window.pdfjsLib) {
                throw new Error('PDF.js not loaded');
            }

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.pdf = pdf;
            this.totalPages = pdf.numPages;
            
            document.getElementById('pdf-page-info').textContent = `/ ${this.totalPages}`;
            this.renderPage(1);
        } catch (error) {
            console.error('PDF parsing error:', error);
            this.showError('Failed to parse PDF');
        }
    }

    async renderPage(pageNum) {
        if (!this.pdf || pageNum < 1 || pageNum > this.totalPages) return;

        this.currentPage = pageNum;
        const page = await this.pdf.getPage(pageNum);
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: this.scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        document.getElementById('pdf-page-input').value = pageNum;
        this.saveProgress();
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.renderPage(this.currentPage + 1);
        }
    }

    goToPage(pageNum) {
        this.renderPage(pageNum);
    }

    zoomIn() {
        this.scale = Math.min(3, this.scale + 0.2);
        this.renderPage(this.currentPage);
        document.getElementById('pdf-zoom-level').textContent = Math.round(this.scale * 100) + '%';
    }

    zoomOut() {
        this.scale = Math.max(0.5, this.scale - 0.2);
        this.renderPage(this.currentPage);
        document.getElementById('pdf-zoom-level').textContent = Math.round(this.scale * 100) + '%';
    }

    toggleMenu(show) {
        const panel = document.getElementById('pdf-reader-menu-panel');
        if (panel) {
            panel.hidden = show === undefined ? !panel.hidden : !show;
        }
    }

    saveProgress() {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId) {
            const progress = {
                percent: Math.round((this.currentPage / this.totalPages) * 100),
                currentPage: this.currentPage
            };
            // Save locally first
            localStorage.setItem(`pdfProgress_${bookId}`, JSON.stringify(progress));
            
            // Send to server async
            if (navigator.onLine) {
                fetch('/api/books/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId, ...progress }),
                    keepalive: true
                }).catch(() => {});
            }
        }
    }

    loadProgress() {
        const bookId = new URLSearchParams(window.location.search).get('id');
        if (bookId) {
            const saved = localStorage.getItem(`pdfProgress_${bookId}`);
            if (saved) {
                const { currentPage } = JSON.parse(saved);
                if (currentPage > 0 && currentPage <= this.totalPages) {
                    this.renderPage(currentPage);
                }
            }
        }
    }

    showError(message) {
        const container = document.getElementById('pdf-canvas-container');
        if (container) {
            container.innerHTML = `<p class="error-message">${message}</p>`;
        }
    }
}

window.PDFReader = PDFReader;
