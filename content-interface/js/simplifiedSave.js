/**
 * Simplified File Saving
 * Intelligently builds the full path from a parent directory selection
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
        // Prompt for a parent directory - user can select Documents or any parent folder
        const directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        
        // Build the full path: baba-is-win/src/data/blog-posts/draft/filename.md
        // User should select the baba-is-win directory directly
        const fullPath = file.path.split('/').filter(p => p && p !== '.');
        let currentDir = directoryHandle;
        
        // Navigate/create the full path
        for (const dirName of fullPath.slice(0, -1)) { // All except filename
            try {
                currentDir = await currentDir.getDirectoryHandle(dirName);
            } catch {
                // Directory doesn't exist, create it
                try {
                    currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
                } catch (createError) {
                    // If we can't create the directory, show a helpful error
                    throw new Error(`Cannot create directory "${dirName}". Make sure you selected the baba-is-win folder.`);
                }
            }
        }
        
        // Create/overwrite the file
        const fileName = fullPath[fullPath.length - 1];
        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
        
        const savedPath = fullPath.join('/');
        return {
            success: true,
            message: `File saved successfully to: ${savedPath}`,
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
            message: `Downloaded "${file.name}". Please move it to: baba-is-win/${file.path}`,
            needsManualMove: true,
            savedDirectly: false
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimplifiedSave;
}