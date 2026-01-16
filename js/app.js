/**
 * Theme Management and Auth Handling for Nightmare Library
 */

const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const submitBtn = document.getElementById('submit-btn');
const passwordInput = document.getElementById('password');
const themeSwitch = document.getElementById('theme-switch');
const themeIcon = document.getElementById('theme-icon');

/**
 * Checks if user prefers dark scheme
 * @returns {boolean}
 */
const prefersDarkScheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Gets current theme from local storage
 * @returns {string|null}
 */
const currentTheme = () => localStorage.getItem('theme');

/**
 * Sets the application theme
 * @param {string} theme - 'dark' or 'light'
 */
const setTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeIcon.src = '/assets/sun.svg';
        themeIcon.alt = 'Switch to light theme';
    } else {
        document.body.classList.remove('dark-theme');
        themeIcon.src = '/assets/moon.svg';
        themeIcon.alt = 'Switch to dark theme';
    }
    localStorage.setItem('theme', theme);
};

// Initialize theme on load
if (currentTheme() === 'dark' || (prefersDarkScheme() && !currentTheme())) {
    setTheme('dark');
} else {
    setTheme('light');
}

themeSwitch.addEventListener('click', () => {
    const newTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

/**
 * Displays error message to user
 * @param {string} message 
 */
const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');
};

/**
 * Handles login form submission
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = passwordInput.value;

    errorMessage.classList.remove('visible');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = '/dashboard.html';
        } else {
            let message = data.message || 'Login failed';

            if (data.attemptsRemaining !== undefined && data.attemptsRemaining > 0) {
                message += ` (${data.attemptsRemaining} attempts remaining)`;
            }

            if (data.locked) {
                passwordInput.disabled = true;
                submitBtn.disabled = true;
            }

            showError(message);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});