/**
 * File Generator
 * Creates properly formatted markdown files for the blog system
 */
class FileGenerator {
    static generate(data, type) {
        const slug = this.generateSlug(data.title || data.content.substring(0, 50));
        const date = new Date();
        const dateString = this.formatDate(date);
        const filename = `${dateString}-${slug}.md`;
        
        let frontmatter;
        let targetPath;
        
        if (type === 'blog') {
            frontmatter = this.generateBlogFrontmatter(data, dateString, slug);
            targetPath = 'src/data/blog-posts/published/';
        } else {
            frontmatter = this.generateThoughtFrontmatter(data, dateString, slug);
            targetPath = 'src/data/thoughts/published/';
        }
        
        const content = `${frontmatter}\n\n${data.content.trim()}`;
        
        return { 
            name: filename, 
            content: content,
            path: targetPath + filename,
            slug: slug,
            type: type
        };
    }

    static generateSlug(text) {
        if (!text) return 'untitled';
        
        return text
            .toLowerCase()
            .trim()
            // Remove special characters except spaces and hyphens
            .replace(/[^a-z0-9\s-]/g, '')
            // Replace multiple spaces with single space
            .replace(/\s+/g, ' ')
            // Replace spaces with hyphens
            .replace(/\s/g, '-')
            // Replace multiple hyphens with single hyphen
            .replace(/-+/g, '-')
            // Remove leading/trailing hyphens
            .replace(/^-|-$/g, '')
            // Limit length
            .slice(0, 50)
            // Ensure it doesn't end with hyphen after truncation
            .replace(/-$/, '');
    }

    static formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    static generateBlogFrontmatter(data, dateString, slug) {
        const title = data.title || 'Untitled';
        const tags = this.formatTags(data.tags || []);
        
        return `---
title: "${this.escapeYaml(title)}"
date: ${dateString}
slug: ${slug}
tags: [${tags}]
---`;
    }

    static generateThoughtFrontmatter(data, dateString, slug) {
        const tags = this.formatTags(data.tags || []);
        
        let frontmatter = `---
date: ${dateString}
slug: ${slug}`;

        if (tags) {
            frontmatter += `\ntags: [${tags}]`;
        }

        frontmatter += '\n---';
        
        return frontmatter;
    }

    static formatTags(tags) {
        if (!tags || tags.length === 0) return '';
        
        return tags
            .filter(tag => tag && tag.trim())
            .map(tag => `"${this.escapeYaml(tag.trim())}"`)
            .join(', ');
    }

    static escapeYaml(str) {
        if (!str) return '';
        // Escape quotes in YAML values
        return str.replace(/"/g, '\\"');
    }

    // Batch generation for multiple drafts
    static generateBatch(drafts) {
        const results = [];
        
        drafts.forEach(draft => {
            try {
                const file = this.generate(draft, draft.type || 'blog');
                results.push({
                    success: true,
                    draft: draft,
                    file: file
                });
            } catch (error) {
                results.push({
                    success: false,
                    draft: draft,
                    error: error.message
                });
            }
        });
        
        return results;
    }

    // Create a ZIP file content for multiple files
    static async createZipContent(files) {
        // Simple ZIP creation - in a real implementation you'd use a ZIP library
        // For now, we'll create a simple archive format
        const archive = {
            files: files,
            createdAt: new Date().toISOString(),
            totalFiles: files.length
        };
        
        return JSON.stringify(archive, null, 2);
    }

    // Download utilities
    static downloadFile(filename, content, mimeType = 'text/markdown') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    static async downloadMultipleFiles(files) {
        // For multiple files, we'll create a simple text archive
        let archiveContent = `# Content Creator Export
Generated: ${new Date().toLocaleString()}
Total Files: ${files.length}

---

`;

        files.forEach((file, index) => {
            archiveContent += `## File ${index + 1}: ${file.name}
Path: ${file.path}
Type: ${file.type}

\`\`\`markdown
${file.content}
\`\`\`

---

`;
        });

        this.downloadFile('content-export.md', archiveContent, 'text/markdown');
    }

    // Copy to clipboard utilities
    static async copyToClipboard(content) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = content;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result;
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    }

    // Validation utilities
    static validateContent(data) {
        const errors = [];
        
        if (!data.content || data.content.trim() === '') {
            errors.push('Content cannot be empty');
        }
        
        if (data.type === 'thought' && data.content.length > 280) {
            errors.push('Thoughts must be 280 characters or less');
        }
        
        if (data.title && data.title.length > 200) {
            errors.push('Title must be 200 characters or less');
        }
        
        if (data.tags && data.tags.length > 10) {
            errors.push('Maximum 10 tags allowed');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Generate preview info
    static generateFileInfo(data, type) {
        const file = this.generate(data, type);
        const wordCount = MarkdownRenderer.extractWords(data.content).length;
        const readingTime = MarkdownRenderer.calculateReadingTime(data.content);
        const images = MarkdownRenderer.extractImages(data.content);
        const links = MarkdownRenderer.extractLinks(data.content);
        
        return {
            filename: file.name,
            path: file.path,
            type: file.type,
            slug: file.slug,
            wordCount: wordCount,
            readingTime: readingTime,
            characterCount: data.content.length,
            imageCount: images.length,
            linkCount: links.length,
            tags: data.tags || [],
            estimatedSize: new Blob([file.content]).size
        };
    }

    // Import existing files
    static parseMarkdownFile(content, filename) {
        try {
            const lines = content.split('\n');
            let frontmatterEnd = -1;
            let frontmatterStart = -1;
            
            // Find frontmatter boundaries
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    if (frontmatterStart === -1) {
                        frontmatterStart = i;
                    } else {
                        frontmatterEnd = i;
                        break;
                    }
                }
            }
            
            let frontmatter = {};
            let content_text = content;
            
            if (frontmatterStart !== -1 && frontmatterEnd !== -1) {
                const frontmatterText = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
                content_text = lines.slice(frontmatterEnd + 1).join('\n').trim();
                
                // Simple YAML parsing (for basic frontmatter)
                frontmatterText.split('\n').forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex !== -1) {
                        const key = line.substring(0, colonIndex).trim();
                        const value = line.substring(colonIndex + 1).trim();
                        
                        // Remove quotes if present
                        let cleanValue = value.replace(/^["']|["']$/g, '');
                        
                        // Parse arrays (simple)
                        if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
                            cleanValue = cleanValue.slice(1, -1)
                                .split(',')
                                .map(v => v.trim().replace(/^["']|["']$/g, ''));
                        }
                        
                        frontmatter[key] = cleanValue;
                    }
                });
            }
            
            // Determine type from filename or path
            let type = 'blog';
            if (filename.includes('thought') || filename.includes('thoughts')) {
                type = 'thought';
            }
            
            return {
                title: frontmatter.title || '',
                content: content_text,
                tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
                type: type,
                slug: frontmatter.slug || this.generateSlug(frontmatter.title || filename),
                date: frontmatter.date || this.formatDate(new Date()),
                filename: filename
            };
        } catch (error) {
            console.error('Error parsing markdown file:', error);
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileGenerator;
}