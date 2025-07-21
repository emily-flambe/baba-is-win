# Project Configuration

## Architecture Overview

**Type:** Personal website with blog and portfolio functionality  
**Pattern:** JAMstack with edge computing and hybrid rendering  
**Authentication:** JWT-based session management  
**Content:** Markdown-based with static generation  
**Deployment:** Edge computing platform with distributed database

## Technology Stack

### Core Technologies
- **Framework:** Static site generator with hybrid rendering
- **Language:** TypeScript
- **Runtime:** Edge computing platform
- **Database:** Distributed SQLite
- **Styling:** CSS with custom properties
- **Testing:** Modern testing framework
- **Build Tool:** Vite-based build system

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── admin/          # Admin dashboard components
│   └── content/        # Content display components
├── pages/              # Routes and API endpoints
│   ├── api/            # Backend API routes
│   └── content/        # Content pages
├── lib/                # Core business logic
│   ├── auth/           # Authentication services
│   ├── content/        # Content management
│   └── integrations/   # External service integrations
├── data/               # Content and configuration
└── styles/             # Styling and themes
```

### Database Design
- User authentication and authorization
- Content management and metadata
- System preferences and configuration
- Integration and webhook data

## Development Standards

### File Operations
- **ALWAYS prefer editing existing files over creating new ones**
- **NEVER proactively create documentation files unless explicitly requested**
- Use absolute paths for all file operations
- Quote file paths containing spaces with double quotes

### Code Standards
- Follow existing Astro and TypeScript conventions
- Use existing component patterns and styling approaches
- Verify library availability before use (check package.json)
- Never add comments unless explicitly requested
- Maintain professional, technical tone in all code

### Essential Commands
- **Development:** Standard dev server commands
- **Testing:** Test suite with coverage reporting
- **Build:** Production build with validation
- **Database:** Migration and backup utilities
- **Quality:** Type checking and linting

*Check package.json and project scripts for current command implementations*

### Security Standards
- Protect environment variables and secrets
- Use JWT authentication patterns for user management
- Implement proper OAuth flows with security monitoring
- Follow HTTPS-only policies
- Validate all user inputs

## AI Assistant Guidelines

### Communication Standards
- Maintain serious, professional tone in all interactions
- Be direct and straightforward without unnecessary personality or humor
- Focus on functionality and technical accuracy over entertainment value
- Avoid excessive emojis, jokes, or overly casual language
- Always render mermaid diagrams as high-resolution PNG files

### Development Workflow
1. **Before making changes:** Read existing files to understand current implementation
2. **Testing:** Always run tests before and after changes
3. **File operations:** Prefer editing over creating new files
4. **Commits:** Never commit changes unless explicitly requested
5. **Security:** Protect sensitive data and follow authentication patterns

### Deployment Patterns
- **Continuous Deployment:** Automated deployment on main branch
- **Environment Isolation:** Separate dev/staging/production configs
- **Asset Optimization:** Automatic build-time optimizations
- **Edge Distribution:** Global content delivery

### Environment Setup
- Use `.env.example` as template for local environment variables
- Keep sensitive configuration in environment-specific files
- Never commit secrets or API keys to version control

### Content Management
- Markdown-based content with frontmatter metadata
- Structured content organization by type
- Asset management with optimization
- Version-controlled content workflows

## Context Integration

This configuration works with specialized context files in `/contexts/` for:
- Framework-specific patterns and conventions
- Platform deployment and database considerations
- Authentication and security implementations
- External service integrations
- Content management workflows

## Quick Reference

### Configuration Files
- **Project:** `.project/config.md` (this file)
- **Package:** `package.json` for dependencies and scripts
- **Framework:** Check framework-specific config files
- **Platform:** Deployment platform configuration
- **Database:** Migration and schema files

### Development Patterns
- **Local Development:** Standard localhost development server
- **Authentication:** Login/signup/profile management routes
- **Content Management:** Admin interfaces for content
- **API Structure:** RESTful endpoint organization

---

*This configuration serves as the foundation for all AI assistant interactions with the Baba Is Win project. It provides tool-agnostic guidance while maintaining compatibility with the existing Astro + Cloudflare Workers architecture.*