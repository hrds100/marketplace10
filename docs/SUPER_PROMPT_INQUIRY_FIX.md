# SUPER PROMPT: Fix Inquiry Pipeline — Deals Grid WhatsApp + Email Flow

> **DEPRECATED (2026-04-01):** This prompt describes the OLD automatic landlord notification flow.
> The current flow is ADMIN-GATED: tenant inquiries stop in Outreach > Tenant Requests.
> The landlord is NOT contacted until admin chooses NDA, NDA + Claim, or Direct.
> See `docs/QUICK_LIST_FLOW.md` and `docs/N8N_WHATSAPP_WORKFLOW.md` for the current flow.
> Do NOT use this prompt to build or restore the old auto-notification behavior.

---

## YOUR IDENTITY

You are Opus — the coder and builder for NFsTay.
Read `docs/AGENT_INSTRUCTIONS.md` before anything.
Hugo is non-technical — never ask him to run commands. You run everything.

## MODE: FIX MODE (TDD cycle, strict order)

1. INVESTIGATE — read files, query endpoints, find root cause, show evidence
2. WRITE FAILING TEST FIRST — must fail before you fix anything
3. FIX — minimal change only, no unrelated edits, no refactoring
4. RUN ALL TESTS — zero failures, zero regressions
5. DEPLOY if needed — after every edge function deploy, patch verify_jwt=false immediately
6. PLAYWRIGHT TEST — mandatory before marking done
7. SHARE CLICKABLE URL — point to exact page that changed, say "go check"

---

## THE SYSTEM: TWO SEPARATE COMMUNICATION PATHS

NFsTay has two independent messaging systems. They share the same GHL (GoHighLevel) WhatsApp delivery layer and `landlord_invites` table, but are otherwise separate. DO NOT merge them.

### Path A: Web Inbox (chat threads) — WORKING, DO NOT TOUCH

```
Operator opens /dashboard/inbox → useInquiry.ts creates chat_thread
  → Operator writes message in ChatWindow
  → ChatWindow.tsx POSTs to n8n /webhook/inbox-new-message
  → n8n workflow J6hWjodwJlqXHme1:
     Search/create GHL contact → generate magic token → insert landlord_invites
     → set GHL custom fields (magic_link_url, property_reference)
     → check if landlord replied before
     → No replies: remove from GHL workflow 67250bfa, wait 3s, re-enroll (first contact 3-msg sequence)
     → Has replies: remove from GHL workflow 0eb4395c, wait 3s, re-enroll (single message)
  → GHL sends WhatsApp template to landlord
  → Landlord clicks magic link → hub.nfstay.com/inbox?token=XXX → auto-login → sees chat
```

Tables used: `chat_threads`, `chat_messages`, `landlord_invites`, `agreement_acceptances`
n8n workflows: J6hWjodwJlqXHme1 (inbox-new-message), BrwfLUE2LPj9jovR (inbox-landlord-replied)

### Path B: Deals Grid Inquiry (WhatsApp/Email buttons) — THIS IS WHAT YOU'RE FIXING

```
Tenant clicks WhatsApp on PropertyCard / DealDetail / InquiryPanel
  → wa.me/447476368123 opens (NFStay company number, NOT landlord's personal number)
  → process-inquiry edge function fires in background:
     1. Creates inquiry row in DB (inquiries table)                    ✅ WORKING
     2. Creates landlord_invites row (magic token, thread_id=null)     ✅ WORKING
     3. Sends lister email via send-email edge function                ✅ WORKING
     4. Sends tenant auto-reply WhatsApp via n8n inquiry-tenant-reply  ❌ BROKEN
     5. Sends landlord WhatsApp via n8n inquiry-lister-whatsapp        ⚠️ HAS GAPS
     6. Sends tenant confirmation email                                ✅ WORKING
```

Tables used: `inquiries`, `landlord_invites`
n8n workflows: YMjVISVnUb7AxqXU (inquiry-tenant-reply), pZ6EOZ1fkj1WcDXs (inquiry-lister-whatsapp v5)

### Payment Gate (before tenant can contact)

Free users see a GHL payment iframe in InquiryPanel before they can contact any landlord:
- £5 trial fee (charged immediately)
- £67/month starts after 3 days
- InquiryPanel polls Supabase profiles.tier every second for up to 45 seconds
- Once tier changes from 'free' to 'monthly', the Send button unlocks

---

## WHAT'S BROKEN (4 issues to fix)

### Issue 1: Tenant auto-reply WhatsApp skips silently
**File:** `supabase/functions/process-inquiry/index.ts` line 147
**Bug:** `if (channel === 'whatsapp' && tenant_phone)` — skips when `tenant_phone` is empty string
**Why empty:** Frontend passes `user?.user_metadata?.whatsapp || ''` — empty for users who never set their WhatsApp number in profile settings
**Impact:** Tenant clicks WhatsApp, sends message to NFStay, but never gets the auto-reply ("Your inquiry has been received and we have notified the Landlord/Agent...")
**Fix:** Add profiles.whatsapp lookup as fallback. Change condition to `if (channel === 'whatsapp')` so it always fires. Pass resolved phone to n8n.

### Issue 2: Reference number is full UUID (36 chars)
**Files:** 4 frontend files contain the pre-filled WhatsApp/email message
**Current:** `Reference no.: 1bfbd8e9-6498-42c0-a59c-0a0509970eef`
**Wanted:** Max 5 chars, e.g. `Reference no.: 1BFBD`
**Fix:** Replace `listing.id` with `listing.id.slice(0, 5).toUpperCase()` in message templates

Files to change:
- `src/components/PropertyCard.tsx` line ~119
- `src/components/InquiryPanel.tsx` line ~63
- `src/pages/DealDetail.tsx` line ~120
- `src/components/EmailInquiryModal.tsx` line ~35

### Issue 3: DealDetail passes slug as property_id
**File:** `src/pages/DealDetail.tsx` line ~124
**Bug:** Uses `id` from `useParams()` which can be a slug (e.g. `brr-skelton-bf3f36da`), not a UUID
**Impact:** process-inquiry `.eq('id', property_id)` query returns 404 for slug-based URLs
**Fix:** Change `property_id: id` to `property_id: (listing?.id as string) || id`

### Issue 4: Old n8n workflow must be deactivated
**Workflow:** Y0HwT8eAkZSSy3JU ("NFsTay - Notify Landlord New Inquiry")
**Problem:** Sends direct WhatsApp message instead of using GHL workflow enrollment
**Conflict:** Shares webhook path `inquiry-lister-whatsapp` with the correct v5 workflow (pZ6EOZ1fkj1WcDXs)
**Evidence:** v5 is the one receiving webhooks (verified), but having two active on same path is risky
**Fix:** Deactivate Y0HwT8eAkZSSy3JU via n8n API

---

## LANDLORD NOTIFICATION FLOW (how it should work)

The n8n workflow `pZ6EOZ1fkj1WcDXs` (v5) handles landlord WhatsApp notifications. It follows the GHL enrollment pattern.

### is_cold decision rule (UPDATED 2026-03-30):
```
is_cold = (lister_type === 'deal_sourcer') AND (!listerEmail) AND (never contacted before)
```
- Landlords: ALWAYS is_cold=false (single message)
- Agents: ALWAYS is_cold=false (single message)
- Deal sourcers with email (self-registered): ALWAYS is_cold=false
- Deal sourcers without email (admin Quick List): is_cold=true FIRST TIME ONLY

### Deal sourcer first contact (cold = true):
```
process-inquiry/polling POSTs to /webhook/inquiry-lister-whatsapp with:
  { phone, lister_name, property_name, lead_url, magic_token, is_cold: true }
  → v5 searches GHL for phone → NOT found → creates GHL contact
  → Sets custom fields: property_reference, lead_url, magic_link_url (?token=XXX)
  → Removes from workflow 67250bfa, waits 3s, re-enrolls
  → GHL sends multi-step sequence:
     MSG 1: "Someone is interested in your property [title]. Is it still available?"
     (waits for reply)
     MSG 2: Introduction about nfstay
     MSG 3: Audio message
     MSG 4: Magic link to view the lead
```

### All other listers / returning deal sourcer (cold = false):
```
  → v5 searches GHL → creates or finds contact
  → Updates custom fields with new magic link + new property reference
  → Removes from workflow 0eb4395c, waits 3s, re-enrolls
  → GHL sends single message: "New inquiry about [property]. Reply here: [link]"
```

### Both channels always fire:
- WhatsApp: via GHL workflow enrollment (above)
- Email: via send-email edge function with magic link (if lister has email on file)
- Both sent on every inquiry, not one or the other

### v5 workflow has remove-then-re-enroll pattern (FIXED 2026-03-30):
- DELETE from GHL workflow, Wait 3s, POST to re-enroll
- Prevents GHL silently skipping repeat enrollments for same contact

---

## FILES TO MODIFY (5 files + 1 n8n workflow)

| File | Lines | Change |
|------|-------|--------|
| `src/components/PropertyCard.tsx` | ~119 | Shorten ref: `listing.id.slice(0, 5).toUpperCase()` |
| `src/components/InquiryPanel.tsx` | ~63 | Shorten ref: `listing.id.slice(0, 5).toUpperCase()` |
| `src/pages/DealDetail.tsx` | ~120, ~124 | Shorten ref + fix property_id to use `listing?.id` |
| `src/components/EmailInquiryModal.tsx` | ~35 | Shorten ref: `listing.id.slice(0, 5).toUpperCase()` |
| `supabase/functions/process-inquiry/index.ts` | ~145-155 | Add profiles.whatsapp lookup, remove tenant_phone gate |
| n8n workflow Y0HwT8eAkZSSy3JU | - | Deactivate via API |

## FILES TO READ FIRST (do not modify unless noted)

- `docs/AGENT_INSTRUCTIONS.md` — your operating rules
- `docs/COMMUNICATIONS.md` — full messaging architecture. **UPDATE THIS AFTER FIXING:** change gaps 3-6 in the Known Gaps table (line ~363) from "Fix planned" to "Fixed", and change line ~618 from "PARTIALLY BROKEN" to "LIVE"
- `docs/INTEGRATIONS.md` lines 95-138 — GHL workflow routing + custom field IDs
- `docs/CODE_FLOWS.md` — maps every user action to files and services. **UPDATE** the "BROKEN" entries to reflect fixes
- `src/components/inbox/CLAUDE.md` — locked rules for inbox (DO NOT TOUCH inbox)

## DO NOT TOUCH

- Anything in `src/components/inbox/` — the inbox system works, leave it alone
- `src/hooks/useInquiry.ts` — creates chat threads for inbox, not related to this task
- Any n8n workflow except Y0HwT8eAkZSSy3JU (deactivate only)
- GHL configuration — templates and workflows are set up correctly
- `vite.config.ts`, `src/main.tsx` — crash risk, never touch

---

## CREDENTIALS (check ~/.claude/projects/-Users-hugo/memory/ for all keys)

| What | Where |
|------|-------|
| Supabase project | asazddtvjvmckouxcmmo |
| Supabase service role | In memory: supabase_credentials.md |
| n8n API key | In memory: n8n_credentials.md |
| n8n base URL | https://n8n.srv886554.hstgr.cloud |
| GHL PIT token | REDACTED_GHL_PIT_TOKEN |
| GHL location ID | eFBsWXY3BmWDGIRez13x |
| Resend API key | In memory: reference_resend.md |
| Test user (paid) | hugords100+15@gmail.com / TestNfstay2026! |
| NFStay WhatsApp | +44 7476 368123 (447476368123) |

## GHL CUSTOM FIELD IDS

| Field ID | Name | Purpose |
|----------|------|---------|
| Z0thvOTyoO2KxTMt5sP8 | property_reference | Property title in WhatsApp template |
| gWb4evAKLWCK0y8RHp32 | magic_link_url | `?token=XXX` — GHL template prepends base URL |
| cdGXOwTk71lXoyLMMeiB | lead_url | Full URL to lead page |
| QIc7FR6U3OGNEhdk7LoY | first_contact_sent | Tracks if landlord was contacted before |

## GHL WORKFLOW IDS (never change these)

| ID | Name | When used |
|----|------|-----------|
| 67250bfa-e1fc-4201-8bca-08c384a4a31d | 1-landlord_enquiry | First contact with cold landlord |
| 0eb4395c-e493-43dc-be97-6c4455b5c7c4 | 2-Tenant to Landlord | Subsequent messages to warm landlord |
| 9b826037-0562-4e10-9bd8-d9d488b719b6 | 3-Landlord to Tenant | Landlord replies to operator |

## N8N WORKFLOW IDS

| ID | Name | Webhook path | Status |
|----|------|-------------|--------|
| YMjVISVnUb7AxqXU | Tenant Inquiry Auto-Reply | inquiry-tenant-reply | ACTIVE, working |
| pZ6EOZ1fkj1WcDXs | Inquiry Lister WhatsApp v5 | inquiry-lister-whatsapp | ACTIVE, working |
| Y0HwT8eAkZSSy3JU | Notify Landlord (OLD) | inquiry-lister-whatsapp | ACTIVE — **DEACTIVATE THIS** |
| J6hWjodwJlqXHme1 | New Message (inbox) | inbox-new-message | ACTIVE, DO NOT TOUCH |
| BrwfLUE2LPj9jovR | Landlord Replied (inbox) | inbox-landlord-replied | ACTIVE, DO NOT TOUCH |
| LqWhsAcWyOjS489q | Notify Admin New Deal | notify-admin-new-deal | ACTIVE, working |

---

## TDD VERIFICATION PLAN

### Layer 1 — Static code verification
```bash
npx tsc --noEmit  # zero errors
grep -n "listing.id.slice(0, 5)" src/components/PropertyCard.tsx src/components/InquiryPanel.tsx src/pages/DealDetail.tsx src/components/EmailInquiryModal.tsx  # 4 matches
grep -n "if (channel === 'whatsapp')" supabase/functions/process-inquiry/index.ts  # no tenant_phone gate
```

### Layer 2 — Edge function live test
```bash
# Sign in as test user, POST to process-inquiry with empty tenant_phone
# Confirm it returns 200 (not skipping)
# Check n8n execution log: inquiry-tenant-reply should fire
```

### Layer 3 — n8n webhook tests
```bash
# Confirm Y0HwT8eAkZSSy3JU is inactive
# POST to /webhook/inquiry-lister-whatsapp — confirm v5 (pZ6EOZ1fkj1WcDXs) handles it
# POST to /webhook/inquiry-tenant-reply — confirm YMjVISVnUb7AxqXU handles it
```

### Layer 4 — Playwright e2e test
```bash
npx playwright test e2e/inquiry-pipeline-e2e.spec.ts
# Confirms: process-inquiry called, wa.me/447476368123 opened (not landlord number)
```

### Layer 5 — Database integrity
```sql
SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 1;  -- row exists
SELECT * FROM landlord_invites ORDER BY created_at DESC LIMIT 1;  -- magic_token not empty
```

### Layer 6 — Manual verification
Go to hub.nfstay.com/dashboard/deals as paid user, click WhatsApp on any property:
- Message shows 5-char reference (e.g. `1BFBD`)
- Auto-reply WhatsApp arrives within seconds
- Landlord gets GHL template WhatsApp (not a plain text message)

---

## SIGN-OFF FORMAT

When all layers pass:
```
Tested and working. Check it here: [hub.nfstay.com/dashboard/deals](https://hub.nfstay.com/dashboard/deals)

Changes:
- [x] Tenant auto-reply fires for all WhatsApp inquiries (profiles.whatsapp fallback)
- [x] Reference number shortened to 5 chars
- [x] DealDetail property_id fixed (uses listing UUID, not URL slug)
- [x] Old n8n workflow Y0HwT8eAkZSSy3JU deactivated
- [x] All 6 test layers green
```

=== END OF SUPER PROMPT ===
