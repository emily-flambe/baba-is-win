# Claude Code Project Configuration

Personal website and portfolio project built with modern web technologies.

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

## Development Philosophy

This is a personal website and portfolio project built with modern web technologies. The focus is on clean content presentation, reliable authentication, and maintainable code.

### Key Principles
- **Worktree Workflow**: Always create git worktrees in the `worktrees/` folder to keep the repository organized
- **Content First**: Blog posts and thoughts are the primary content, with clean presentation being essential
- **Authentication Security**: OAuth integration must be secure and reliable
- **Asset Management**: Proper organization and optimization of images and static assets