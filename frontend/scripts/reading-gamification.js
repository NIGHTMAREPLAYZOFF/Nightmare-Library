
/**
 * Reading Gamification System
 * Track reading speed, earn XP, unlock achievements
 */

class ReadingGamification {
    constructor() {
        this.profile = this.loadProfile();
        this.achievements = this.initAchievements();
    }

    loadProfile() {
        const saved = localStorage.getItem('reading-profile');
        return saved ? JSON.parse(saved) : {
            xp: 0,
            level: 1,
            booksCompleted: 0,
            totalPagesRead: 0,
            streak: 0,
            badges: []
        };
    }

    saveProfile() {
        localStorage.setItem('reading-profile', JSON.stringify(this.profile));
    }

    initAchievements() {
        return [
            { id: 'first_book', name: 'First Steps', desc: 'Complete your first book', xp: 100 },
            { id: 'speed_reader', name: 'Speed Reader', desc: 'Read 200 pages/hour', xp: 200 },
            { id: 'night_owl', name: 'Night Owl', desc: 'Read after midnight', xp: 50 },
            { id: 'librarian', name: 'Librarian', desc: 'Upload 10 books', xp: 150 },
            { id: 'streak_7', name: 'Weekly Reader', desc: '7-day reading streak', xp: 300 }
        ];
    }

    addXP(amount, reason = '') {
        this.profile.xp += amount;
        
        // Level up check
        const newLevel = Math.floor(this.profile.xp / 1000) + 1;
        if (newLevel > this.profile.level) {
            this.profile.level = newLevel;
            this.showLevelUpNotification(newLevel);
        }

        this.saveProfile();
        this.showXPGain(amount, reason);
    }

    trackReadingSession(pagesRead, timeMinutes) {
        const pagesPerHour = (pagesRead / timeMinutes) * 60;
        let xp = pagesRead * 2; // 2 XP per page

        // Speed bonus
        if (pagesPerHour > 200) {
            xp += 50;
            this.unlockAchievement('speed_reader');
        }

        this.profile.totalPagesRead += pagesRead;
        this.addXP(xp, `Read ${pagesRead} pages`);
    }

    completeBook() {
        this.profile.booksCompleted++;
        this.addXP(500, 'Book completed!');

        if (this.profile.booksCompleted === 1) {
            this.unlockAchievement('first_book');
        }

        this.saveProfile();
    }

    unlockAchievement(achievementId) {
        if (this.profile.badges.includes(achievementId)) return;

        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement) return;

        this.profile.badges.push(achievementId);
        this.addXP(achievement.xp, achievement.name);
        this.showAchievementUnlocked(achievement);
    }

    showXPGain(amount, reason) {
        const notification = document.createElement('div');
        notification.className = 'xp-notification';
        notification.innerHTML = `+${amount} XP${reason ? ': ' + reason : ''}`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    showLevelUpNotification(level) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `🎉 Level ${level}!`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
    }

    showAchievementUnlocked(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <h3>🏆 Achievement Unlocked!</h3>
            <p>${achievement.name}</p>
            <small>${achievement.desc}</small>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
    }

    getStats() {
        return {
            ...this.profile,
            nextLevelXP: (this.profile.level * 1000),
            progressToNextLevel: (this.profile.xp % 1000) / 10
        };
    }
}

// Initialize gamification
const gamification = new ReadingGamification();
window.gamification = gamification;
