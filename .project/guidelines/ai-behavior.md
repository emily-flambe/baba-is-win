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

#### Communication Style:
- Skip affirmations and compliments. No "great question!" or "you're absolutely right!" - just respond directly
- Challenge flawed ideas openly when you spot issues
- Ask clarifying questions whenever requests are ambiguous or unclear
- When obvious mistakes are made, point them out with gentle humor or playful teasing

#### Example behaviors:
- Instead of: "That's a fascinating point!" → Just dive into the response
- Instead of: Agreeing when something's wrong → "Actually, that's not quite right because…"
- Instead of: Guessing what the user means → "Are you asking about X or Y specifically?"
- Instead of: Ignoring errors → "Hate to break it to you, but 2+2 isn't 5…"

#### Original Rules:
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

### Visual Verification with Playwright

**Use Playwright screenshots for ALL UI development** - not just testing. When making any visual changes, capture and inspect screenshots to verify the result.

- Save verification screenshots to `.screenshots/` directory (gitignored)
- Save museum screenshots to `public/assets/museum/`

#### Quick Screenshot (dev server running)

```bash
# Basic capture
npx playwright screenshot --viewport-size=1200,800 --wait-for-timeout=3000 http://localhost:4321/page .screenshots/verify.png

# Then view it
# Use the Read tool on .screenshots/verify.png
```

#### Interactive Screenshots (login, navigation, dynamic content)

Create a temporary Playwright test:

```typescript
import { test } from '@playwright/test';

test('verify UI change', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1200, height: 800 });

  await page.goto('http://localhost:4321');
  await page.waitForTimeout(2000);

  // Navigate, click, fill forms as needed
  await page.click('text=Some Link');
  await page.waitForTimeout(3000);

  // Scroll if needed
  await page.evaluate(() => window.scrollBy(0, 500));

  await page.screenshot({ path: '.screenshots/verify.png' });
});
```

Run with: `npx playwright test tests/verify.spec.ts --reporter=line`

#### When to Use Playwright Screenshots

- **After any CSS/layout changes** - verify nothing broke
- **After component changes** - check rendering
- **When adding new pages** - verify they display correctly
- **When debugging UI issues** - see what's actually rendering
- **Before claiming UI work is complete** - evidence over assertions

#### Visual Verification is Mandatory

1. Capture screenshot after making changes
2. Use the Read tool to view the screenshot
3. Verify content is correct (not loading spinners, empty states, or broken layouts)
4. Re-capture with longer waits if content hasn't loaded

**Do NOT claim UI changes work without screenshot verification.**

#### Museum Screenshots

For museum project entries specifically:

```bash
# External sites
npx playwright screenshot --viewport-size=1200,800 --wait-for-timeout=3000 https://project.emilycogsdill.com public/assets/museum/project-name.png
```

For sites requiring login or interaction, use a Playwright test (see above) with the output path set to `public/assets/museum/project-name.png`.

After adding museum entries:
1. Run `npm run build`
2. Start dev server and screenshot the museum page
3. Verify project cards render with correct screenshots

### Database
- Database name is always 'baba-is-win-db'
- Use migrations for schema changes
- Test locally before applying to production

**THESE RULES ARE NON-NEGOTIABLE**