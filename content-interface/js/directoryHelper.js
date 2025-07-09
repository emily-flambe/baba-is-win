/**
 * Directory Helper
 * Utilities for working with the File System Access API and directory management
 */
class DirectoryHelper {
    static BLOG_DIRECTORY_ID = 'baba-is-win-blog';
    
    /**
     * Check if File System Access API is supported
     */
    static isFileSystemAccessSupported() {
        return 'showDirectoryPicker' in window;
    }
    
    /**
     * Get or prompt for the blog directory handle
     */
    static async getBlogDirectoryHandle() {
        // For now, let's use the built-in browser persistence instead of IndexedDB
        // This should work more reliably with the File System Access API
        try {
            // Use the browser's built-in directory picker with a specific ID
            // The browser should remember this automatically
            const dirHandle = await window.showDirectoryPicker({
                id: this.BLOG_DIRECTORY_ID,
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            return dirHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error; // User cancelled
            }
            
            // If that fails, try without the ID
            console.warn('Directory picker with ID failed, trying without ID');
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });
            
            return dirHandle;
        }
    }
    
    /**
     * Prompt user to select the blog directory
     */
    static async promptForBlogDirectory() {
        const dirHandle = await window.showDirectoryPicker({
            id: this.BLOG_DIRECTORY_ID,
            mode: 'readwrite',
            startIn: 'documents'
        });
        
        // Store the directory handle for future use
        await this.storeDirectoryHandle(dirHandle);
        
        return dirHandle;
    }
    
    /**
     * Store directory handle in IndexedDB for persistence
     */
    static async storeDirectoryHandle(dirHandle) {
        try {
            // Use IndexedDB to store the directory handle
            const db = await this.openDirectoryDB();
            const transaction = db.transaction(['directories'], 'readwrite');
            const store = transaction.objectStore('directories');
            
            await store.put({
                id: this.BLOG_DIRECTORY_ID,
                handle: dirHandle,
                timestamp: Date.now()
            });
            
            db.close();
        } catch (error) {
            console.warn('Could not store directory handle:', error);
        }
    }
    
    /**
     * Retrieve stored directory handle from IndexedDB
     */
    static async getStoredDirectoryHandle() {
        try {
            const db = await this.openDirectoryDB();
            const transaction = db.transaction(['directories'], 'readonly');
            const store = transaction.objectStore('directories');
            
            const result = await store.get(this.BLOG_DIRECTORY_ID);
            db.close();
            
            return result?.handle;
        } catch (error) {
            console.warn('Could not retrieve stored directory handle:', error);
            return null;
        }
    }
    
    /**
     * Open IndexedDB for directory storage
     */
    static openDirectoryDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ContentCreatorDirectories', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('directories')) {
                    db.createObjectStore('directories', { keyPath: 'id' });
                }
            };
        });
    }
    
    /**
     * Clear stored directory (force re-selection)
     */
    static async clearStoredDirectory() {
        try {
            const db = await this.openDirectoryDB();
            const transaction = db.transaction(['directories'], 'readwrite');
            const store = transaction.objectStore('directories');
            
            await store.delete(this.BLOG_DIRECTORY_ID);
            db.close();
            
            return true;
        } catch (error) {
            console.warn('Could not clear stored directory:', error);
            return false;
        }
    }
    
    /**
     * Validate that a directory looks like the blog directory
     */
    static async validateBlogDirectory(dirHandle) {
        try {
            // Check for key directories/files that should exist in the blog
            const expectedPaths = ['src', 'package.json', 'astro.config.mjs'];
            
            for (const path of expectedPaths) {
                try {
                    if (path.includes('.')) {
                        // It's a file
                        await dirHandle.getFileHandle(path);
                    } else {
                        // It's a directory
                        await dirHandle.getDirectoryHandle(path);
                    }
                } catch {
                    return false; // Missing expected file/directory
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DirectoryHelper;
}