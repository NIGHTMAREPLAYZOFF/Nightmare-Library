/**
 * Cloudflare Pages/Workers Helper Utilities
 * Provides useful utilities for Cloudflare-specific patterns
 */

/**
 * Lazy load images using Intersection Observer
 * Usage: lazyLoadImages('img[data-src]')
 */
export function lazyLoadImages(selector = 'img[data-src]') {
    if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        document.querySelectorAll(selector).forEach(img => {
            img.src = img.dataset.src;
        });
        return;
    }

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });

    document.querySelectorAll(selector).forEach(img => imageObserver.observe(img));
}

/**
 * Virtual scrolling for large lists
 * Reduces DOM nodes and improves performance
 */
export class VirtualScroller {
    constructor(container, items, renderItem, itemHeight = 50) {
        this.container = container;
        this.items = items;
        this.renderItem = renderItem;
        this.itemHeight = itemHeight;
        this.visibleItems = [];
        this.scrollTop = 0;

        this.viewport = document.createElement('div');
        this.viewport.style.height = this.items.length * this.itemHeight + 'px';
        this.viewport.style.position = 'relative';

        this.content = document.createElement('div');
        this.content.style.position = 'absolute';
        this.content.style.width = '100%';
        this.content.style.top = '0';

        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);

        this.container.addEventListener('scroll', () => this.onScroll());
        this.render();
    }

    onScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }

    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.ceil((this.scrollTop + this.container.clientHeight) / this.itemHeight);

        this.content.innerHTML = '';
        for (let i = startIndex; i < Math.min(endIndex + 1, this.items.length); i++) {
            const item = this.items[i];
            const element = this.renderItem(item, i);
            element.style.position = 'absolute';
            element.style.top = i * this.itemHeight + 'px';
            element.style.height = this.itemHeight + 'px';
            this.content.appendChild(element);
        }
    }
}

/**
 * Cache busting utility for CDN
 * Appends version query parameter to URLs
 */
export function withCacheBust(url, version = Date.now()) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
}

/**
 * Request debouncing for API calls
 * Prevents excessive requests while typing/scrolling
 */
export function debounce(func, wait) {
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

/**
 * Throttle function for resize/scroll events
 */
export function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Network status detection
 */
export const networkStatus = {
    isOnline: navigator.onLine,
    
    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            window.dispatchEvent(new CustomEvent('app:online'));
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            window.dispatchEvent(new CustomEvent('app:offline'));
        });
    },

    onOnline(callback) {
        window.addEventListener('app:online', callback);
    },

    onOffline(callback) {
        window.addEventListener('app:offline', callback);
    }
};

/**
 * IndexedDB wrapper for local caching
 */
export class LocalCache {
    constructor(dbName = 'nightmare-library-cache', storeName = 'cache') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };
        });
    }

    async get(key) {
        const tx = this.db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        return new Promise((resolve) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
        });
    }

    async set(key, value, ttl = 86400000) {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const expiresAt = Date.now() + ttl;
        return new Promise((resolve) => {
            store.put({ key, value, expiresAt });
            tx.oncomplete = () => resolve();
        });
    }

    async clear() {
        const tx = this.db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        return new Promise((resolve) => {
            store.clear();
            tx.oncomplete = () => resolve();
        });
    }
}

/**
 * Metrics/Analytics helper
 */
export class MetricsCollector {
    constructor() {
        this.metrics = {};
    }

    startTimer(label) {
        if (!this.metrics[label]) {
            this.metrics[label] = { times: [], count: 0 };
        }
        return { startTime: performance.now(), label };
    }

    endTimer(timer) {
        const duration = performance.now() - timer.startTime;
        this.metrics[timer.label].times.push(duration);
        this.metrics[timer.label].count++;
        return duration;
    }

    getMetric(label) {
        const metric = this.metrics[label];
        if (!metric || metric.times.length === 0) return null;
        
        const times = metric.times;
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        return { avg, min, max, count: metric.count };
    }

    report() {
        console.table(
            Object.entries(this.metrics).reduce((acc, [label, data]) => {
                const metric = this.getMetric(label);
                if (metric) {
                    acc[label] = metric;
                }
                return acc;
            }, {})
        );
    }
}

/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error('JSON parse error:', e);
        return fallback;
    }
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

/**
 * Exponential backoff retry
 */
export async function retryWithBackoff(
    fn,
    maxAttempts = 3,
    initialDelayMs = 100
) {
    let lastError;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1) {
                const delayMs = initialDelayMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    
    throw lastError;
}

// Initialize network status on load
if (typeof window !== 'undefined') {
    networkStatus.init();
}
