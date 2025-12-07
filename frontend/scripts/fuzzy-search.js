
/**
 * Fuzzy Search Implementation
 * Lightweight fuzzy matching for book search
 */

class FuzzySearch {
    constructor() {
        this.books = [];
    }

    setBooks(books) {
        this.books = books;
    }

    search(query, books = null) {
        const searchIn = books || this.books;
        if (!query || query.length < 2) return searchIn;

        const lowerQuery = query.toLowerCase();
        const terms = lowerQuery.split(/\s+/);

        return searchIn
            .map(book => {
                let score = 0;
                const title = (book.title || '').toLowerCase();
                const author = (book.author || '').toLowerCase();
                const tags = (book.tags || '').toLowerCase();
                const combined = `${title} ${author} ${tags}`;

                // Exact match bonus
                if (combined.includes(lowerQuery)) {
                    score += 100;
                }

                // Title match bonus
                if (title.includes(lowerQuery)) {
                    score += 50;
                }

                // Word-by-word matching
                terms.forEach(term => {
                    if (title.includes(term)) score += 20;
                    if (author.includes(term)) score += 15;
                    if (tags.includes(term)) score += 10;
                });

                // Fuzzy character matching
                score += this.fuzzyScore(lowerQuery, combined);

                return { book, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.book);
    }

    fuzzyScore(query, text) {
        let score = 0;
        let queryIndex = 0;

        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                score += 1;
                queryIndex++;
            }
        }

        return queryIndex === query.length ? score : 0;
    }
}

// Initialize and export
const fuzzySearch = new FuzzySearch();
window.fuzzySearch = fuzzySearch;

export default fuzzySearch;
