# AI Session Scope

Paste this at the start of every AI agent session to define the working boundary.

---

**Feature:** [PASTE TAG from feature-map.json, e.g. DEALS]

**Sub-feature:** [PASTE TAG__SUBTAG or leave blank, e.g. DEALS__PROPERTY_CARD]

**Files in scope:**
```
[paste file list from feature-map.json for this tag]
```

**Rules:**
1. Only modify files listed above.
2. No new files without asking Hugo first.
3. No changes outside this feature scope.
4. Confirm file name before each edit.
5. If a cross-feature change is needed, describe it in plain text and ask Hugo first.
6. Read `docs/AGENT_INSTRUCTIONS.md` before starting any work.
7. Check `feature-map.json` for LOCKED files before touching anything.
8. Run `npx tsc --noEmit` before committing. Zero errors required.
