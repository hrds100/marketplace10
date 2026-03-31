# Session Log

## Required reading (do NOT recreate these)
- docs/MESSAGING.md        - full inbox + chat flow
- docs/COMMUNICATIONS.md   - WhatsApp + notifications
- docs/AGENT_INSTRUCTIONS.md - operating rules
- docs/roles/              - landlord vs tenant logic
- docs/CHANGELOG.md        - everything fixed before
- docs/N8N_WHATSAPP_WORKFLOW.md - n8n specifics

Only COPILOT.md and SESSION_LOG.md are new files.

---

## 2026-03-27 - Inbox + WhatsApp Pipeline

### Fixed today
1. NDA modal missing on mobile (InboxPage.tsx:342)
   - Root cause: mobile branch returned early, modal only in desktop path
   - Fix: added AgreementModal to mobile selectedThread branch
   - Commit: 02cc63e, Playwright tested (mobile 390x844)
2. Empty recipient_phone in landlord reply webhook (ChatWindow.tsx:270)
   - Root cause: tenant profile whatsapp=null, contactPhone=""
   - Fix: ChatWindow now queries other party's profile as fallback
   - Commit: 7ecc483
3. n8n guard: "Phone Valid?" IF node added to BrwfLUE2LPj9jovR
   - Blocks empty/invalid phone before GHL search
   - Prevents wrong GHL contact enrollment
4. Test data cleaned: all threads/messages/profiles/properties deleted
5. n8n enrolled into GHL workflow with no trigger -
   switched to direct GHL Conversations API
6. contactPhone mapped wrong side - now maps tenant
   phone when landlord is viewing (InboxPage.tsx:171)
7. useInquiry.ts - role guard + webhook removal (DONE - 2026-03-27)
   - Root cause: any user (incl. landlords/admins) could create inquiry threads
     and auto-message triggered n8n webhook
   - Fix: role guard at lines 24-27 blocks landlords (@nfstay.internal) + admins
   - Fix: n8n webhook fully removed from useInquiry.ts, only fires from ChatWindow
   - Playwright: 2/2 pass - landlord blocked (URL check), operator allowed (auto-message visible)
   - Code verified by PILOT (read actual file, not just Opus summary)
8. Bug B - WhatsApp "Open Chat" button 404 + wrong thread (DONE - 2026-03-27)
   - Root cause: n8n set magic_link_url = ?source=wa (no thread ID), MagicLoginPage
     discarded thread param on no-token path → tenant got 404 or landed on wrong page
   - Fix 1: MagicLoginPage.tsx lines 13-16 - read thread param, pass to /dashboard/inbox?thread=X
   - Fix 2: n8n BrwfLUE2LPj9jovR - magic_link_url now ?thread=${thread_id} from webhook payload
   - Playwright: 3/3 pass (thread preserved, magic link still works, no-param redirect)
   - HAWK verified: MagicLoginPage.tsx lines 14-16 correct, token path untouched

### In progress
Bug C: Landlord → Tenant WhatsApp notification broken (recipient_phone always empty)

Root cause (confirmed by 4-agent investigation 2026-03-27):
1. chat_threads has NO contact_phone column → thread.contactPhone = undefined always
2. Fallback: ChatWindow queries profiles.whatsapp using anon client → RLS blocks cross-user read → null
3. recipient_phone: "" fires to n8n → Phone Valid? guard blocks → workflow stops → no WhatsApp

Fix pending (Opus prompt ready):
- n8n BrwfLUE2LPj9jovR: add "Lookup Tenant Phone" HTTP node using operator_id + Supabase service role
- New edge function get-thread-phone: server-side phone lookup bypassing RLS
- ChatWindow.tsx: replace anon-client fallback with edge function call

### Open bugs
C. Landlord reply → Tenant WhatsApp not delivered
   - confirmed root cause above
   - fix prompt ready to paste to Opus

C. Tenant inbox shows 0/month in earnings calculator - LOW PRIORITY
   - confirmed test data issue, no code fix needed

---

## 2026-03-27 (session 2) - Inbox UI + Mobile Audit

### 3-round audit (11 agents) completed - bugs confirmed, prompt ready

Bug list confirmed by 3 rounds of parallel agent investigation:

1. CRITICAL - Admin blocked from Inquire Now (useInquiry.ts:25)
   - isAdmin || isLandlordAccount guard → hugo@nfstay.com gets blank inbox
   - Fix: remove `isAdmin ||` - only block @nfstay.internal accounts

2. HIGH - Inquire Now → right panel (earnings slider) never opens (InboxPage.tsx:80)
   - setShowDetails(false) in useInquiry effect hides the panel immediately
   - Fix: change to setShowDetails(true)

3. HIGH - Messages flash LEFT then jump to correct position (ChatWindow.tsx loadMessages)
   - mapRow called before user.id available from auth → all get senderId='other' → all LEFT
   - 3s later auth loads, re-render → correct positions
   - Fix: add `if (!user?.id) return;` guard at top of loadMessages useCallback

4. HIGH - Mobile: zero way to see property details panel
   - InboxInquiryPanel never rendered on mobile; details button hidden with !isMobile
   - Fix: add Info icon button to mobile ChatWindow header + Drawer (vaul bottom-sheet)
   - Drawer component already exists at src/components/ui/drawer.tsx

5. HIGH - Mobile keyboard zoom: textarea text-sm (14px) triggers iOS auto-zoom
   - Both textareas in ChatWindow have text-sm → iOS zooms on focus
   - Fix: change both to text-base (16px)

6. HIGH - Mobile viewport meta missing maximum-scale=1 (index.html:5)
   - iOS can freely zoom the viewport
   - Fix: add maximum-scale=1 to viewport meta content

7. MEDIUM - InboxInquiryPanel h-full blocks drawer usage (InboxInquiryPanel.tsx:200)
   - Fix: change h-full to h-auto in outer wrapper div

### Prompt ready
Full Opus prompt written covering all 7 bugs + 5 Playwright tests.
See chat for the complete paste-ready prompt block.

### Key files for this fix
src/hooks/useInquiry.ts (line 25)
src/pages/InboxPage.tsx (line 80, mobile render, Drawer import)
src/components/inbox/ChatWindow.tsx (loadMessages guard, textarea font-size, Info button)
src/components/inbox/InboxInquiryPanel.tsx (line 200: h-full → h-auto)
src/components/ui/drawer.tsx (already exists - no changes needed)
index.html (line 5: viewport meta)

### Key files
src/pages/InboxPage.tsx
src/components/inbox/ChatWindow.tsx
src/components/inbox/AgreementModal.tsx
Supabase tables: chat_messages, chat_threads,
                 profiles, properties
n8n: BrwfLUE2LPj9jovR (landlord-replied workflow)
GHL location: eFBsWXY3BmWDGIRez13x
GHL sender: +44 7476 368123
GHL approved WA template: nfstay_tenant_new_message
