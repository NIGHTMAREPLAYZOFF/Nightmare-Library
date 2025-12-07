
/**
 * Lightweight HTML Sanitizer
 * Sanitizes HTML to prevent XSS attacks
 */

class HTMLSanitizer {
    constructor() {
        this.allowedTags = new Set([
            'p', 'br', 'strong', 'em', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'
        ]);
        
        this.allowedAttributes = new Map([
            ['a', new Set(['href', 'title'])],
            ['img', new Set(['src', 'alt', 'title'])],
            ['*', new Set(['class', 'id'])]
        ]);
    }

    sanitize(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        
        const sanitized = this.sanitizeNode(template.content);
        
        const container = document.createElement('div');
        container.appendChild(sanitized);
        return container.innerHTML;
    }

    sanitizeNode(node) {
        const fragment = document.createDocumentFragment();
        
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                fragment.appendChild(child.cloneNode());
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                
                if (this.allowedTags.has(tagName)) {
                    const sanitizedElement = document.createElement(tagName);
                    
                    // Sanitize attributes
                    const allowedAttrs = this.allowedAttributes.get(tagName) || 
                                        this.allowedAttributes.get('*') || 
                                        new Set();
                    
                    for (const attr of child.attributes) {
                        if (allowedAttrs.has(attr.name)) {
                            // Extra validation for href/src
                            if (attr.name === 'href' || attr.name === 'src') {
                                const value = attr.value.toLowerCase();
                                if (value.startsWith('javascript:') || 
                                    value.startsWith('data:') || 
                                    value.startsWith('vbscript:')) {
                                    continue;
                                }
                            }
                            sanitizedElement.setAttribute(attr.name, attr.value);
                        }
                    }
                    
                    // Recursively sanitize children
                    const sanitizedChildren = this.sanitizeNode(child);
                    sanitizedElement.appendChild(sanitizedChildren);
                    fragment.appendChild(sanitizedElement);
                }
            }
        }
        
        return fragment;
    }
}

// Export singleton
window.htmlSanitizer = new HTMLSanitizer();
