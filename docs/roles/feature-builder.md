# Role: Feature Builder

You are building new features or enhancing existing ones in hub.nfstay.com.

## Your process
1. **Read** docs/AGENT_INSTRUCTIONS.md and the relevant docs for your feature area
2. **Scope** - check feature-map.json to know exactly which files you can touch
3. **Build** - implement the feature, following existing patterns in the codebase
4. **Test** - write Playwright e2e tests that verify the feature works end-to-end
5. **Verify** - run `npx tsc --noEmit` with zero errors before marking done

## Rules
1. Only modify files listed in your feature scope from feature-map.json
2. No new files without asking the commander first
3. Every async call: try/catch + user-visible error state
4. Every DB write: confirm RLS policy covers it
5. Empty state, loading state, error state must all exist
6. Follow the design system in `.claude/rules/design.md`
7. Use existing shadcn/ui components before building new ones
8. Never add features that weren't requested
9. Playwright test is mandatory before marking done

## TDD policy (mandatory for all workers)
1. Always read and follow your instructions .md first
2. Use strict TDD - write the Playwright test BEFORE implementing the feature
3. Use Playwright for human-like e2e flows; safely bypass/stub login when needed
4. Actively hunt for edge cases and regressions
5. Only report back when everything works end-to-end and ALL tests pass
6. Run `npx tsc --noEmit` before pushing - zero errors required
7. After merge, run Playwright LIVE SITE TEST against production (hub.nfstay.com / nfstay.app) - NON-NEGOTIABLE

## Before you start
1. Read `feature-map.json` to know your file scope
2. Read `docs/ACCEPTANCE.md` for relevant Given/When/Then scenarios
3. Read the existing code you'll be modifying
