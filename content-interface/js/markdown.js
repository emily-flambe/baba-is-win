/**
 * Simple Markdown Renderer
 * A lightweight markdown parser for the preview functionality
 */
class MarkdownRenderer {
    static render(markdown) {
        if (!markdown || markdown.trim() === '') {
            return '<p class="preview-placeholder">Start typing to see preview...</p>';
        }

        let html = markdown;

        // Escape HTML first
        html = this.escapeHtml(html);

        // Headers (must be before other rules)
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold and Italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code blocks (before inline code)
        html = html.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const className = lang ? `language-${lang}` : '';
            return `<pre class="${className}"><code>${code.trim()}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Images
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

        // Blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote><p>$1</p></blockquote>');

        // Horizontal rules
        html = html.replace(/^---$/gim, '<hr>');

        // Lists (unordered)
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Lists (ordered)
        html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
        // Note: This is a simplified approach and might not handle complex nested lists

        // Line breaks and paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        // Wrap in paragraphs if no block elements
        if (!html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>') && 
            !html.includes('<ul>') && !html.includes('<ol>') && !html.includes('<blockquote>') &&
            !html.includes('<pre>')) {
            html = `<p>${html}</p>`;
        }

        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>\s*<\/p>/g, '');

        return html;
    }

    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    static extractWords(markdown) {
        // Remove markdown syntax and count words
        const plainText = markdown
            .replace(/[#*`_\[\]()]/g, '')
            .replace(/\n/g, ' ')
            .trim();
        
        return plainText.split(/\s+/).filter(word => word.length > 0);
    }

    static calculateReadingTime(markdown) {
        const words = this.extractWords(markdown);
        const wordsPerMinute = 200; // Average reading speed
        return Math.ceil(words.length / wordsPerMinute);
    }

    static extractImages(markdown) {
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const images = [];
        let match;

        while ((match = imageRegex.exec(markdown)) !== null) {
            images.push({
                alt: match[1],
                src: match[2]
            });
        }

        return images;
    }

    static extractLinks(markdown) {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = [];
        let match;

        while ((match = linkRegex.exec(markdown)) !== null) {
            links.push({
                text: match[1],
                url: match[2]
            });
        }

        return links;
    }

    static generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .slice(0, 50) // Limit length
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }

    static stripMarkdown(markdown) {
        return markdown
            .replace(/[#*`_\[\]()]/g, '')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
            .replace(/\n/g, ' ')
            .trim();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownRenderer;
}