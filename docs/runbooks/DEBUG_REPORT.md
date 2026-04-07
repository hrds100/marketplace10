# Super Debug Report — How to Use

## What is it?
A hidden tool built into hub.nfstay.com that captures browser-side debug data and downloads it as a file. You give this file to Claude so it can diagnose UI bugs faster, without you needing to open DevTools.

## How to turn it on
Add this line to your `.env.local` file (or set it in Vercel environment variables):

```
VITE_DEBUG_REPORT_ENABLED=true
```

Redeploy or restart the dev server after adding it.

## How to turn it off
Remove that line from `.env.local` (or Vercel env vars) and redeploy. When the variable is not set, nothing loads — no listeners, no button, no code runs.

## How to use it

1. Go to the page where the bug is happening
2. Click somewhere on the page background (NOT inside a text box or input field)
3. Type the word: **nfsdebug** (just type it, you won't see it appear anywhere)
4. A small dark circle with a bug icon appears in the bottom-right corner
5. Click the bug icon
6. A `.json` file downloads automatically (named `nfstay-debug-[timestamp].json`)
7. Share this file with Claude

The bug icon stays visible for the rest of your browser session. If you close the tab and reopen, you'll need to type `nfsdebug` again.

## What does the file contain?

- **Page info:** current URL, route, browser, screen size, timezone
- **Console errors and warnings** from the current page session
- **Failed network requests** (URL + status code only, never the data)
- **Recent successful requests** (URL + status code + timing)
- **Route history:** the last 10 pages you navigated to
- **User actions:** the last 30 button clicks and form submits (what you clicked, NOT what you typed)
- **Supabase errors** visible from the browser

## What it does NOT contain

- Server logs or database logs (these are only on Supabase)
- Edge function runtime logs
- Your password, email, tokens, cookies, or API keys (all redacted)
- What you typed into text fields
- Request or response body data
- Other users' data

## Where does the code live?

All 4 files are in `src/core/debug/`:
- `useDebugActivation.ts` — listens for the typed sequence
- `useDebugCapture.ts` — rolling in-memory buffer of events
- `debugSerializer.ts` — builds and redacts the JSON artifact
- `DebugReportButton.tsx` — the floating button UI

One line in `src/App.tsx` renders the button globally.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bug icon doesn't appear after typing nfsdebug | Make sure you're NOT clicking inside a text field first. Click on the page background, then type. |
| Bug icon never appears at all | Check that `VITE_DEBUG_REPORT_ENABLED=true` is set in env vars and the app was rebuilt/redeployed. |
| File downloads but is empty/small | The file still has browser + meta info. Console errors only appear if errors actually happened. |
