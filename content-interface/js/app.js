/**
 * Content Creator Application
 * Main application logic and UI management
 */
class ContentCreator {
    constructor() {
        this.currentType = 'blog';
        this.currentDraft = null;
        this.autoSaver = null;
        this.settings = StorageManager.getSettings();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDrafts();
        this.loadSettings();
        this.setupAutoSave();
        this.loadTagSuggestions();
        this.checkDirectorySupport();
        this.showToast('Content Creator loaded! Start writing your content.', 'success');
    }

    bindEvents() {
        // Content type switching
        document.getElementById('blog-btn').addEventListener('click', () => {
            this.switchContentType('blog');
        });
        
        document.getElementById('thought-btn').addEventListener('click', () => {
            this.switchContentType('thought');
        });

        // Real-time content updates
        const contentTextarea = document.getElementById('content');
        contentTextarea.addEventListener('input', () => {
            this.updatePreview();
            this.updateStats();
            this.updateFileInfo();
            if (this.autoSaver) {
                this.autoSaver.trigger();
            }
        });

        // Other form inputs
        document.getElementById('title').addEventListener('input', () => {
            this.updateFileInfo();
            if (this.autoSaver) {
                this.autoSaver.trigger();
            }
        });

        document.getElementById('tags').addEventListener('input', (e) => {
            this.handleTagInput(e);
            if (this.autoSaver) {
                this.autoSaver.trigger();
            }
        });

        // Action buttons
        document.getElementById('save-content').addEventListener('click', () => this.saveContent());
        document.getElementById('save-and-open').addEventListener('click', () => this.saveAndOpenFolder());
        document.getElementById('copy-content').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('clear-form').addEventListener('click', () => this.clearForm());
        
        // File actions
        document.getElementById('open-folder').addEventListener('click', () => this.openFolder());
        document.getElementById('copy-path').addEventListener('click', () => this.copyPath());
        
        // Publish status toggle
        document.getElementById('is-published').addEventListener('change', () => {
            this.updateFileInfo();
        });

        // Preview toggle
        document.getElementById('toggle-preview').addEventListener('click', () => this.togglePreview());

        // Content browser
        document.getElementById('refresh-content').addEventListener('click', () => this.refreshContent());
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // File upload
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('file-upload').click();
        });
        
        document.getElementById('file-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // Settings
        document.getElementById('auto-save').addEventListener('change', (e) => {
            this.updateSetting('autoSave', e.target.checked);
        });
        
        document.getElementById('dark-mode').addEventListener('change', (e) => {
            this.updateSetting('darkMode', e.target.checked);
            this.applyTheme();
        });
        
        // Directory management
        document.getElementById('change-directory').addEventListener('click', () => {
            this.changeDirectory();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    switchContentType(type) {
        this.currentType = type;
        
        // Update active button
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${type}-btn`).classList.add('active');
        
        // Update form UI
        this.updateFormForType();
        this.updateStats();
        this.updateFileInfo();
    }

    updateFormForType() {
        const titleInput = document.getElementById('title');
        const contentTextarea = document.getElementById('content');
        const charLimit = document.getElementById('char-limit');
        
        if (this.currentType === 'thought') {
            titleInput.placeholder = 'Title (optional for thoughts)';
            contentTextarea.placeholder = 'Share your thought... (max 280 characters)';
            charLimit.textContent = '/ 280';
            charLimit.style.display = 'inline';
        } else {
            titleInput.placeholder = 'Enter your blog post title...';
            contentTextarea.placeholder = 'Write your blog post content using Markdown...';
            charLimit.style.display = 'none';
        }
    }

    updatePreview() {
        const content = document.getElementById('content').value;
        const preview = document.getElementById('preview');
        preview.innerHTML = MarkdownRenderer.render(content);
    }

    updateStats() {
        const content = document.getElementById('content').value;
        const charCount = content.length;
        const words = MarkdownRenderer.extractWords(content);
        const wordCount = words.length;
        const readingTime = MarkdownRenderer.calculateReadingTime(content);

        document.getElementById('char-counter').textContent = charCount;
        document.getElementById('word-counter').textContent = wordCount;
        document.getElementById('reading-time').textContent = readingTime;

        // Handle character limit for thoughts
        const charLimit = document.getElementById('char-limit');
        if (this.currentType === 'thought') {
            if (charCount > 280) {
                charLimit.style.color = 'var(--error)';
                document.getElementById('char-counter').style.color = 'var(--error)';
            } else {
                charLimit.style.color = 'var(--text-secondary)';
                document.getElementById('char-counter').style.color = 'var(--text-secondary)';
            }
        }
    }

    updateFileInfo() {
        const data = this.gatherFormData();
        const isPublished = document.getElementById('is-published').checked;
        
        if (data.content.trim() === '') {
            document.getElementById('filename').textContent = 'No content';
            document.getElementById('file-location').textContent = 'Start writing to see file details';
            return;
        }

        try {
            const file = FileGenerator.generate(data, this.currentType, isPublished);
            document.getElementById('filename').textContent = file.name;
            document.getElementById('file-location').textContent = file.path;
            
            // Store the current file info for actions
            this.currentFileInfo = file;
        } catch (error) {
            console.error('Error updating file info:', error);
            document.getElementById('filename').textContent = 'Error generating filename';
            document.getElementById('file-location').textContent = 'Please check your content';
        }
    }

    handleTagInput(e) {
        const input = e.target;
        const value = input.value;
        
        // Show tag suggestions
        if (value.length > 0) {
            const lastTag = value.split(',').pop().trim();
            if (lastTag.length > 0) {
                this.showTagSuggestions(lastTag);
            } else {
                this.hideTagSuggestions();
            }
        } else {
            this.hideTagSuggestions();
        }
    }

    showTagSuggestions(query) {
        const suggestions = StorageManager.searchTags(query);
        const container = document.getElementById('tag-suggestions');
        
        if (suggestions.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = suggestions
            .map(tag => `<span class="tag-suggestion" data-tag="${tag.name}">${tag.name} (${tag.count})</span>`)
            .join('');

        // Add click handlers
        container.querySelectorAll('.tag-suggestion').forEach(span => {
            span.addEventListener('click', () => {
                this.addTagSuggestion(span.dataset.tag);
            });
        });
    }

    hideTagSuggestions() {
        document.getElementById('tag-suggestions').innerHTML = '';
    }

    addTagSuggestion(tagName) {
        const input = document.getElementById('tags');
        const currentTags = input.value.split(',').map(t => t.trim()).filter(t => t);
        const lastTag = input.value.split(',').pop().trim();
        
        if (lastTag) {
            // Replace the last partial tag
            currentTags[currentTags.length - 1] = tagName;
        } else {
            currentTags.push(tagName);
        }
        
        input.value = currentTags.join(', ');
        this.hideTagSuggestions();
    }

    loadTagSuggestions() {
        const popularTags = StorageManager.getPopularTags(5);
        const container = document.getElementById('tag-suggestions');
        
        if (popularTags.length > 0) {
            container.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Popular tags:</div>' +
                popularTags.map(tag => `<span class="tag-suggestion" data-tag="${tag.name}">${tag.name}</span>`).join('');
            
            container.querySelectorAll('.tag-suggestion').forEach(span => {
                span.addEventListener('click', () => {
                    this.addTagSuggestion(span.dataset.tag);
                });
            });
        }
    }

    saveDraft() {
        const data = this.gatherFormData();
        
        if (!data.content.trim()) {
            this.showToast('Cannot save empty draft', 'error');
            return;
        }

        const validation = FileGenerator.validateContent(data);
        if (!validation.isValid) {
            this.showToast('Validation errors: ' + validation.errors.join(', '), 'error');
            return;
        }

        if (this.currentDraft) {
            data.id = this.currentDraft.id;
        }

        const savedDraft = StorageManager.saveDraft(data);
        if (savedDraft) {
            this.currentDraft = savedDraft;
            this.loadDrafts();
            this.showToast('Draft saved successfully!', 'success');
        } else {
            this.showToast('Failed to save draft', 'error');
        }
    }

    async saveContent() {
        const data = this.gatherFormData();
        const isPublished = document.getElementById('is-published').checked;
        
        const validation = FileGenerator.validateContent(data);
        if (!validation.isValid) {
            this.showToast('Validation errors: ' + validation.errors.join(', '), 'error');
            return;
        }

        try {
            const file = FileGenerator.generate(data, this.currentType, isPublished);
            const result = await FileGenerator.saveFile(file);
            
            if (result.success) {
                if (result.needsManualMove) {
                    this.showToast(`Downloaded "${file.name}". Please move it to: ${file.path}`, 'success');
                    this.showFileInstructions(file);
                } else if (result.savedDirectly) {
                    this.showToast(`✅ File saved directly to: ${file.path}`, 'success');
                    // Show a quick tip about the directory selection being remembered
                    if (!localStorage.getItem('directory-tip-shown')) {
                        setTimeout(() => {
                            this.showToast('💡 Tip: Browser will remember this folder for future saves!', 'success');
                            localStorage.setItem('directory-tip-shown', 'true');
                        }, 2000);
                    }
                } else {
                    this.showToast(`File saved to: ${file.path}`, 'success');
                }
            } else {
                this.showToast(result.message, 'error');
            }
            
            // Update file info display
            this.updateFileInfo();
        } catch (error) {
            console.error('Error saving file:', error);
            this.showToast('Error saving file: ' + error.message, 'error');
        }
    }

    async saveAndOpenFolder() {
        const data = this.gatherFormData();
        const isPublished = document.getElementById('is-published').checked;
        
        const validation = FileGenerator.validateContent(data);
        if (!validation.isValid) {
            this.showToast('Validation errors: ' + validation.errors.join(', '), 'error');
            return;
        }

        try {
            const file = FileGenerator.generate(data, this.currentType, isPublished);
            const result = await FileGenerator.saveFile(file);
            
            if (result.success) {
                if (result.needsManualMove) {
                    this.showToast(`Downloaded "${file.name}". Opening folder instructions...`, 'success');
                    this.showFileInstructions(file);
                    // Try to open the target directory
                    this.openTargetDirectory(file);
                } else {
                    this.showToast(`File saved directly to: ${file.path}`, 'success');
                }
            } else {
                this.showToast(result.message, 'error');
            }
            
            this.updateFileInfo();
        } catch (error) {
            console.error('Error saving file:', error);
            this.showToast('Error saving file: ' + error.message, 'error');
        }
    }

    showFileInstructions(file) {
        // Show a more detailed instruction modal/popup
        const instructions = `
📁 File Location Instructions:

1. Your file "${file.name}" has been downloaded to Downloads folder
2. You need to move it to: ${file.path}

🔧 Steps:
• Open Finder
• Navigate to: /Users/emilycogsdill/Documents/GitHub/baba-is-win/
• Go to: ${file.path.substring(0, file.path.lastIndexOf('/'))}
• Move "${file.name}" from Downloads to this folder

💡 Tip: Use "📋 Copy Path" button to copy the exact folder path!
        `;
        
        // For now, use an alert (could be replaced with a better modal)
        alert(instructions.trim());
    }

    openTargetDirectory(file) {
        // Try to open the directory using file:// URL (may not work in all browsers)
        const folderPath = file.fullPath.substring(0, file.fullPath.lastIndexOf('/'));
        const fileUrl = `file://${folderPath}`;
        
        // Copy folder path to clipboard as a fallback
        FileGenerator.copyToClipboard(folderPath).then(success => {
            if (success) {
                this.showToast('Target folder path copied to clipboard!', 'success');
            }
        });
    }

    async copyToClipboard() {
        const data = this.gatherFormData();
        const isPublished = document.getElementById('is-published').checked;
        
        const validation = FileGenerator.validateContent(data);
        if (!validation.isValid) {
            this.showToast('Validation errors: ' + validation.errors.join(', '), 'error');
            return;
        }

        try {
            const file = FileGenerator.generate(data, this.currentType, isPublished);
            const success = await FileGenerator.copyToClipboard(file.content);
            
            if (success) {
                this.showToast('Content copied to clipboard!', 'success');
            } else {
                this.showToast('Failed to copy to clipboard', 'error');
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showToast('Error copying to clipboard: ' + error.message, 'error');
        }
    }
    
    openFolder() {
        if (this.currentFileInfo) {
            const folderPath = this.currentFileInfo.fullPath.substring(0, this.currentFileInfo.fullPath.lastIndexOf('/'));
            this.showToast(`Folder path: ${folderPath}\n\nNote: Cannot auto-open folders from browser. Please navigate manually.`, 'success');
        }
    }
    
    async copyPath() {
        if (this.currentFileInfo) {
            const success = await FileGenerator.copyToClipboard(this.currentFileInfo.fullPath);
            if (success) {
                this.showToast('File path copied to clipboard!', 'success');
            } else {
                this.showToast('Failed to copy path', 'error');
            }
        }
    }

    clearForm() {
        if (confirm('Are you sure you want to clear the form? Unsaved changes will be lost.')) {
            document.getElementById('title').value = '';
            document.getElementById('content').value = '';
            document.getElementById('tags').value = '';
            this.currentDraft = null;
            this.updatePreview();
            this.updateStats();
            this.updateFileInfo();
            this.hideTagSuggestions();
            this.showToast('Form cleared', 'success');
        }
    }

    togglePreview() {
        const panel = document.querySelector('.preview-panel');
        const button = document.getElementById('toggle-preview');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
            button.textContent = 'Hide';
        } else {
            panel.style.display = 'none';
            button.textContent = 'Show';
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load content for the active tab
        if (tabName === 'drafts') {
            this.loadDrafts();
        } else if (tabName === 'published') {
            this.loadPublished();
        }
    }
    
    loadDrafts() {
        const drafts = StorageManager.getDrafts();
        const container = document.getElementById('drafts-list');
        
        if (drafts.length === 0) {
            container.innerHTML = '<li class="no-content">No drafts found</li>';
            return;
        }

        container.innerHTML = drafts.map(draft => {
            const preview = MarkdownRenderer.stripMarkdown(draft.content).substring(0, 40) + '...';
            const title = draft.title || preview;
            
            return `
                <li class="content-item" data-draft-id="${draft.id}">
                    <div class="content-item-title">${title}</div>
                    <div class="content-item-meta">
                        <span>${draft.type} • ${draft.updatedAtFormatted || 'Unknown date'}</span>
                    </div>
                    <div class="content-item-actions">
                        <button class="btn btn-ghost btn-sm load-draft">✏️ Edit</button>
                        <button class="btn btn-ghost btn-sm delete-draft" style="color: var(--error);">🗑️ Delete</button>
                    </div>
                </li>
            `;
        }).join('');

        // Add event listeners for draft actions
        container.querySelectorAll('.load-draft').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const draftId = e.target.closest('.content-item').dataset.draftId;
                this.loadDraft(draftId);
            });
        });

        container.querySelectorAll('.delete-draft').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const draftId = e.target.closest('.content-item').dataset.draftId;
                this.deleteDraft(draftId);
            });
        });
    }
    
    loadPublished() {
        // Since we can't directly read the file system, show instructions
        const container = document.getElementById('published-list');
        container.innerHTML = `
            <li class="no-content">
                <p>Published content browser requires file system access.</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem;">
                    Check your published folders:<br>
                    • <code>src/data/blog-posts/published/</code><br>
                    • <code>src/data/thoughts/published/</code>
                </p>
            </li>
        `;
    }
    
    refreshContent() {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        if (activeTab === 'drafts') {
            this.loadDrafts();
        } else {
            this.loadPublished();
        }
        this.showToast('Content refreshed', 'success');
    }

    loadDraft(draftId) {
        const draft = StorageManager.getDraft(draftId);
        if (!draft) {
            this.showToast('Draft not found', 'error');
            return;
        }

        document.getElementById('title').value = draft.title || '';
        document.getElementById('content').value = draft.content || '';
        document.getElementById('tags').value = (draft.tags || []).join(', ');
        
        this.currentDraft = draft;
        this.switchContentType(draft.type || 'blog');
        this.updatePreview();
        this.updateStats();
        this.updateFileInfo();
        
        this.showToast('Draft loaded', 'success');
    }

    deleteDraft(draftId) {
        if (confirm('Are you sure you want to delete this draft?')) {
            const success = StorageManager.deleteDraft(draftId);
            if (success) {
                this.loadDrafts();
                if (this.currentDraft && this.currentDraft.id === draftId) {
                    this.currentDraft = null;
                }
                this.showToast('Draft deleted', 'success');
            } else {
                this.showToast('Failed to delete draft', 'error');
            }
        }
    }

    clearAllDrafts() {
        if (confirm('Are you sure you want to delete all drafts? This cannot be undone.')) {
            const success = StorageManager.clearAllDrafts();
            if (success) {
                this.loadDrafts();
                this.currentDraft = null;
                this.showToast('All drafts cleared', 'success');
            } else {
                this.showToast('Failed to clear drafts', 'error');
            }
        }
    }

    exportDrafts() {
        const drafts = StorageManager.getDrafts();
        if (drafts.length === 0) {
            this.showToast('No drafts to export', 'error');
            return;
        }

        const files = FileGenerator.generateBatch(drafts)
            .filter(result => result.success)
            .map(result => result.file);

        if (files.length > 0) {
            FileGenerator.downloadMultipleFiles(files);
            this.showToast(`Exported ${files.length} drafts`, 'success');
        } else {
            this.showToast('No valid drafts to export', 'error');
        }
    }

    handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    const parsed = FileGenerator.parseMarkdownFile(content, file.name);
                    
                    if (parsed) {
                        // Save as draft
                        const draft = StorageManager.saveDraft(parsed);
                        if (draft) {
                            this.loadDrafts();
                            this.showToast(`Imported "${file.name}"`, 'success');
                        }
                    } else {
                        this.showToast(`Failed to parse "${file.name}"`, 'error');
                    }
                };
                reader.readAsText(file);
            } else {
                this.showToast(`Unsupported file type: ${file.name}`, 'error');
            }
        });

        // Clear the input
        event.target.value = '';
    }

    loadSettings() {
        const settings = StorageManager.getSettings();
        document.getElementById('auto-save').checked = settings.autoSave;
        document.getElementById('dark-mode').checked = settings.darkMode;
        this.applyTheme();
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        StorageManager.saveSettings({ [key]: value });
        
        if (key === 'autoSave') {
            this.setupAutoSave();
        }
    }

    applyTheme() {
        if (this.settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    setupAutoSave() {
        if (this.autoSaver) {
            this.autoSaver.cancel();
        }

        if (this.settings.autoSave) {
            this.autoSaver = StorageManager.createAutoSaver(() => {
                const data = this.gatherFormData();
                if (data.content.trim()) {
                    if (this.currentDraft) {
                        data.id = this.currentDraft.id;
                    }
                    const savedDraft = StorageManager.saveDraft(data);
                    if (savedDraft) {
                        this.currentDraft = savedDraft;
                        // Optionally show a subtle indicator that auto-save occurred
                    }
                }
            });
        }
    }

    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.saveDraft();
                    break;
                case 'Enter':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.generateFile();
                    }
                    break;
                case '/':
                    event.preventDefault();
                    this.togglePreview();
                    break;
                case 'k':
                    event.preventDefault();
                    document.getElementById('content').focus();
                    break;
            }
        }
    }

    gatherFormData() {
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value;
        const tagsInput = document.getElementById('tags').value;
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

        return {
            title: title,
            content: content,
            tags: tags,
            type: this.currentType,
            timestamp: Date.now()
        };
    }

    checkDirectorySupport() {
        if (DirectoryHelper.isFileSystemAccessSupported()) {
            document.getElementById('directory-tools').style.display = 'block';
            this.updateDirectoryDisplay();
        }
    }
    
    async updateDirectoryDisplay() {
        const currentDir = document.getElementById('current-directory');
        try {
            const dirHandle = await DirectoryHelper.getStoredDirectoryHandle();
            if (dirHandle) {
                currentDir.innerHTML = `<small>Current: ${dirHandle.name || 'Blog directory selected'}</small>`;
            } else {
                currentDir.innerHTML = `<small>No directory selected</small>`;
            }
        } catch (error) {
            currentDir.innerHTML = `<small>No directory selected</small>`;
        }
    }
    
    async changeDirectory() {
        try {
            await DirectoryHelper.clearStoredDirectory();
            const newHandle = await DirectoryHelper.promptForBlogDirectory();
            if (newHandle) {
                this.showToast('Blog directory updated!', 'success');
                this.updateDirectoryDisplay();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showToast('Error changing directory: ' + error.message, 'error');
            }
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentCreator = new ContentCreator();
});