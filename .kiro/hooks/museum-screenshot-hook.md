# Museum Screenshot Hook

## Description
Automatically capture screenshots for museum projects when the museum config is updated.

## Trigger
- File change: `src/data/museum-config.json`
- Manual trigger available

## Actions
1. Check for projects with demo URLs but missing screenshots
2. Use MCP screenshot tool to capture website screenshots
3. Update museum config with new screenshot paths
4. Optimize images for web display

## Configuration
- Screenshot dimensions: 1200x800px
- Wait time: 2 seconds for page load
- Output format: PNG
- Storage location: `public/assets/museum/`

## Usage
This hook will automatically run when you:
- Add a new project with a demo URL to museum-config.json
- Update an existing project's demo URL
- Manually trigger via "Capture Museum Screenshots" button