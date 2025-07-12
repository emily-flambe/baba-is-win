# Claude Code Project Configuration

## Project Identity & Configuration
@include project-config.yml#ProjectIdentity
@include project-config.yml#ProjectStructure
@include project-config.yml#DevelopmentCommands

## Workflow Patterns
@include workflow-patterns.yml#WorktreeManagement
@include workflow-patterns.yml#PullRequestGuidelines
@include workflow-patterns.yml#ContentManagement

## Debugging Lessons Learned
@include debugging-lessons.yml#AstroFrameworkIssues
@include debugging-lessons.yml#AuthenticationComplexity
@include debugging-lessons.yml#DatabaseMigrationIssues
@include debugging-lessons.yml#ContentManagementLessons

## Development Philosophy

This is a personal website and portfolio project built with modern web technologies. The focus is on clean content presentation, reliable authentication, and maintainable code.

### Key Principles
- **Worktree Workflow**: Always create git worktrees in the `worktrees/` folder to keep the repository organized
- **Content First**: Blog posts and thoughts are the primary content, with clean presentation being essential
- **Authentication Security**: OAuth integration must be secure and reliable
- **Asset Management**: Proper organization and optimization of images and static assets

### Technology Choices
- **Astro**: Static site generation with dynamic capabilities
- **TypeScript**: Type safety for all code
- **Cloudflare**: Pages for hosting, D1 for database, Workers for serverless functions
- **Content Management**: File-based content with frontmatter metadata

### Deployment Strategy
- **Development**: Local development with `npm run dev`
- **Testing**: Comprehensive test suite with Vitest/Jest
- **Production**: Cloudflare Pages with automatic deployments
- **Database**: Cloudflare D1 with migration scripts

### Content Guidelines
- Blog posts in `src/data/blog-posts/published/`
- Thoughts in `src/data/thoughts/published/`
- Assets organized in `public/assets/` with proper subdirectories
- Content interface available for easy content creation

### Workflow Standards
- Use worktrees for all feature development
- Share PR URLs immediately after creation
- Test builds locally before deployment
- Maintain clean asset organization