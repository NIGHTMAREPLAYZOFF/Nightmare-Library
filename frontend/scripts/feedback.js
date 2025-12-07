
/**
 * Visual Feedback System
 * Provides satisfying visual feedback for user actions
 */

class FeedbackSystem {
    constructor() {
        this.init();
    }

    init() {
        // Add global styles if not present
        if (!document.getElementById('feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'feedback-styles';
            style.textContent = `
                .success-ripple {
                    position: fixed;
                    border-radius: 50%;
                    background: var(--accent-primary);
                    opacity: 0.6;
                    pointer-events: none;
                    z-index: 9999;
                    animation: ripple 0.6s ease-out forwards;
                }
                
                @keyframes ripple {
                    from {
                        transform: scale(0);
                        opacity: 0.6;
                    }
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                
                .confetti-particle {
                    position: fixed;
                    width: 8px;
                    height: 8px;
                    pointer-events: none;
                    z-index: 9999;
                }
            `;
            document.head.appendChild(style);
        }
    }

    showRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'success-ripple';
        ripple.style.left = (x - 50) + 'px';
        ripple.style.top = (y - 50) + 'px';
        ripple.style.width = '100px';
        ripple.style.height = '100px';
        
        document.body.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    celebrateAchievement(x, y) {
        const colors = ['#bb86fc', '#03dac6', '#cf6679', '#ffb74d'];
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 100 + Math.random() * 100;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity - 100;
            
            document.body.appendChild(particle);
            
            let currentX = x;
            let currentY = y;
            let currentVY = vy;
            const gravity = 5;
            
            const animate = () => {
                currentX += vx / 60;
                currentY += currentVY / 60;
                currentVY += gravity;
                
                particle.style.left = currentX + 'px';
                particle.style.top = currentY + 'px';
                particle.style.opacity = Math.max(0, 1 - currentY / window.innerHeight);
                
                if (currentY < window.innerHeight) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--accent-primary);
            color: var(--bg-primary);
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(187, 134, 252, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = '✓ ' + message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

window.feedbackSystem = new FeedbackSystem();
export default FeedbackSystem;
