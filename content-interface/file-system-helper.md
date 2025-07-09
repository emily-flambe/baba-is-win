# File System Helper Guide

## Current Limitation
Due to browser security restrictions, the content interface cannot directly write files to your blog directories. Here are the solutions:

## Option 1: File System Access API (Chrome/Edge Only)
If you're using Chrome or Edge, the interface will prompt you to select your blog directory and can save files directly to the correct location.

1. Click "💾 Save Content"
2. Browser will ask you to select a folder
3. Navigate to: `/Users/emilycogsdill/Documents/GitHub/baba-is-win/`
4. Select this folder
5. Files will be saved directly to the correct subdirectory

## Option 2: Manual File Movement (All Browsers)
For other browsers, files download to your Downloads folder and you move them manually:

1. Click "💾 Save Content"
2. File downloads to Downloads folder
3. Move file to the correct location:
   - **Drafts**: `src/data/blog-posts/draft/` or `src/data/thoughts/draft/`
   - **Published**: `src/data/blog-posts/published/` or `src/data/thoughts/published/`

## Option 3: Terminal Commands (Power Users)
You can use the command line to move files quickly:

```bash
# Move a blog post draft
mv ~/Downloads/20250709-my-post.md /Users/emilycogsdill/Documents/GitHub/baba-is-win/src/data/blog-posts/draft/

# Move a published thought
mv ~/Downloads/20250709-my-thought.md /Users/emilycogsdill/Documents/GitHub/baba-is-win/src/data/thoughts/published/
```

## Future Enhancement Ideas
- Local web server that can write files directly
- Browser extension with file system permissions
- Integration with file sync services (Dropbox, etc.)
- Git integration for automatic commits

## Current Workflow
1. Write content in interface
2. Toggle Draft/Published
3. Click "💾 Save Content" 
4. Move file from Downloads to correct blog directory
5. Commit and push as usual