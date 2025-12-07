
/**
 * Canvas-based Cover Generator
 * Creates fallback covers for books without cover images
 */

class CoverGenerator {
    constructor() {
        this.gradients = [
            ['#667eea', '#764ba2'],
            ['#f093fb', '#f5576c'],
            ['#4facfe', '#00f2fe'],
            ['#43e97b', '#38f9d7'],
            ['#fa709a', '#fee140'],
            ['#30cfd0', '#330867'],
            ['#a8edea', '#fed6e3'],
            ['#ff9a9e', '#fecfef']
        ];
    }

    generateCover(title, author, width = 300, height = 450) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Select gradient based on title hash
        const gradientIndex = this.hashString(title) % this.gradients.length;
        const [color1, color2] = this.gradients[gradientIndex];

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add subtle pattern
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(
                Math.random() * width,
                Math.random() * height,
                Math.random() * 3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Add title
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Title font
        const fontSize = this.calculateFontSize(title, width);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.wrapText(ctx, title, width / 2, height * 0.4, width * 0.8, fontSize * 1.2);

        // Author font
        if (author) {
            ctx.font = `${fontSize * 0.6}px Arial, sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(author, width / 2, height * 0.7);
        }

        return canvas.toDataURL('image/png');
    }

    calculateFontSize(text, width) {
        const baseSize = 48;
        const maxSize = 60;
        const minSize = 24;
        
        if (text.length < 15) return maxSize;
        if (text.length > 50) return minSize;
        
        return baseSize;
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lines = [];

        for (let word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && line !== '') {
                lines.push(line);
                line = word + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, i) => {
            ctx.fillText(line.trim(), x, startY + (i * lineHeight));
        });
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}

window.coverGenerator = new CoverGenerator();
