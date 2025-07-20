# Claude Development Workflows Extension

**Primary Source:** `.project/contexts/development-workflows.md`

This file extends the project development workflows with Claude-specific optimizations.

## Project Development Workflows Reference
@include .project/contexts/development-workflows.md#*

## Claude-Specific Development Considerations

### File Operation Workflow
1. **Always read files first** - Understand existing implementation before making changes
2. **Prefer editing over creating** - Use existing files unless explicitly required to create new ones
3. **Validate before proceeding** - Run tests and builds to ensure changes work correctly
4. **Never add unnecessary comments** - Keep code clean and self-documenting

### Testing Strategy for Claude
- Run tests before making changes to understand current state
- Run tests after changes to verify implementation works
- Use test output to guide debugging and problem resolution
- Focus on maintaining existing test coverage

### Claude Deployment Awareness
- Never trigger deployments unless explicitly requested
- Understand that Cloudflare auto-deploys on git push to main
- Be aware that email notifications run on cron schedule
- Respect the existing CI/CD pipeline architecture

### Subagent Collaboration
- Use personas for specialized tasks (Eagle for integration, Bee for backend, etc.)
- Hand off work between subagents based on expertise areas
- Maintain consistency in coding style across subagent contributions
- Coordinate file operations to avoid conflicts