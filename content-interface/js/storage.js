/**
 * Storage Manager
 * Handles localStorage operations for drafts, settings, and other data
 */
class StorageManager {
    static KEYS = {
        DRAFTS: 'content-creator-drafts',
        SETTINGS: 'content-creator-settings',
        TAGS: 'content-creator-tags'
    };

    static DEFAULT_SETTINGS = {
        autoSave: true,
        darkMode: false,
        autoSaveInterval: 5000, // 5 seconds
        maxDrafts: 50
    };

    // Settings Management
    static getSettings() {
        try {
            const settings = localStorage.getItem(this.KEYS.SETTINGS);
            return settings ? { ...this.DEFAULT_SETTINGS, ...JSON.parse(settings) } : this.DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.DEFAULT_SETTINGS;
        }
    }

    static saveSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const newSettings = { ...currentSettings, ...settings };
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(newSettings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    // Draft Management
    static getDrafts() {
        try {
            const drafts = localStorage.getItem(this.KEYS.DRAFTS);
            return drafts ? JSON.parse(drafts) : [];
        } catch (error) {
            console.error('Error loading drafts:', error);
            return [];
        }
    }

    static saveDraft(draft) {
        try {
            const drafts = this.getDrafts();
            const settings = this.getSettings();
            
            // Generate ID if not provided
            if (!draft.id) {
                draft.id = this.generateId();
            }

            // Update timestamp
            draft.updatedAt = Date.now();
            draft.updatedAtFormatted = new Date().toLocaleString();

            // Find existing draft or add new one
            const existingIndex = drafts.findIndex(d => d.id === draft.id);
            if (existingIndex !== -1) {
                drafts[existingIndex] = draft;
            } else {
                draft.createdAt = Date.now();
                draft.createdAtFormatted = new Date().toLocaleString();
                drafts.unshift(draft); // Add to beginning
            }

            // Limit number of drafts
            if (drafts.length > settings.maxDrafts) {
                drafts.splice(settings.maxDrafts);
            }

            localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify(drafts));
            
            // Update tags
            this.updateTagUsage(draft.tags || []);
            
            return draft;
        } catch (error) {
            console.error('Error saving draft:', error);
            return null;
        }
    }

    static deleteDraft(draftId) {
        try {
            const drafts = this.getDrafts();
            const filteredDrafts = drafts.filter(d => d.id !== draftId);
            localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify(filteredDrafts));
            return true;
        } catch (error) {
            console.error('Error deleting draft:', error);
            return false;
        }
    }

    static clearAllDrafts() {
        try {
            localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify([]));
            return true;
        } catch (error) {
            console.error('Error clearing drafts:', error);
            return false;
        }
    }

    static getDraft(draftId) {
        const drafts = this.getDrafts();
        return drafts.find(d => d.id === draftId) || null;
    }

    // Tag Management
    static getTags() {
        try {
            const tags = localStorage.getItem(this.KEYS.TAGS);
            return tags ? JSON.parse(tags) : [];
        } catch (error) {
            console.error('Error loading tags:', error);
            return [];
        }
    }

    static updateTagUsage(usedTags) {
        try {
            const tags = this.getTags();
            const tagMap = new Map(tags.map(tag => [tag.name, tag]));

            // Update usage for used tags
            usedTags.forEach(tagName => {
                if (tagName && tagName.trim()) {
                    const name = tagName.trim().toLowerCase();
                    if (tagMap.has(name)) {
                        tagMap.get(name).count++;
                        tagMap.get(name).lastUsed = Date.now();
                    } else {
                        tagMap.set(name, {
                            name: name,
                            count: 1,
                            lastUsed: Date.now()
                        });
                    }
                }
            });

            // Convert back to array and sort by usage
            const updatedTags = Array.from(tagMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 100); // Limit to 100 tags

            localStorage.setItem(this.KEYS.TAGS, JSON.stringify(updatedTags));
            return updatedTags;
        } catch (error) {
            console.error('Error updating tags:', error);
            return [];
        }
    }

    static getPopularTags(limit = 10) {
        const tags = this.getTags();
        return tags.slice(0, limit);
    }

    static searchTags(query) {
        const tags = this.getTags();
        return tags
            .filter(tag => tag.name.includes(query.toLowerCase()))
            .slice(0, 10);
    }

    // Utility Methods
    static generateId() {
        return 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    static exportAllData() {
        try {
            const data = {
                drafts: this.getDrafts(),
                settings: this.getSettings(),
                tags: this.getTags(),
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }

    static importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.drafts) {
                localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify(data.drafts));
            }
            
            if (data.settings) {
                localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));
            }
            
            if (data.tags) {
                localStorage.setItem(this.KEYS.TAGS, JSON.stringify(data.tags));
            }
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Auto-save functionality
    static createAutoSaver(callback, interval = null) {
        const settings = this.getSettings();
        const saveInterval = interval || settings.autoSaveInterval;
        
        let timeoutId = null;
        
        return {
            trigger: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                timeoutId = setTimeout(() => {
                    if (settings.autoSave) {
                        callback();
                    }
                }, saveInterval);
            },
            
            cancel: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            },
            
            immediate: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                callback();
            }
        };
    }

    // Storage quota and management
    static getStorageInfo() {
        try {
            const used = new Blob(Object.values(localStorage)).size;
            return {
                used: used,
                usedFormatted: this.formatBytes(used),
                available: 5 * 1024 * 1024, // Assume 5MB limit
                percentage: (used / (5 * 1024 * 1024)) * 100
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return null;
        }
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static cleanupOldDrafts(daysOld = 30) {
        try {
            const drafts = this.getDrafts();
            const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            const filteredDrafts = drafts.filter(draft => 
                (draft.updatedAt || draft.createdAt || 0) > cutoff
            );
            
            localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify(filteredDrafts));
            return drafts.length - filteredDrafts.length; // Return number of cleaned drafts
        } catch (error) {
            console.error('Error cleaning up drafts:', error);
            return 0;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}