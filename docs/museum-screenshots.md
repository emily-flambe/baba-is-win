# Museum Screenshot Integration

This document explains how to use the MCP screenshot tool to automatically capture screenshots for your museum projects.

## Overview

The integration uses `@just-every/mcp-screenshot-website-fast` to automatically capture screenshots of demo URLs in your museum configuration. Screenshots are stored in `public/assets/museum/` and automatically referenced in your museum config.

## Setup

### 1. MCP Configuration
The MCP server is configured in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "screenshot-website": {
      "command": "uvx",
      "args": ["@just-every/mcp-screenshot-website-fast@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": ["screenshot_website"]
    }
  }
}
```

### 2. Prerequisites
- Ensure `uv` and `uvx` are installed on your system
- MCP server will auto-install when first used

## Usage

### Automated Screenshot Updates
```bash
# Update all missing screenshots
npm run museum:screenshots

# Force re-capture all screenshots
npm run museum:screenshots:force
```

### Manual Screenshot Capture
```bash
# Capture a single screenshot
npm run museum:screenshot <project-name> <url>

# Examples:
npm run museum:screenshot cutty https://cutty.emilycogsdill.com
npm run museum:screenshot esquie https://esquie.emilycogsdill.com
```

### Using MCP Tool Directly in Kiro
You can also use the MCP tool directly in Kiro chat:

```
Take a screenshot of https://cutty.emilycogsdill.com and save it as cutty-new.png
```

## Configuration Options

### Screenshot Settings
- **Dimensions**: 1200x800px (16:10 aspect ratio)
- **Format**: PNG
- **Quality**: High (90%)
- **Wait Time**: 3 seconds for page load
- **Device Scale**: 2x for retina displays

### File Naming Convention
Screenshots are saved as:
- File: `public/assets/museum/{project-name}.png`
- URL: `/assets/museum/{project-name}.png`

## Museum Config Integration

When screenshots are captured, the museum config is automatically updated:

```json
{
  "name": "cutty",
  "displayName": "List Cutter (\"Cutty\")",
  "demoUrl": "https://cutty.emilycogsdill.com",
  "screenshot": "/assets/museum/cutty.png"  // ← Added automatically
}
```

## Current Projects with Demo URLs

| Project | Demo URL | Screenshot Status |
|---------|----------|-------------------|
| Personal Site | https://www.emilycogsdill.com | ✅ Exists |
| Cutty | https://cutty.emilycogsdill.com | ✅ Exists |
| Chesscom Helper | https://chesscomhelper.emilycogsdill.com | ✅ Exists |
| Esquie | https://esquie.emilycogsdill.com | ✅ Exists |

## Troubleshooting

### MCP Server Issues
If the MCP server fails to start:
1. Check that `uvx` is installed: `uvx --version`
2. Restart Kiro to reconnect MCP servers
3. Check MCP server status in Kiro's MCP panel

### Screenshot Failures
Common issues and solutions:
- **Timeout**: Increase wait time for slow-loading sites
- **Access denied**: Some sites block automated screenshots
- **File permissions**: Ensure write access to `public/assets/museum/`

### Manual Fallback
If automated screenshots fail, you can:
1. Take manual screenshots
2. Save them as `public/assets/museum/{project-name}.png`
3. Update museum config manually

## Automation Ideas

### Kiro Hooks
- Auto-capture when museum config changes
- Scheduled updates (weekly/monthly)
- Trigger on deployment

### CI/CD Integration
- Add screenshot updates to build process
- Validate all demo URLs have screenshots
- Optimize images for web delivery

## Best Practices

1. **Consistent Timing**: Capture screenshots at similar times for consistency
2. **Mobile Responsive**: Consider capturing mobile versions too
3. **Image Optimization**: Compress images for faster loading
4. **Fallback Images**: Have placeholder images for failed captures
5. **Version Control**: Commit screenshot updates with descriptive messages