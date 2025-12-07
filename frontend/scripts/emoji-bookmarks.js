
/**
 * Emoji Bookmarking System
 * Visual bookmarks with emoji indicators
 */

import { createElement, createElementWithText, batchAppend, escapeHtml } from './dom-helpers.js';

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

    createBookmarkUI(bookId) {
        const bookmarks = this.getBookmarks(bookId);
        
        const panel = createElement('div', { className: 'bookmark-panel' });
        
        // Title
        const title = createElementWithText('h3', 'Bookmarks');
        panel.appendChild(title);
        
        // Bookmark list
        const list = createElement('div', { className: 'bookmark-list' });
        
        bookmarks.forEach(bookmark => {
            const item = createElement('div', {
                className: 'bookmark-item',
                dataset: { position: bookmark.position }
            });
            
            const emojiSpan = createElementWithText('span', bookmark.emoji, {
                className: 'bookmark-emoji'
            });
            
            const noteSpan = createElementWithText('span', bookmark.note || 'No note', {
                className: 'bookmark-note'
            });
            
            const deleteBtn = createElementWithText('button', '×');
            deleteBtn.onclick = () => this.removeBookmark(bookId, bookmark.id);
            
            item.appendChild(emojiSpan);
            item.appendChild(noteSpan);
            item.appendChild(deleteBtn);
            list.appendChild(item);
        });
        
        panel.appendChild(list);
        
        // Add bookmark section
        const addSection = createElement('div', { className: 'add-bookmark' });
        
        const emojiSelect = createElement('select', { id: 'emoji-select' });
        this.emojis.forEach(emoji => {
            const option = createElementWithText('option', emoji, { value: emoji });
            emojiSelect.appendChild(option);
        });
        
        const noteInput = createElement('input', {
            type: 'text',
            id: 'bookmark-note',
            placeholder: 'Add note...'
        });
        
        const addBtn = createElementWithText('button', 'Add');
        addBtn.onclick = () => this.addBookmarkFromUI(bookId);
        
        addSection.appendChild(emojiSelect);
        addSection.appendChild(noteInput);
        addSection.appendChild(addBtn);
        panel.appendChild(addSection);
        
        return panel;
    }

    addBookmarkFromUI(bookId) {
        const emojiSelect = document.getElementById('emoji-select');
        const noteInput = document.getElementById('bookmark-note');
        
        if (!emojiSelect || !noteInput) return;
        
        const emoji = emojiSelect.value;
        const note = noteInput.value;
        const position = window.currentReadingPosition || 0;

        this.addBookmark(bookId, position, emoji, note);
        
        // Refresh UI safely
        const panel = document.querySelector('.bookmark-panel');
        if (panel && panel.parentNode) {
            const newPanel = this.createBookmarkUI(bookId);
            panel.parentNode.replaceChild(newPanel, panel);
        }
    }
}

// Initialize emoji bookmarks
const emojiBookmarks = new EmojiBookmarks();
window.emojiBookmarks = emojiBookmarks;
