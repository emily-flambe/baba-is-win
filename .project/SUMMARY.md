# Project Summary

## Baba Is Win - Personal Website & Blog

**Emily's personal blog and portfolio website built with Astro and deployed on Cloudflare Workers.**

### Quick Overview
- **Type**: Personal website and blog with portfolio
- **Tech Stack**: Astro + Cloudflare Workers + D1 Database
- **Theme**: Baba Is You-inspired aesthetic
- **Development**: AI-assisted with modern web practices

### Key Features
- 📝 **Blog System**: Rich markdown posts with image galleries
- 💭 **Thoughts**: Micro-blogging for quick takes and musings  
- 🏛️ **Museum**: Interactive project portfolio with GitHub integration
- 👤 **User System**: JWT authentication with Google OAuth (in progress)
- 📧 **Email Notifications**: Automated subscriber notifications
- 🛡️ **Security**: Rate limiting, input validation, secure sessions
- ⚡ **Performance**: Edge computing with global distribution

### Architecture Highlights
- **Frontend**: Astro 5.11.0 with Svelte components
- **Backend**: Cloudflare Workers (serverless)
- **Database**: Cloudflare D1 (distributed SQLite)
- **Authentication**: JWT + bcrypt with OAuth integration
- **Email**: Gmail API integration for notifications
- **Deployment**: Automated via GitHub Actions

### Development Status
- ✅ Core website functionality complete
- ✅ Blog and thoughts systems operational
- ✅ User authentication and email notifications working
- 🔄 Google OAuth integration in progress
- 📋 Test coverage expansion planned

### For Developers
- **Environment**: Requires `.dev.vars` file for local development
- **Database**: Sequential migrations in `/migrations/` directory
- **API**: Versioned routes following `/api/v1/{domain}/{action}` pattern
- **Testing**: Vitest with comprehensive coverage targets
- **Deployment**: Single command deployment to Cloudflare

### For AI Agents
- **Context**: Full project documentation in `.project/` directory
- **Patterns**: Established code patterns and conventions
- **Security**: Comprehensive security requirements and validations
- **Integration**: Email system, OAuth flows, and database operations
- **Quality**: TypeScript, testing, and performance standards

This project represents a modern, performant personal website that balances authentic personal expression with technical excellence, leveraging edge computing and AI assistance for development efficiency.