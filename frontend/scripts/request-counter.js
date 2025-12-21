/**
 * Request Counter - Tracks Cloudflare Pages API calls
 * Displays counter in header to help optimize API usage
 */

class RequestCounter {
    constructor() {
        this.count = parseInt(localStorage.getItem('cf-request-count') || '0');
        this.display = document.getElementById('request-counter');
        this.init();
    }

    init() {
        // Create counter element if doesn't exist
        if (!this.display) {
            const header = document.querySelector('header') || document.body;
            const counter = document.createElement('div');
            counter.id = 'request-counter';
            counter.className = 'request-counter';
            counter.textContent = `📊 API Calls: ${this.count}`;
            header.insertAdjacentElement('afterbegin', counter);
            this.display = counter;
        }

        // Hook all fetch calls
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            // Only count API calls to /api/* endpoints
            if (typeof url === 'string' && url.includes('/api/')) {
                this.increment();
            }
            return originalFetch.apply(window, args);
        };
    }

    increment() {
        this.count++;
        localStorage.setItem('cf-request-count', String(this.count));
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.display) {
            this.display.textContent = `📊 API Calls: ${this.count}`;
        }
    }

    reset() {
        this.count = 0;
        localStorage.setItem('cf-request-count', '0');
        this.updateDisplay();
    }
}

// Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.requestCounter = new RequestCounter();
    });
} else {
    window.requestCounter = new RequestCounter();
}

// Export for use in other scripts
export default RequestCounter;
