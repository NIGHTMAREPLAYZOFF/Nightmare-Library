/**
 * Nightmare Library - Client-Side Fuzzy Search
 * Provides fast fuzzy matching for book titles, authors, and tags
 */

class FuzzySearch {
    constructor(options = {}) {
        this.threshold = options.threshold || 0.3;
        this.keys = options.keys || ['title', 'author', 'tags'];
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshtein(a, b) {
        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculate similarity score between two strings (0 to 1)
     */
    similarity(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();

        if (s1 === s2) return 1;
        if (s1.includes(s2) || s2.includes(s1)) return 0.9;

        const maxLen = Math.max(s1.length, s2.length);
        if (maxLen === 0) return 1;

        const distance = this.levenshtein(s1, s2);
        return 1 - distance / maxLen;
    }

    /**
     * Check if query matches a value (supports arrays for tags)
     */
    matchValue(query, value) {
        if (!value) return 0;

        if (Array.isArray(value)) {
            return Math.max(...value.map(v => this.similarity(query, v)));
        }

        return this.similarity(query, String(value));
    }

    /**
     * Search items for query
     * @param {string} query - Search query
     * @param {Array} items - Items to search
     * @returns {Array} Filtered and sorted items
     */
    search(query, items) {
        if (!query || !query.trim()) {
            return items;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const queryWords = normalizedQuery.split(/\s+/);

        const results = items.map(item => {
            let maxScore = 0;

            for (const key of this.keys) {
                let value = item[key];

                // Handle tags as comma-separated string
                if (key === 'tags' && typeof value === 'string') {
                    value = value.split(',').map(t => t.trim());
                }

                // Check each query word
                for (const word of queryWords) {
                    const score = this.matchValue(word, value);
                    maxScore = Math.max(maxScore, score);

                    // Exact match bonus
                    const valueStr = Array.isArray(value) ? value.join(' ') : String(value || '');
                    if (valueStr.toLowerCase().includes(word)) {
                        maxScore = Math.max(maxScore, 0.95);
                    }
                }
            }

            return { item, score: maxScore };
        });

        return results
            .filter(r => r.score >= this.threshold)
            .sort((a, b) => b.score - a.score)
            .map(r => r.item);
    }
}

// Create global instance
window.fuzzySearch = new FuzzySearch({
    threshold: 0.3,
    keys: ['title', 'author', 'tags']
});

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
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

window.debounce = debounce;
