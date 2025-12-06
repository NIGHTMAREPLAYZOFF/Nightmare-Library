
/**
 * Emoji Bookmarking System
 * Visual bookmarks with emoji indicators
 */

class EmojiBookmarks {
    constructor() {
        this.bookmarks = this.loadBookmarks();
        this.emojis = ['📌', '⭐', '❤️', '💡', '🔖', '✨', '🎯', '🏆'];
    }

    loadBookmarks() {
        const saved = localStorage.getItem('emoji-bookmarks');
        return saved ? JSON.parse(saved) : {};
    }

    saveBookmarks() {
        localStorage.setItem('emoji-bookmarks', JSON.stringify(this.bookmarks));
    }

    addBookmark(bookId, position, emoji = '📌', note = '') {
        if (!this.bookmarks[bookId]) {
            this.bookmarks[bookId] = [];
        }

        this.bookmarks[bookId].push({
            id: Date.now().toString(),
            position,
            emoji,
            note,
            timestamp: Date.now()
        });

        this.saveBookmarks();
    }

    removeBookmark(bookId, bookmarkId) {
        if (!this.bookmarks[bookId]) return;

        this.bookmarks[bookId] = this.bookmarks[bookId].filter(
            b => b.id !== bookmarkId
        );

        this.saveBookmarks();
    }

    getBookmarks(bookId) {
        return this.bookmarks[bookId] || [];
    }

    renderBookmarkUI(bookId) {
        const bookmarks = this.getBookmarks(bookId);
        
        return `
            <div class="bookmark-panel">
                <h3>Bookmarks</h3>
                <div class="bookmark-list">
                    ${bookmarks.map(b => `
                        <div class="bookmark-item" data-position="${b.position}">
                            <span class="bookmark-emoji">${b.emoji}</span>
                            <span class="bookmark-note">${b.note || 'No note'}</span>
                            <button onclick="emojiBookmarks.removeBookmark('${bookId}', '${b.id}')">×</button>
                        </div>
                    `).join('')}
                </div>
                <div class="add-bookmark">
                    <select id="emoji-select">
                        ${this.emojis.map(e => `<option value="${e}">${e}</option>`).join('')}
                    </select>
                    <input type="text" id="bookmark-note" placeholder="Add note...">
                    <button onclick="emojiBookmarks.addBookmarkFromUI('${bookId}')">Add</button>
                </div>
            </div>
        `;
    }

    addBookmarkFromUI(bookId) {
        const emoji = document.getElementById('emoji-select').value;
        const note = document.getElementById('bookmark-note').value;
        const position = window.currentReadingPosition || 0;

        this.addBookmark(bookId, position, emoji, note);
        
        // Refresh UI
        const panel = document.querySelector('.bookmark-panel');
        if (panel) {
            panel.outerHTML = this.renderBookmarkUI(bookId);
        }
    }
}

// Initialize emoji bookmarks
const emojiBookmarks = new EmojiBookmarks();
window.emojiBookmarks = emojiBookmarks;
