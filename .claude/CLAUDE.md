# CLAUDE.md - Baba Is Win Project Configuration

Enhanced Claude configuration for the baba-is-win project.

## Core Configuration
@include shared/core.yml#Core_Philosophy
@include shared/core.yml#Advanced_Token_Economy
@include shared/core.yml#Code_Economy
@include shared/core.yml#Performance_Standards
@include shared/core.yml#Task_Management

## Rules & Standards
@include shared/rules.yml#Development_Practices
@include shared/rules.yml#Code_Generation
@include shared/rules.yml#Security_Standards
@include shared/rules.yml#Project_Quality

## Project Configuration
@include project-config.yml#ProjectIdentity
@include project-config.yml#ProjectStructure
@include project-config.yml#DevelopmentCommands

## OAuth Security Guidelines
@include oauth-config.yml#OAuthSecretManagement
@include oauth-config.yml#OAuthFailurePatterns
@include oauth-config.yml#OAuthSecretCommands
@include oauth-config.yml#OAuthRedirectURI
@include oauth-config.yml#OAuthTroubleshootingWorkflow

## Development Workflows
@include development-commands.yml#DevelopmentWorkflow
@include development-commands.yml#DevelopmentServerRules
@include development-commands.yml#DeploymentStrategy
@include development-commands.yml#ContentGuidelines
@include development-commands.yml#WorkflowStandards

## Debugging Lessons Learned
@include development-commands.yml#AstroFrameworkIssues
@include development-commands.yml#AuthenticationComplexity
@include development-commands.yml#DatabaseMigrationIssues
@include development-commands.yml#ContentManagementLessons

## Worktree Management
@include project-config.yml#WorktreeManagement

## Pull Request Guidelines
@include project-config.yml#PullRequestGuidelines
@include shared/rules.yml#Communication_Standards
>>>>>>> origin/main

## Project-Specific Configuration

### Worktree Management
@include configs/worktree-rules.yml#Worktree_Rules
@include configs/worktree-rules.yml#Worktree_Structure
@include configs/worktree-rules.yml#Worktree_Best_Practices

<<<<<<< HEAD
### Key Principles
- **Worktree Workflow**: Always create git worktrees in the `worktrees/` folder to keep the repository organized
- **Content First**: Blog posts and thoughts are the primary content, with clean presentation being essential
- **Authentication Security**: OAuth integration must be secure and reliable
- **Asset Management**: Proper organization and optimization of images and static assets
=======
### Technology Stack
This project uses:
- Astro for static site generation
- TypeScript for type safety
- Cloudflare Pages for hosting
- Cloudflare D1 for database
- Gmail API for email functionality
- Google OAuth for authentication

### Development Guidelines
- Follow existing Astro patterns and conventions
- Use TypeScript strictly - no any types
- Test email functionality thoroughly in development
- Ensure OAuth flows work correctly
- Maintain responsive design principles
- Keep bundle sizes optimized

---
*Baba Is Win Project Configuration v1.0*
>>>>>>> origin/main
