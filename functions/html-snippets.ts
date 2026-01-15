/**
 * HTML Snippet Generators
 * Backend-rendered HTML components for the frontend
 */

export interface Book {
  id: string;
  title: string;
  author: string | null;
  tags: string | null;
  cover_url: string | null;
  file_type: string;
  progress?: number;
}

export interface Shelf {
  id: string;
  name: string;
  color: string;
  bookIds?: string[];
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate book card HTML snippet
 */
export function generateBookCardHtml(book: Book): string {
  const progress = book.progress || 0;
  const title = escapeHtml(book.title);
  const author = escapeHtml(book.author) || 'Unknown Author';
  const tags = (book.tags || '').split(',').filter(t => t.trim());
  
  const badgesHtml = tags.slice(0, 2).map(t => 
    `<span class="badge">${escapeHtml(t.trim())}</span>`
  ).join('');

  return `<article class="book-card" data-id="${book.id}" role="listitem" tabindex="0">
    <div class="book-cover-container">
        <img 
            class="book-cover" 
            src="/api/books/cover/${book.id}" 
            alt="${title} cover"
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
    <h3 class="book-title" title="${title}">${title}</h3>
    <p class="book-author">${author}</p>
    <div class="badges">${badgesHtml}</div>
    <button class="card-menu" aria-label="Book options" aria-haspopup="menu">&#8942;</button>
</article>`;
}

/**
 * Generate shelf item HTML for sidebar
 */
export function generateShelfItemHtml(shelf: Shelf, isActive: boolean = false): string {
  return `<li class="sidebar-item ${isActive ? 'active' : ''}" data-view="shelf:${shelf.id}">
    <span class="shelf-color" style="background: ${escapeHtml(shelf.color) || '#bb86fc'}"></span>
    <span>${escapeHtml(shelf.name)}</span>
</li>`;
}

/**
 * Generate upload tile HTML
 */
export function generateUploadTileHtml(): string {
  return `<div class="upload-tile" id="upload-tile" onclick="openUploadModal()">
    <div class="upload-tile-icon">+</div>
    <p class="upload-tile-text">Upload Book</p>
</div>`;
}

/**
 * Generate empty state HTML
 */
export function generateEmptyStateHtml(icon: string, title: string, text: string): string {
  return `<div class="empty-state">
    <div class="empty-state-icon">${icon}</div>
    <h3 class="empty-state-title">${escapeHtml(title)}</h3>
    <p class="empty-state-text">${escapeHtml(text)}</p>
</div>`;
}

/**
 * Generate skeleton loader HTML
 */
export function generateSkeletonHtml(count: number = 4): string {
  const skeleton = `<div class="book-card">
    <div class="skeleton skeleton-cover"></div>
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text short"></div>
</div>`;
  return Array(count).fill(skeleton).join('');
}
