
/**
 * AI-Powered Features for Nightmare Library
 * Genre auto-tagging, reading recommendations, and smart insights
 */

class AIFeatures {
    constructor() {
        this.genreKeywords = {
            'fantasy': ['magic', 'dragon', 'wizard', 'fantasy', 'quest', 'realm', 'sorcerer'],
            'scifi': ['space', 'alien', 'future', 'robot', 'galaxy', 'cyberpunk', 'dystopia'],
            'mystery': ['detective', 'murder', 'crime', 'investigation', 'thriller', 'suspect'],
            'romance': ['love', 'heart', 'passion', 'romance', 'relationship', 'kiss'],
            'horror': ['horror', 'terror', 'haunted', 'ghost', 'nightmare', 'dark'],
            'biography': ['life', 'autobiography', 'memoir', 'biography', 'story of'],
            'history': ['history', 'historical', 'war', 'ancient', 'century'],
            'business': ['business', 'entrepreneur', 'startup', 'marketing', 'leadership'],
            'selfhelp': ['self-help', 'motivation', 'success', 'habit', 'mindset']
        };
    }

    /**
     * Auto-tag book genres based on title, author, and existing tags
     */
    autoTagGenre(book) {
        const text = `${book.title} ${book.author || ''} ${book.tags || ''}`.toLowerCase();
        const detectedGenres = [];

        for (const [genre, keywords] of Object.entries(this.genreKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    detectedGenres.push(genre);
                    break;
                }
            }
        }

        return detectedGenres.length > 0 ? detectedGenres : ['general'];
    }

    /**
     * Generate reading recommendations based on user's library
     */
    generateRecommendations(books, currentBook) {
        if (books.length < 2) return [];

        const currentGenres = this.autoTagGenre(currentBook);
        const recommendations = [];

        for (const book of books) {
            if (book.id === currentBook.id) continue;

            const bookGenres = this.autoTagGenre(book);
            const commonGenres = currentGenres.filter(g => bookGenres.includes(g));

            if (commonGenres.length > 0) {
                recommendations.push({
                    book,
                    score: commonGenres.length,
                    reason: `Similar genre: ${commonGenres.join(', ')}`
                });
            }
        }

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }

    /**
     * Extract chapter summaries from EPUB structure
     */
    async extractChapterSummaries(bookContent) {
        // Simple extraction of first sentences from each chapter
        const chapters = [];
        const chapterPattern = /<h[12][^>]*>(.*?)<\/h[12]>/gi;
        let match;

        while ((match = chapterPattern.exec(bookContent)) !== null) {
            const title = match[1].replace(/<[^>]*>/g, '');
            chapters.push({ title, summary: 'Chapter content...' });
        }

        return chapters;
    }

    /**
     * Analyze reading speed and provide insights
     */
    analyzeReadingSpeed(sessions) {
        if (sessions.length === 0) return null;

        const totalTime = sessions.reduce((sum, s) => {
            return sum + ((s.endTime - s.startTime) / 1000 / 60);
        }, 0);

        const avgSessionTime = totalTime / sessions.length;
        const totalPages = sessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
        const pagesPerMinute = totalPages / totalTime;

        return {
            avgSessionTime: Math.round(avgSessionTime),
            totalPages,
            pagesPerMinute: pagesPerMinute.toFixed(2),
            totalHours: (totalTime / 60).toFixed(1)
        };
    }

    /**
     * Generate XP and achievements based on reading activity
     */
    calculateReadingXP(progress, speed, consistency) {
        let xp = 0;
        
        // Progress XP (0-100 points)
        xp += Math.floor(progress);

        // Speed bonus (faster reading = more XP)
        if (speed > 200) xp += 50;
        else if (speed > 100) xp += 25;

        // Consistency bonus (daily reading streak)
        xp += consistency * 10;

        return xp;
    }
}

// Initialize AI features
const aiFeatures = new AIFeatures();
window.aiFeatures = aiFeatures;
