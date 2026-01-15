/**
 * AI-Powered Features for Nightmare Library
 * Backend-only AI with user-initiated genre selection
 * Auto-genre REMOVED per requirements - genres are user-initiated only
 */

class AIFeatures {
    constructor() {
        this.analyticsCache = null;
        this.analyticsCacheTime = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get genre suggestions for a book (user-initiated)
     * @param {string} bookId - Book ID to get suggestions for
     * @returns {Promise<Array>} Genre suggestions with confidence scores
     */
    async getGenreSuggestions(bookId) {
        try {
            const response = await fetch('/api/ai/genre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId })
            });

            const data = await response.json();
            if (data.success) {
                return data.suggestions || [];
            }
            return [];
        } catch (error) {
            console.error('Genre suggestion error:', error);
            return [];
        }
    }

    /**
     * Apply a genre to a book (user-confirmed)
     * @param {string} bookId - Book ID
     * @param {string} genre - Genre to apply
     * @returns {Promise<boolean>} Success status
     */
    async applyGenre(bookId, genre) {
        try {
            const response = await fetch('/api/ai/genre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, applyGenre: genre })
            });

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Apply genre error:', error);
            return false;
        }
    }

    /**
     * Get book recommendations from backend
     * @param {string} bookId - Current book ID
     * @param {number} limit - Max recommendations
     * @returns {Promise<Array>} Recommendations
     */
    async getRecommendations(bookId, limit = 5) {
        try {
            const response = await fetch('/api/ai/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, limit })
            });

            const data = await response.json();
            if (data.success) {
                return data.recommendations || [];
            }
            return [];
        } catch (error) {
            console.error('Recommendations error:', error);
            return [];
        }
    }

    /**
     * Get reading analytics from backend
     * @returns {Promise<Object>} Analytics data
     */
    async getAnalytics() {
        // Check cache first
        if (this.analyticsCache && 
            Date.now() - this.analyticsCacheTime < this.CACHE_DURATION) {
            return this.analyticsCache;
        }

        try {
            const response = await fetch('/api/ai/analytics');
            const data = await response.json();

            if (data.success) {
                this.analyticsCache = data.analytics;
                this.analyticsCacheTime = Date.now();
                return data.analytics;
            }
            return null;
        } catch (error) {
            console.error('Analytics error:', error);
            return null;
        }
    }

    /**
     * Get chapter summaries for a book
     * @param {string} bookId - Book ID
     * @param {string} content - Optional book content for parsing
     * @returns {Promise<Array>} Chapter summaries
     */
    async getChapterSummaries(bookId, content = null) {
        try {
            const body = { bookId };
            if (content) body.content = content;

            const response = await fetch('/api/ai/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.success) {
                return data.chapters || [];
            }
            return [];
        } catch (error) {
            console.error('Summary error:', error);
            return [];
        }
    }

    /**
     * Calculate local XP for display (mirrors backend logic)
     * Used for immediate UI feedback before backend sync
     */
    calculateLocalXP(stats) {
        let xp = 0;
        xp += (stats.totalBooks || 0) * 10;
        xp += (stats.booksRead || 0) * 50;
        xp += Math.floor((stats.totalReadingTime || 0) / 10) * 5;
        xp += (stats.readingStreak || 0) * 10;
        return xp;
    }

    /**
     * Get level from XP
     */
    getLevel(xp) {
        let level = 1;
        let threshold = 100;
        let remaining = xp;

        while (remaining >= threshold) {
            remaining -= threshold;
            level++;
            threshold = level * 100 + 100;
        }

        return {
            level,
            currentXP: remaining,
            nextLevelXP: threshold,
            progress: Math.round((remaining / threshold) * 100)
        };
    }

    /**
     * Format reading time for display
     */
    formatReadingTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    /**
     * Get achievement badge HTML
     */
    getAchievementBadge(achievement) {
        const badges = {
            'First Book': { icon: '📖', color: '#4CAF50' },
            'Bookworm': { icon: '🐛', color: '#2196F3' },
            'Library Builder': { icon: '🏛️', color: '#9C27B0' },
            'Dedicated Reader': { icon: '📚', color: '#FF9800' },
            'Book Master': { icon: '👑', color: '#FFD700' },
            'Week Warrior': { icon: '⚔️', color: '#E91E63' },
            'Month Champion': { icon: '🏆', color: '#673AB7' },
            'Session Star': { icon: '⭐', color: '#FFC107' }
        };

        const badge = badges[achievement] || { icon: '🎖️', color: '#607D8B' };
        return `<span class="achievement-badge" style="background: ${badge.color}">${badge.icon} ${achievement}</span>`;
    }
}

// Initialize AI features
const aiFeatures = new AIFeatures();
window.aiFeatures = aiFeatures;
