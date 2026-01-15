/**
 * Performance Mode Manager
 * Toggle between Performance Mode (text-only, minimal) and Visual Mode (full features)
 */

class PerformanceModeManager {
    constructor() {
        this.mode = this.loadMode();
        this.cssVariables = {};
        this.init();
    }

    init() {
        this.applyMode();
        this.setupToggle();
    }

    loadMode() {
        return localStorage.getItem('performanceMode') || 'visual';
    }

    saveMode(mode) {
        localStorage.setItem('performanceMode', mode);
        this.mode = mode;
    }

    isPerformanceMode() {
        return this.mode === 'performance';
    }

    toggle() {
        const newMode = this.mode === 'performance' ? 'visual' : 'performance';
        this.saveMode(newMode);
        this.applyMode();
        return newMode;
    }

    applyMode() {
        const root = document.documentElement;
        const body = document.body;

        if (this.mode === 'performance') {
            // Performance Mode - Minimal styling
            body.classList.add('performance-mode');
            body.classList.remove('visual-mode');

            // Disable animations
            root.style.setProperty('--transition-speed', '0s');
            root.style.setProperty('--animation-duration', '0s');

            // Disable shadows and gradients
            root.style.setProperty('--shadow', 'none');
            root.style.setProperty('--accent-gradient', 'var(--accent)');

            // Reduce image quality
            document.querySelectorAll('img').forEach(img => {
                if (!img.dataset.originalSrc) {
                    img.dataset.originalSrc = img.src;
                }
                // Could switch to low-res thumbnails
            });

            // Disable WASM animations if present
            if (window.wasmAnimations) {
                window.wasmAnimations.disable();
            }

            // Show performance indicator
            this.showModeIndicator('Performance Mode');

        } else {
            // Visual Mode - Full features
            body.classList.add('visual-mode');
            body.classList.remove('performance-mode');

            // Restore animations
            root.style.setProperty('--transition-speed', '0.2s');
            root.style.setProperty('--animation-duration', '0.3s');

            // Restore shadows and gradients
            root.style.setProperty('--shadow', '0 4px 20px rgba(0, 0, 0, 0.5)');
            root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #bb86fc, #7c4dff)');

            // Restore original images
            document.querySelectorAll('img[data-original-src]').forEach(img => {
                img.src = img.dataset.originalSrc;
            });

            // Enable WASM animations if present
            if (window.wasmAnimations) {
                window.wasmAnimations.enable();
            }

            this.showModeIndicator('Visual Mode');
        }

        // Notify other components
        window.dispatchEvent(new CustomEvent('performanceModeChange', {
            detail: { mode: this.mode }
        }));
    }

    setupToggle() {
        // Create toggle button if not exists
        let toggle = document.getElementById('performance-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.id = 'performance-toggle';
            toggle.className = 'performance-toggle-btn';
            toggle.setAttribute('aria-label', 'Toggle Performance Mode');
            toggle.title = 'Toggle Performance Mode';
            
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(toggle, headerActions.firstChild);
            }
        }

        toggle.innerHTML = this.mode === 'performance' ? '⚡' : '✨';
        toggle.addEventListener('click', () => {
            const newMode = this.toggle();
            toggle.innerHTML = newMode === 'performance' ? '⚡' : '✨';
        });
    }

    showModeIndicator(text) {
        let indicator = document.getElementById('mode-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'mode-indicator';
            indicator.className = 'mode-indicator';
            document.body.appendChild(indicator);
        }

        indicator.textContent = text;
        indicator.classList.add('visible');

        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2000);
    }

    /**
     * Get optimized settings for current mode
     */
    getSettings() {
        if (this.mode === 'performance') {
            return {
                lazyLoadThreshold: 100,
                virtualScrollBuffer: 2,
                imageQuality: 'low',
                enableAnimations: false,
                enableShadows: false,
                enableGradients: false,
                maxVisibleBooks: 50,
                debounceDelay: 100
            };
        } else {
            return {
                lazyLoadThreshold: 50,
                virtualScrollBuffer: 3,
                imageQuality: 'high',
                enableAnimations: true,
                enableShadows: true,
                enableGradients: true,
                maxVisibleBooks: 200,
                debounceDelay: 50
            };
        }
    }

    /**
     * Check if device is low-end
     */
    static detectLowEndDevice() {
        // Check various indicators of a low-end device
        const indicators = {
            lowMemory: navigator.deviceMemory && navigator.deviceMemory < 4,
            slowConnection: navigator.connection && 
                           (navigator.connection.effectiveType === 'slow-2g' || 
                            navigator.connection.effectiveType === '2g'),
            lowCores: navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2,
            saveData: navigator.connection && navigator.connection.saveData
        };

        return indicators.lowMemory || indicators.slowConnection || 
               indicators.lowCores || indicators.saveData;
    }

    /**
     * Auto-detect and suggest performance mode
     */
    autoDetect() {
        if (PerformanceModeManager.detectLowEndDevice()) {
            if (this.mode !== 'performance') {
                this.showSuggestion();
            }
        }
    }

    showSuggestion() {
        const suggestion = document.createElement('div');
        suggestion.className = 'performance-suggestion';
        suggestion.innerHTML = `
            <p>We detected a slower device. Enable Performance Mode for better experience?</p>
            <div class="suggestion-actions">
                <button id="enable-perf-mode">Enable</button>
                <button id="dismiss-suggestion">Dismiss</button>
            </div>
        `;
        document.body.appendChild(suggestion);

        document.getElementById('enable-perf-mode').addEventListener('click', () => {
            this.saveMode('performance');
            this.applyMode();
            suggestion.remove();
        });

        document.getElementById('dismiss-suggestion').addEventListener('click', () => {
            suggestion.remove();
            localStorage.setItem('perfSuggestionDismissed', 'true');
        });
    }
}

// Initialize performance mode manager
const performanceMode = new PerformanceModeManager();
window.performanceMode = performanceMode;

// Auto-detect on first load
if (!localStorage.getItem('perfSuggestionDismissed')) {
    setTimeout(() => performanceMode.autoDetect(), 2000);
}
