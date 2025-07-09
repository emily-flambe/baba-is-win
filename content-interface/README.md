# Content Creator - Simple Local Interface

A lightweight, client-side content creation interface for managing blog posts and thoughts. No setup, no authentication, no backend complexity - just open and start writing.

## Features

### ✍️ Content Creation
- **Unified interface** for blog posts and thoughts
- **Live markdown preview** with proper rendering
- **Character limits** for thoughts (280 characters)
- **Tag management** with autocomplete suggestions
- **File generation** with proper frontmatter

### 💾 Draft Management
- **Auto-save** drafts to browser localStorage
- **Draft browser** with search and filtering
- **Resume editing** any saved draft
- **Bulk export** all drafts as files

### 📁 File Compatibility
- **Proper filenames** following `YYYYMMDD-slug.md` convention
- **Correct frontmatter** for blog posts and thoughts
- **Target paths** match existing blog structure:
  - Blog posts: `src/data/blog-posts/published/`
  - Thoughts: `src/data/thoughts/published/`

### 🛠️ Additional Tools
- **File import** - Upload existing markdown files
- **Copy to clipboard** - Easy content sharing
- **Dark mode** support
- **Keyboard shortcuts** for efficiency
- **Responsive design** for mobile and desktop

## Getting Started

### Quick Start
1. Open `index.html` in your web browser
2. Start writing content immediately
3. Use live preview to see how it will look
4. Generate files and place them in your blog directories

### No Installation Required
- Works completely offline
- No dependencies to install
- No server setup needed
- No authentication required

## How to Use

### Creating Content

1. **Select content type**: Choose between Blog Post or Thought
2. **Add title**: Required for blog posts, optional for thoughts
3. **Add tags**: Comma-separated tags with autocomplete suggestions
4. **Write content**: Use markdown syntax with live preview
5. **Save or generate**: Save as draft or generate final file

### Managing Drafts

- **Auto-save**: Drafts save automatically as you type (can be disabled)
- **Manual save**: Click "Save Draft" or use Ctrl+S
- **Load draft**: Click any draft in the sidebar to resume editing
- **Export drafts**: Download all drafts as files

### File Operations

- **Generate file**: Creates properly formatted markdown file
- **Copy to clipboard**: Copy formatted content for manual pasting
- **Import files**: Upload existing markdown files to convert to drafts

### Keyboard Shortcuts

- `Ctrl+S` - Save draft
- `Ctrl+Shift+Enter` - Generate file
- `Ctrl+/` - Toggle preview
- `Ctrl+K` - Focus content editor

## File Format

### Blog Posts
```markdown
---
title: "Your Blog Post Title"
date: 20250709
slug: your-blog-post-title
tags: ["personal", "tech", "life"]
---

Your blog post content here...
```

### Thoughts
```markdown
---
date: 20250709
slug: your-thought-slug
tags: ["random", "ideas"]
---

Your thought content here (280 characters max)...
```

## Browser Compatibility

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **JavaScript required**: Core functionality needs JS enabled
- **localStorage support**: For draft saving and settings
- **File download API**: For generating downloadable files

## Data Storage

### Local Storage Only
- **Drafts**: Saved to browser localStorage
- **Settings**: Theme, auto-save preferences
- **Tags**: Usage history for autocomplete
- **No server**: Everything stays on your device

### Export Options
- **Individual files**: Download one markdown file at a time
- **Bulk export**: Download all drafts as archive
- **Import capability**: Upload existing markdown files

## Workflow Integration

### With Existing Blog
1. Create content using the interface
2. Generate markdown files
3. Copy files to appropriate blog directories:
   - `src/data/blog-posts/published/` for blog posts
   - `src/data/thoughts/published/` for thoughts
4. Commit and deploy as usual

### Content Migration
1. Upload existing markdown files via "Upload Files"
2. Edit content in the interface
3. Re-generate with proper formatting
4. Replace original files with updated versions

## Customization

### Settings
- **Auto-save**: Enable/disable automatic draft saving
- **Dark mode**: Toggle dark theme
- **Auto-save interval**: Configurable (default 5 seconds)

### Tag Management
- **Autocomplete**: Based on usage history
- **Popular tags**: Shows most frequently used tags
- **Tag suggestions**: Appear as you type

## Troubleshooting

### Common Issues

**Content not saving**
- Check browser localStorage is enabled
- Clear old data if storage is full
- Try refreshing the page

**Files not downloading**
- Ensure pop-ups/downloads are allowed
- Try using "Copy to Clipboard" instead
- Check browser download settings

**Preview not updating**
- Check console for JavaScript errors
- Refresh the page
- Try in a different browser

### Browser Storage Limits
- **5MB typical limit** for localStorage
- **Auto-cleanup**: Old drafts removed automatically after 30 days
- **Storage info**: Check usage in browser dev tools

### Data Backup
- **Export regularly**: Use "Export All" to backup drafts
- **Multiple browsers**: Data doesn't sync between browsers
- **Incognito mode**: Data lost when session ends

## Technical Details

### Architecture
- **Pure HTML/CSS/JavaScript**: No build process required
- **Client-side only**: No server dependencies
- **Modular design**: Separate files for different concerns
- **Progressive enhancement**: Basic functionality without JS

### File Structure
```
content-interface/
├── index.html           # Main application
├── css/
│   ├── app.css         # Application styles
│   └── markdown.css    # Preview styles
├── js/
│   ├── app.js          # Main application logic
│   ├── markdown.js     # Markdown parsing
│   ├── storage.js      # localStorage management
│   └── fileGenerator.js # File creation utilities
└── README.md           # This file
```

### Performance
- **Fast loading**: No external dependencies
- **Efficient rendering**: Simple markdown parser
- **Memory conscious**: Limited draft storage
- **Responsive**: Works on mobile devices

## Limitations

### What This Doesn't Do
- **No image upload/optimization**: Manual image management required
- **No server-side processing**: Everything is client-side
- **No authentication**: Anyone with access can use
- **No real-time collaboration**: Single-user interface
- **No deployment integration**: Manual file placement required

### Compared to Full Solution
This simple interface provides:
- ✅ 80% of content creation functionality
- ✅ 20% of implementation complexity
- ✅ Zero setup and maintenance
- ✅ Complete offline capability
- ❌ Advanced features like image processing
- ❌ Multi-user support
- ❌ Automated deployment

## Future Enhancements

### Easy Additions
- **Export formats**: JSON, different frontmatter styles
- **Template system**: Pre-filled content templates
- **Import improvements**: Better parsing of various formats
- **Accessibility**: Enhanced keyboard navigation

### Advanced Features
- **Git integration**: Direct repository commits
- **Cloud sync**: Dropbox/Google Drive integration
- **Asset management**: Basic image handling
- **Plugin system**: Extensible functionality

## Support

This is a simple, self-contained tool. For issues:

1. **Check browser console** for JavaScript errors
2. **Try different browser** to isolate issues
3. **Clear localStorage** to reset all data
4. **Check file permissions** for downloads

## License

This tool is designed for personal use with the baba-is-win blog system. Feel free to modify and adapt for your own needs.