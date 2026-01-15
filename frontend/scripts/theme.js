/**
 * Global Theme Engine
 * Handles automatic light/dark mode detection and manual toggle
 */

class ThemeEngine {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupListeners();
        this.createThemeToggle();
    }

    loadTheme() {
        const saved = localStorage.getItem('app-theme');
        if (saved) return saved;

        // Auto-detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    applyTheme(theme) {
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        this.currentTheme = theme;
        localStorage.setItem('app-theme', theme);
    }

    setupListeners() {
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }

    createThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle');
        if (!themeBtn) return;

        this.updateThemeIcon(themeBtn);

        themeBtn.addEventListener('click', () => {
            const themes = ['dark', 'light', 'auto'];
            const currentIndex = themes.indexOf(this.currentTheme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];

            this.applyTheme(nextTheme);
            this.updateThemeIcon(themeBtn);
        });
    }

    updateThemeIcon(btn) {
        const icons = {
            dark: '🌙',
            light: '☀️',
            auto: '🔄'
        };
        btn.textContent = icons[this.currentTheme] || icons.dark;
        btn.title = `Theme: ${this.currentTheme}`;
    }

    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }
}

// Initialize theme engine
const themeEngine = new ThemeEngine();
window.themeEngine = themeEngine;