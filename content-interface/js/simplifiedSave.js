/**
 * Simplified File Saving
 * A more reliable approach to file saving that works consistently
 */
class SimplifiedSave {
    static async saveFile(file) {
        // Check if File System Access API is available
        if ('showDirectoryPicker' in window) {
            try {
                return await this.saveWithDirectoryPicker(file);
            } catch (error) {
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        message: 'Save cancelled'
                    };
                }
                // Fall back to download
                console.warn('Directory picker failed, falling back to download:', error);
            }
        }
        
        // Fallback: download file
        return this.downloadFile(file);
    }
    
    static async saveWithDirectoryPicker(file) {
        // Always prompt for directory - this is more reliable than trying to persist
        const directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        
        // Navigate to the target subdirectory, creating if needed
        const pathParts = file.path.split('/').filter(p => p && p !== '.');
        let currentDir = directoryHandle;
        
        // Navigate/create path: src/data/blog-posts/draft (or published, thoughts, etc.)
        for (const dirName of pathParts.slice(0, -1)) { // All except filename
            try {
                currentDir = await currentDir.getDirectoryHandle(dirName);
            } catch {
                // Directory doesn't exist, create it
                currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
            }
        }
        
        // Create/overwrite the file
        const fileHandle = await currentDir.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
        
        return {
            success: true,
            message: `File saved successfully to: ${file.path}`,
            savedDirectly: true,
            needsManualMove: false
        };
    }
    
    static downloadFile(file) {
        // Create and trigger download
        const blob = new Blob([file.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        return {
            success: true,
            message: `Downloaded "${file.name}". Please move it to: ${file.path}`,
            needsManualMove: true,
            savedDirectly: false
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimplifiedSave;
}