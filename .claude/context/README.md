# Claude Context Extension

**⚠️ IMPORTANT: This directory is now a Claude-specific extension layer.**

**Primary Context Source:** `.project/contexts/` - Contains the authoritative project context files
**Claude Extension:** `.claude/context/` - Adds Claude-specific optimizations and personas

This directory extends the primary project context with Claude-specific features while referencing `.project/contexts/` as the source of truth.

## Context Files

### 📐 [Architecture](./architecture.md)
**Tech stack, deployment architecture, and project structure**
- Astro v5.11.0 with Cloudflare Workers runtime
- Cloudflare D1 SQLite database
- TypeScript, Svelte, and MDX integration
- Production and development environment configurations

### 📝 [Coding Standards](./coding-standards.md)
**Code style rules, TypeScript conventions, and development practices**
- File creation policies and code consistency
- Astro framework patterns and component architecture
- Testing practices with Vitest
- Security standards and error handling patterns

### 📦 [Dependencies](./dependencies.md)
**Package.json analysis, framework dependencies, and tooling**
- Core Astro and Svelte dependencies
- Authentication and database libraries
- Development and testing tools
- Platform-specific dependencies and build tools

### 🔄 [Development Workflows](./development-workflows.md)
**Development commands, testing sequences, and deployment processes**
- Local development and build commands
- Database migration and worktree management
- Content management and testing workflows
- Environment setup and deployment strategies

### 🐛 [Debugging Lessons](./debugging-lessons.md)
**Common issues, debugging patterns, and lessons learned**
- Astro framework build failures and asset issues
- Authentication and OAuth troubleshooting
- Database migration problems and solutions
- Development server management best practices

### 🔧 [Troubleshooting](./troubleshooting.md)
**Common problems, solutions, and emergency procedures**
- Environment setup and configuration issues
- Build and deployment failures
- Authentication and database problems
- Performance issues and recovery procedures

## Usage Guidelines

### For Developers
1. **Start with Architecture** - Understand the tech stack and project structure
2. **Review Coding Standards** - Follow established patterns and conventions
3. **Check Dependencies** - Understand the tools and libraries in use
4. **Follow Development Workflows** - Use established processes for development
5. **Reference Debugging Lessons** - Learn from past issues and solutions
6. **Use Troubleshooting** - Quick reference for common problems

### For AI Agents
- Each context file is self-contained and can be referenced independently
- Use specific context files based on the type of assistance needed
- Combine multiple context files for comprehensive understanding
- Reference troubleshooting patterns when issues arise

### Context File Maintenance
- Update context files when project architecture changes
- Add new debugging lessons as issues are discovered and resolved
- Keep dependency information current with package.json changes
- Document new workflows and development processes as they evolve

## Quick Reference

### Common Commands
```bash
npm run dev                    # Start development server
npm test                       # Run test suite
npm run build                  # Build for production
bash scripts/setup-db.sh      # Setup local database
git worktree add worktrees/feature-name -b feature-name  # Create feature branch
```

### Critical Files
- `.dev.vars` - Local environment variables (never commit)
- `wrangler.json` - Cloudflare Workers configuration
- `astro.config.mjs` - Astro framework configuration
- `package.json` - Dependencies and scripts

### Emergency Commands
```bash
pkill -f "wrangler"           # Kill development servers
rm -rf .astro/ dist/          # Clear build cache
bash scripts/setup-db.sh     # Reset database
npm run check                 # Validate deployment readiness
```