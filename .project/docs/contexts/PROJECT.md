# Baba Is Win - Project Overview

This is the primary project overview document. For implementation details, see:
- [Feature Details](./feature-details.md) - Detailed feature specifications
- [AI Assistant Config](./ai-assistant-config.md) - Development guidelines for AI assistants
- [Utilities](./../README.md) - Development utility scripts

## About

Emily's personal blog and portfolio website built with Astro and deployed on a single Cloudflare Worker named 'personal' with one D1 database named 'baba-is-win-db'.

A modern personal website featuring blog posts, quick thoughts, and a Baba Is You-inspired aesthetic. Built with heavy AI assistance and deployed on Cloudflare's edge infrastructure.

## Architecture

- **Frontend**: Astro static site generator with Svelte components
- **Backend**: Single Cloudflare Worker ('personal') for serverless functions
- **Database**: Single Cloudflare D1 database ('baba-is-win-db')
- **Authentication**: JWT-based with Google OAuth integration
- **Deployment**: Cloudflare Workers with automatic deployment

## Key Features

- Personal blog with markdown posts
- Quick thoughts system  
- Museum/portfolio section showcasing projects
- Email notification system for new content
- User authentication and profiles
- Admin dashboard for content management
- Google OAuth integration for social login

## Project Structure

```
baba-is-win/
├── src/                    # Source code
│   ├── components/         # Astro/Svelte components
│   ├── data/              # Content (blog posts, thoughts)
│   ├── layouts/           # Page layouts
│   ├── lib/              # Utility libraries and services
│   ├── pages/            # Astro pages and API routes
│   └── styles/           # CSS styles
├── public/               # Static assets
├── migrations/           # Database migrations
├── tests/               # Test files
├── scripts/             # Build and utility scripts
└── docs/                # Documentation
```

## Development Status

- ✅ Core website functionality
- ✅ Blog and thoughts systems
- ✅ User authentication
- ✅ Email notifications
- ✅ Museum/portfolio section
- 🔄 Google OAuth integration (in progress)
- 📝 Testing infrastructure improvements

## Tech Stack

- **Framework**: Astro 5.11.0
- **Runtime**: Single Cloudflare Worker ('personal')
- **Database**: Single Cloudflare D1 database ('baba-is-win-db')
- **UI**: Svelte components
- **Styling**: Custom CSS with Baba Is You theme
- **Authentication**: JWT with bcrypt
- **Email**: Google Gmail API integration
- **Testing**: Vitest with coverage
- **Build**: Wrangler for Cloudflare deployment