
/**
 * Private Reading Analytics
 * Tracks reading habits locally without external services
 */

class ReadingAnalytics {
    constructor() {
        this.stats = this.loadStats();
    }

    loadStats() {
        const saved = localStorage.getItem('reading-stats');
        return saved ? JSON.parse(saved) : {
            totalReadingTime: 0,
            booksFinished: 0,
            averageProgress: 0,
            readingSessions: [],
            favoriteGenres: {},
            readingStreak: 0,
            lastReadDate: null
        };
    }

    saveStats() {
        localStorage.setItem('reading-stats', JSON.stringify(this.stats));
    }

    startSession(bookId) {
        this.currentSession = {
            bookId,
            startTime: Date.now(),
            endTime: null
        };
    }

    endSession() {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();
        const duration = (this.currentSession.endTime - this.currentSession.startTime) / 1000 / 60; // minutes
        
        this.stats.totalReadingTime += duration;
        this.stats.readingSessions.push(this.currentSession);
        
        // Update streak
        const today = new Date().toDateString();
        if (this.stats.lastReadDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (this.stats.lastReadDate === yesterday) {
                this.stats.readingStreak++;
            } else {
                this.stats.readingStreak = 1;
            }
            this.stats.lastReadDate = today;
        }

        this.saveStats();
        this.currentSession = null;
    }

    trackBookFinished(bookId, genre) {
        this.stats.booksFinished++;
        if (genre) {
            this.stats.favoriteGenres[genre] = (this.stats.favoriteGenres[genre] || 0) + 1;
        }
        this.saveStats();
    }

    getStats() {
        return {
            ...this.stats,
            averageSessionTime: this.stats.readingSessions.length > 0 
                ? this.stats.totalReadingTime / this.stats.readingSessions.length 
                : 0,
            topGenre: Object.entries(this.stats.favoriteGenres)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
        };
    }

    getWeeklyReport() {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weekSessions = this.stats.readingSessions.filter(s => s.startTime > weekAgo);
        
        return {
            sessionsCount: weekSessions.length,
            totalMinutes: weekSessions.reduce((sum, s) => {
                return sum + ((s.endTime - s.startTime) / 1000 / 60);
            }, 0),
            uniqueBooks: new Set(weekSessions.map(s => s.bookId)).size
        };
    }
}

// Initialize analytics
const readingAnalytics = new ReadingAnalytics();
window.readingAnalytics = readingAnalytics;
