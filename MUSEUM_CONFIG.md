# Museum Configuration Guide

The museum feature now uses a configuration file to specify which repositories to display, giving you full control over your project showcase.

## Configuration File

The configuration is stored in `src/data/museum-config.json`. This file controls:

- Which repositories to display
- How they're presented (display names, descriptions, categories)
- Sort order and featured status
- Demo URLs and custom metadata

## Configuration Structure

```json
{
  "owner": "your-github-username",
  "repositories": [
    {
      "name": "repository-name",
      "displayName": "Custom Display Name",
      "customDescription": "Custom description (optional, uses GitHub description if null)",
      "category": "productivity",
      "demoUrl": "https://example.com",
      "order": 1
    }
  ],
  "settings": {
    "fallbackToAllRepos": false,
    "sortBy": "order",
    "showOnlyConfigured": true
  }
}
```

## Repository Configuration Options

### Required Fields
- `name`: The exact repository name from GitHub
- `order`: Numeric order for sorting (lower numbers appear first)

### Optional Fields
- `displayName`: Custom name to display (defaults to formatted repo name)
- `customDescription`: Custom description (defaults to GitHub description)
- `category`: Override automatic category detection
- `demoUrl`: Link to live demo (overrides GitHub homepage)

## Settings Options

### `sortBy`
- `"order"`: Sort by the `order` field in configuration
- `"updated"`: Sort by last updated date (most recent first)
- `"created"`: Sort by creation date (most recent first)

### `showOnlyConfigured`
- `true`: Only show repositories listed in the configuration
- `false`: Show all public repositories, with configuration overrides applied

### `fallbackToAllRepos`
- `true`: If configured repos fail to load, fall back to all public repos
- `false`: If configured repos fail, show empty state

## Categories

Available categories (with icons):
- `productivity` 🛠️ - Productivity Tools
- `data-processing` 📊 - Data Processing
- `api-integration` 🔌 - APIs & Integration
- `web-applications` 🌐 - Web Applications
- `libraries` 📚 - Libraries & Frameworks
- `automation` ⚙️ - Automation
- `other` 🔬 - Other Projects

## Example Configuration

```json
{
  "owner": "emily-flambe",
  "repositories": [
    {
      "name": "smart-tool-of-knowing",
      "displayName": "Smart Tool Of Knowing",
      "customDescription": null,
      "category": "productivity",
      "demoUrl": null,
      "order": 1
    },
    {
      "name": "ask-reddit-without-asking-reddit",
      "displayName": "Ask Reddit Without Asking Reddit",
      "customDescription": "Get answers without posting to Reddit",
      "category": "web-applications",
      "demoUrl": "https://ask-reddit-alt.example.com",
      "order": 2
    }
  ],
  "settings": {
    "fallbackToAllRepos": false,
    "sortBy": "order",
    "showOnlyConfigured": true
  }
}
```

## Adding New Repositories

1. Add a new entry to the `repositories` array
2. Set the `name` to match the GitHub repository name exactly
3. Configure display options and set an appropriate `order` value
4. The site will automatically fetch the repository data from GitHub

## Removing Repositories

Simply remove the repository entry from the configuration file. The repository will no longer appear in the museum.

## Validation

The configuration file is validated on load:
- Required fields must be present
- Repository names must be strings
- Order must be numeric
- At least one repository must be configured

Invalid configurations will cause the museum to fall back to safe defaults.