
/**
 * Performance Monitor
 * Tracks and reports performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: 0,
            timeToInteractive: 0,
            renderTime: 0,
            apiCalls: []
        };
    }

    measurePageLoad() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            this.metrics.pageLoad = timing.loadEventEnd - timing.navigationStart;
            this.metrics.timeToInteractive = timing.domInteractive - timing.navigationStart;
        }
    }

    measureRender(label, callback) {
        const start = performance.now();
        const result = callback();
        const duration = performance.now() - start;
        
        this.metrics.renderTime = duration;
        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
        
        return result;
    }

    async measureAPI(label, apiCall) {
        const start = performance.now();
        try {
            const result = await apiCall();
            const duration = performance.now() - start;
            
            this.metrics.apiCalls.push({
                label,
                duration,
                timestamp: Date.now(),
                success: true
            });
            
            console.log(`[API] ${label}: ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.metrics.apiCalls.push({
                label,
                duration,
                timestamp: Date.now(),
                success: false,
                error: error.message
            });
            throw error;
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            avgApiTime: this.metrics.apiCalls.length > 0
                ? this.metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / this.metrics.apiCalls.length
                : 0
        };
    }

    logReport() {
        console.table(this.getMetrics());
    }
}

window.performanceMonitor = new PerformanceMonitor();

// Measure page load
window.addEventListener('load', () => {
    window.performanceMonitor.measurePageLoad();
});
