# BP PDF scraper

Pulls the 125+ PDFs from BP's web UI that the REST API can't reach (records past the 223-listing-cap). Runs locally on your machine, uses your BP browser session.

## You don't need to wait for PRs to merge

This scraper is a local Node script — Vercel deploys don't touch it. To run any branch's version:

```powershell
cd C:\Users\HP\Documents\marketplace10
git fetch origin
git checkout <branch-name>     # e.g. feat/bp-pdf-scraper-id-prefix-metadata
cd scripts\bp-pdf-scraper
node scrape.mjs --scrape --debug --force --limit=1
```

Only changes to the React `/agreements` UI need merging + Vercel rebuild.

## Filename + metadata

PDFs save as `<view_id>_<sanitized doc name>.pdf` — the id prefix prevents collisions when two proposals share a company name. Example: `2779285_laburnum street - Hitesh.pdf`.

While the script is on the BP Activity page it also scrapes:

- **docName** (`Document for {NAME}` → title field)
- **dateCreated** → `bp_date_created`
- **dateSent** → `date_sent`
- **dateSigned** → `signed_at`
- **recipientEmail / recipient** → `recipient_email`, `recipient_name`
- **sender** → `signer_name`
- **amount + currency** → `amount`, `currency`

All of it lands in `pdfs/_manifest.json`, then `--upload` writes it onto the agreement row.

## One-time setup

```bash
cd scripts/bp-pdf-scraper
npm install
npx playwright install chromium
cp .env.example .env
# Open .env and paste your SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard → Settings → API → service_role)
```

## Run it

```bash
# 1. Log into BP once — a Chromium window opens, log in normally, then come back to terminal and press Enter
node scrape.mjs --login

# 2. Scrape PDFs for every ID in ids.json (currently has your 161 Accepted list)
node scrape.mjs --scrape

# 3. Upload PDFs + update agreement rows
node scrape.mjs --upload
```

Or all at once:

```bash
node scrape.mjs --login --scrape --upload
```

## Adding more IDs

Edit `ids.json` and paste view_ids into the right status bucket:

```json
{
  "accepted":    [ "2779285", "2722826" ],
  "outstanding": [],
  "draft":       [],
  "lost":        []
}
```

The status here becomes the row's status after upload.

## How it gets a PDF

For each view_id:

1. Opens `betterproposals.io/2/proposals/edit?id={view_id}` (admin view — uses your saved session)
2. Looks for any Download / Export PDF button. Clicks it if present, captures the download.
3. If no button found, falls back to `view?id=...` + Playwright's built-in `page.pdf()` which renders the page to PDF.

If both fail, the ID logs as `✗ {id} empty` and is skipped. Re-run `--scrape` later and it'll retry only the missing ones (existing PDFs in `pdfs/` are kept).

## Files

- `state.json` — your saved BP login session. Gitignored.
- `pdfs/` — downloaded PDFs. Gitignored.
- `.env` — your service-role key. Gitignored.
- `ids.json` — the IDs to fetch. Commit edits to this.
