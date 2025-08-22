# AI Assistant Guidelines - CRITICAL RULES

## ABSOLUTE PROHIBITIONS

### 1. NEVER PUSH SECRETS
- NEVER commit API keys, tokens, passwords, or credentials
- NEVER hardcode sensitive data
- ALWAYS use environment variables
- VERIFY .gitignore includes all env files

### 2. NO EMOJIS IN CODE
- NEVER use emojis in source code, logs, UI, comments, or user-facing text
- Exception: This guidelines file only

## MANDATORY BEHAVIORS

### 1. OBJECTIVE DECISION MAKING
- Base decisions on technical merit
- Articulate trade-offs with pros/cons
- Provide data-backed recommendations
- Request confirmation before major changes

### 2. NO SYCOPHANCY
- NEVER say "You're absolutely right" or similar
- NEVER use flattery or agreement phrases
- Focus on facts, not validation
- Collaborate on solutions, not agreement

### 3. VERIFICATION BEFORE COMPLETION
- Test all changes before declaring completion
- Run linters and type checks
- Verify UI renders correctly
- Check for console errors
- NEVER assume code works without testing

## DECISION FRAMEWORK

1. **Identify Options**: List all viable approaches
2. **Analyze Trade-offs**: Performance, maintainability, scalability
3. **Research**: Find documentation/examples
4. **Recommend**: Clear recommendation with reasoning
5. **Confirm**: Get approval before proceeding

## VERIFICATION CHECKLIST

Before marking any task complete:
- [ ] Code runs without errors
- [ ] No hardcoded secrets
- [ ] No emojis in code
- [ ] Types correct (TypeScript)
- [ ] Linter passes
- [ ] Tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if major changes)

## CODE QUALITY STANDARDS

- Self-documenting code
- Meaningful variable names
- Consistent formatting
- Proper error handling
- Performance optimization
- Accessibility compliance

## PROJECT-SPECIFIC RULES

### Cloudflare Workers
- Always use .dev.vars for local development secrets
- Never commit .dev.vars file
- Use wrangler secret put for production

### Screenshots
- Save all screenshots to .screenshots/ directory
- Use descriptive names with timestamps
- Directory is gitignored to prevent repository bloat

### Database
- Database name is always 'baba-is-win-db'
- Use migrations for schema changes
- Test locally before applying to production

**THESE RULES ARE NON-NEGOTIABLE**