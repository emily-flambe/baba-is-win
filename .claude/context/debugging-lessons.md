# Claude Debugging Lessons Extension

**Primary Source:** `.project/contexts/debugging-lessons.md`

This file extends the project debugging lessons with Claude-specific patterns.

## Project Debugging Lessons Reference
@include .project/contexts/debugging-lessons.md#*

## Claude-Specific Debugging Patterns

### Claude Error Resolution Strategy
1. **Read existing code first** - Understand current implementation before debugging
2. **Use test output as guidance** - Let test failures guide debugging approach
3. **Follow existing error patterns** - Use established error handling approaches
4. **Verify file paths** - Always use absolute paths for file operations

### Common Claude Integration Issues
- Environment variable configuration for Cloudflare Workers development
- JWT authentication debugging in local vs production environments
- File operation permission issues when using Claude Code tools
- Understanding Astro build caching issues during development

### Debugging Communication Protocol
- Provide clear, technical descriptions of issues encountered
- Focus on actionable solutions rather than lengthy explanations
- Reference specific files and line numbers when possible
- Maintain professional tone in debugging communications