
/**
 * IndexedDB Wrapper
 * Provides client-side storage for offline support
 */

class IndexedDBStore {
    constructor() {
        this.dbName = 'NightmareLibrary';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Books store
                if (!db.objectStoreNames.contains('books')) {
                    const booksStore = db.createObjectStore('books', { keyPath: 'id' });
                    booksStore.createIndex('title', 'title', { unique: false });
                    booksStore.createIndex('author', 'author', { unique: false });
                }

                // Progress store
                if (!db.objectStoreNames.contains('progress')) {
                    db.createObjectStore('progress', { keyPath: 'bookId' });
                }

                // Cache store
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
        });
    }

    async set(storeName, data) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return store.put(data);
    }

    async get(storeName, key) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return store.delete(key);
    }

    async clear(storeName) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return store.clear();
    }
}

// Initialize and export
const idbStore = new IndexedDBStore();
window.idbStore = idbStore;

// Auto-init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => idbStore.init());
} else {
    idbStore.init();
}
