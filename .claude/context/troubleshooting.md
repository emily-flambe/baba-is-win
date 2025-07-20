# Claude Troubleshooting Extension

**Primary Source:** `.project/contexts/troubleshooting.md`

This file extends the project troubleshooting context with Claude-specific procedures.

## Project Troubleshooting Reference
@include .project/contexts/troubleshooting.md#*

## Claude-Specific Troubleshooting

### Claude Code Tool Issues
- **File Access Problems**: Ensure absolute paths are used for all file operations
- **Permission Errors**: Verify Claude has proper access to project directories
- **Build Failures**: Check that all required dependencies are available in environment

### Integration Troubleshooting
- **MCP Server Issues**: Verify MCP servers are properly configured and accessible
- **Persona Activation**: Ensure appropriate personas are activated for specific tasks
- **Context Loading**: Verify that @include references resolve correctly

### Emergency Recovery Procedures
1. **File Operation Failures**: Fall back to reading existing implementations
2. **Build Errors**: Run diagnostic commands to identify specific issues
3. **Authentication Problems**: Verify environment variable configuration
4. **Database Issues**: Check D1 database connectivity and migration status

### Claude Communication During Issues
- Report problems clearly with specific error messages
- Focus on immediate solutions rather than lengthy explanations
- Escalate to appropriate persona based on problem domain
- Maintain professional tone during troubleshooting communications