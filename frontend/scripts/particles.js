
/**
 * Particle Background System
 * Creates ambient animated particles for visual polish
 */

class ParticleSystem {
    constructor(container = document.body) {
        this.container = container;
        this.particles = [];
        this.particleCount = 30;
        this.init();
    }

    init() {
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'particles-background';
        particleContainer.setAttribute('aria-hidden', 'true');
        
        // Generate particles
        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.createParticle();
            particleContainer.appendChild(particle);
            this.particles.push(particle);
        }

        this.container.insertBefore(particleContainer, this.container.firstChild);
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random positioning
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        // Random delay
        particle.style.animationDelay = Math.random() * 6 + 's';
        
        // Random size variation
        const size = 2 + Math.random() * 3;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        return particle;
    }

    destroy() {
        const container = this.container.querySelector('.particles-background');
        if (container) {
            container.remove();
        }
        this.particles = [];
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.particleSystem = new ParticleSystem();
    });
} else {
    window.particleSystem = new ParticleSystem();
}

export default ParticleSystem;
