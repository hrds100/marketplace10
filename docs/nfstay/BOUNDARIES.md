# NFStay — Boundaries

> What belongs to NFStay. What belongs to marketplace10. What is shared. What must never be touched.
> **Read this file on every NFStay task.** This is the protection law.

---

## 1. NON-NEGOTIABLE PROTECTION RULES

**marketplace10 (hub.nfstay.com) is a live production system that generates revenue.**
**NFStay work must NEVER break, modify, or interfere with it.**

This is the most important rule in the entire NFStay documentation. Everything else is secondary.

If any task risks affecting hub.nfstay.com → STOP. Escalate to Hugo. No exceptions.

---

## 2. THE MODEL

NFStay is a **separate apartment in the same building.**

- It has its own rooms (tables, routes, components, Edge Functions, n8n workflows).
- It shares the building's foundation (Supabase, Vercel, auth, UI kit).
- It does not run extension cords into the other apartments.
- The other apartments do not run extension cords into NFStay.

---

## 3. WHAT BELONGS TO MARKETPLACE10 — DO NOT TOUCH

### Protected tables — never modify, alter, add columns, or write to these

| Table | NFStay access |
|-------|--------------|
| `profiles` | **Read-only.** Read `id`, `name`, `email`. Never write or add columns. |
| `properties` | **None.** This is marketplace10's property listings. NFStay uses `nfs_properties`. |
| `crm_deals` | **None.** |
| `chat_threads` | **None.** |
| `chat_messages` | **None.** |
| `modules` | **None.** |
| `lessons` | **None.** |
| `user_progress` | **None.** |
| `user_achievements` | **None.** |
| `user_favourites` | **None.** |
| `message_templates` | **None.** |
| `landlord_invites` | **None.** |
| `agreement_acceptances` | **None.** |
| `ai_settings` | **None.** |
| `admin_audit_log` | **None.** |
| `otps` | **None.** |
| `inquiries` | **None.** |
| `notifications` | **INSERT only.** NFStay may add notification rows. Never ALTER the table schema. |

### Protected invest module tables — NEVER touch

| Table | NFStay access |
|-------|--------------|
| `inv_properties` | **None.** Investment property listings. |
| `inv_orders` | **None.** Share purchase records. |
| `inv_shareholdings` | **None.** Who owns what shares. |
| `inv_payouts` | **None.** Rent distribution records. |
| `inv_proposals` | **None.** Governance proposals. |
| `aff_profiles` | **None.** Affiliate profiles. |
| `aff_commissions` | **None.** Commission ledger. |
| `aff_commission_settings` | **None.** Commission rate config. |
| `user_bank_accounts` | **None.** Bank details for payouts. |
| `payout_claims` | **None.** Payout requests. |
| `payout_audit_log` | **None.** Payout event log. |

### Protected code — marketplace10 owns these

| Layer | marketplace10 owns |
|-------|-------------------|
| **Marketplace pages** | `src/pages/` (except `src/pages/nfstay/`) |
| **Marketplace components** | `src/components/` (except `src/components/nfstay/` and `src/components/ui/`) |
| **Marketplace hooks** | `src/hooks/` (except `src/hooks/nfstay/`) |
| **Marketplace lib** | `src/lib/` (except `src/lib/nfstay/`) |
| **Documentation** | `docs/` (except `docs/nfstay/`) |
| **Domains** | `hub.nfstay.com` |

### Protected invest module code — NEVER touch

| Layer | Invest module owns |
|-------|-------------------|
| **Pages** | `src/pages/invest/*` |
| **Blockchain hooks** | `src/hooks/useBlockchain.ts`, `src/hooks/useInvestData.ts` |
| **Contract ABIs** | `src/lib/contractAbis.ts` |
| **Wallet provisioner** | `src/components/WalletProvisioner.tsx` |
| **Invest mock data** | `src/data/investMockData.ts` |
| **Invest documentation** | `docs/invest/*` |

**Why invest is called out separately:** On 2026-03-19, an AI agent building NFStay silently stripped all blockchain integration from the invest module — removing `useBlockchain`, `useInvestData`, and reverting invest pages to mock data. This was caught before merge but would have broken the live crypto features. See `docs/incidents/2026-03-19-nfstay-branch-marketplace10-overwrites.md`.

### Protected systems — never modify these

| System | Why |
|--------|-----|
| Any existing n8n workflow listed in the marketplace10 inventory below | marketplace10 automation — breaking it breaks the live site |
| Any existing Edge Function that does NOT start with `nfs-` | marketplace10 backend — breaking it breaks auth, email, etc. |
| Any existing Supabase secret (`RESEND_API_KEY`, `ADMIN_EMAIL`) | Shared secrets — overwriting them breaks marketplace10 email |
| Any existing n8n credential (especially Supabase credentials) | Shared credentials — modifying them breaks all workflows |
| GoHighLevel (anything) | marketplace10-only integration — NFStay never touches GHL |

### Protected n8n workflows — NEVER touch these

These are live marketplace10 workflows. Editing, deactivating, or duplicating them will break hub.nfstay.com.

| ID | Name | Webhook path | What it does |
|----|------|-------------|-------------|
| `3EDIQKRea9nGzxve` | marketplace10 -- Estimate Profit | `estimate-profit` | AI pricing for deal submissions |
| `CJzp4FAb2YX5uHqO` | marketplace10 -- Send OTP | `send-otp` | Phone verification on signup |
| `Zp9rlVCp4EJvrFMV` | marketplace10 -- Verify OTP | `verify-otp` | OTP code validation |
| `bI0vzTqncMjCs5jO` | marketplace10 -- Signup Welcome Email | `signup-welcome` | Welcome email on registration |
| `rSuLokg3MQp1bgdV` | marketplace10 -- AI Generate Listing | `ai-generate-listing` | AI property descriptions |
| `l2WiP9r4AIUaR9jK` | marketplace10 -- AI Lesson Content | `ai-lesson-content` | University lesson AI |
| `rFFWUhp5PvgGEIHV` | marketplace10 -- SamCart Webhook | `samcart` | Payment tier updates |
| `yXP6L90l7kSXWQbq` | marketplace10 -- CSV Bulk Properties | `csv-bulk-properties` | Bulk property import |
| `wsDjAdpWnjqnO7ML` | NFsTay -- GHL Payment -> Tier Update | `ghl-payment-success` | GHL payment processing |

### Protected marketplace10 inbox workflows — NEVER touch these

These handle the live inbox/messaging system on hub.nfstay.com. They are named "NFsTay --" because that's the brand, but they belong to marketplace10, NOT to the NFStay booking module.

| ID | Name | Webhook path | What it does |
|----|------|-------------|-------------|
| `BrwfLUE2LPj9jovR` | NFsTay -- Landlord Replied | `inbox-landlord-replied` | WhatsApp notification when landlord replies |
| `J6hWjodwJlqXHme1` | NFsTay -- New Message | `inbox-new-message` | WhatsApp notification for new messages |
| `UBuNLDn0mO0md39Y` | NFsTay -- Tenant New Message | `inbox-tenant-message` | WhatsApp notification for tenant messages |
| `LqWhsAcWyOjS489q` | NFsTay -- Notify Admin New Deal | `notify-admin-new-deal` | Admin notification on deal submission |
| `X93UQismVkONON2h` | NFsTay -- Notify Admin Edit | `notify-admin-edit` | Admin notification on deal edit |
| `XiMELMXjcbDZMu5A` | NFsTay -- University AI Chat | `ai-university-chat` | University AI chat responses |
| `184Jaq4jUer6PUMR` | NFsTay -- Airbnb Pricing Engine | `airbnb-pricing` | Airbnb pricing analysis |

### n8n protection rules for NFStay booking module agents

1. **NEVER edit, deactivate, rename, or duplicate any workflow listed above.**
2. **NEVER modify existing n8n credentials.** If NFStay needs a Supabase connection in n8n, create a NEW credential named "NFStay Supabase" — do not touch the existing one.
3. **NEVER use webhook paths that already exist.** All NFStay booking module webhooks must use the `nfs-` prefix (e.g., `nfs-hospitable-webhook`, `nfs-booking-notification`).
4. **NEVER create a workflow without the `nfs-` prefix** in its name.
5. **Before activating any n8n workflow**, verify its webhook path does not collide with any path listed above. Duplicate webhook paths cause silent failures — only one workflow receives the request.
6. **If unsure whether a workflow belongs to marketplace10 or NFStay booking module**, check this list. If it's not in this list and doesn't start with `nfs-`, assume it belongs to marketplace10 and don't touch it.

---

## 4. WHAT BELONGS TO NFSTAY

Everything prefixed with `nfs_` or in an `nfstay/` directory:

| Layer | NFStay owns |
|-------|------------|
| **Database** | All `nfs_*` tables (11 tables) |
| **Pages** | `src/pages/nfstay/*` |
| **Components** | `src/components/nfstay/*` |
| **Hooks** | `src/hooks/nfstay/*` |
| **Services/lib** | `src/lib/nfstay/*` |
| **Edge Functions** | All `nfs-*` functions in `supabase/functions/` |
| **n8n workflows** | All `nfs-*` workflows |
| **Storage buckets** | `nfs-images`, `nfs-branding` |
| **Documentation** | `docs/nfstay/*` |
| **Domains** | `nfstay.app`, `*.nfstay.app` |

---

## 5. WHAT IS SHARED INFRASTRUCTURE

Neither module "owns" these — they are building-level services:

| Shared thing | Details |
|-------------|---------|
| **Supabase Auth** | `auth.users` — managed by Supabase |
| **`profiles` table** | Identity bridge — both modules read it. marketplace10 manages it. NFStay reads only. |
| **`notifications` table** | Both modules INSERT. Neither modifies schema. |
| **Supabase project** | Same database, same connection, same RLS engine |
| **Vercel project** | Same deployment, same build pipeline |
| **n8n instance** | Same server — workflows coexist with prefixes |
| **GitHub repo** | Same repo, same CI pipeline |
| **UI components** | `components/ui/*` — shared Button, Modal, Input, etc. |
| **Auth hooks** | Shared Supabase auth utilities |
| **Tailwind config** | Same design tokens, colors, typography |
| **Google Maps API key** | Same key for both modules |
| **Middleware** | `middleware.ts` — one file handles routing for both modules |

---

## 6. WHAT MUST NEVER BE COUPLED

### Hard boundaries — violating these is a bug

| Rule | Why |
|------|-----|
| marketplace10 code must never import from `components/nfstay/`, `hooks/nfstay/`, or `lib/nfstay/` | NFStay must be extractable |
| NFStay code must never import from marketplace10-specific directories | Same reason — independence |
| NFStay must never add columns to `profiles` or any marketplace10 table | Shared tables are read-only |
| marketplace10 must never add columns to any `nfs_*` table | NFStay owns its schema |
| NFStay Edge Functions must never call marketplace10 Edge Functions | No hidden dependencies |
| marketplace10 n8n workflows must never reference `nfs_*` tables | No cross-module data coupling |
| NFStay must never use `VITE_GHL_FUNNEL_URL` or GoHighLevel | marketplace10-only integration |
| marketplace10 must never use Stripe directly | NFStay-only integration |

### Soft boundaries — allowed but be careful

| Rule | When it's OK |
|------|-------------|
| Both modules reading from `profiles` | Always OK — it's the shared identity table |
| Both modules inserting into `notifications` | Always OK — shared notification system |
| Sharing UI components from `components/ui/` | Always OK — that's what shared UI is for |
| Sharing auth hooks | Always OK — same auth system |
| Sharing Tailwind config | Always OK — same design system |

---

## 7. HOW TO CHECK BOUNDARIES

Before any NFStay change, ask:

1. **Am I touching a non-`nfs_` table?** → Stop. Check if it's `profiles` (read OK) or `notifications` (insert OK). Anything else → don't touch.
2. **Am I importing from a non-`nfstay/` directory?** → Only OK if it's `components/ui/`, shared auth, or shared utilities.
3. **Am I modifying middleware?** → STOP. Requires Hugo's approval. A mistake breaks hub.nfstay.com.
4. **Am I adding an env var?** → Use `NFS_` prefix for NFStay-specific vars. Never overwrite existing vars.
5. **Am I creating a migration?** → Include `nfs_` in the filename.
6. **Am I creating an n8n workflow?** → Use `nfs-` prefix in the name.
7. **Am I modifying a shared UI component?** → STOP. Create a wrapper in `components/nfstay/` instead.

---

## 8. NFSTAY SAFE ZONE

The agent may freely create, modify, and delete files in these locations:

| Location | What lives there |
|----------|-----------------|
| `src/pages/nfstay/` | NFStay pages (React Router) |
| `src/components/nfstay/` | NFStay components |
| `src/hooks/nfstay/` | NFStay hooks |
| `src/lib/nfstay/` | NFStay services, utils, types |
| `docs/nfstay/` | NFStay documentation |
| `supabase/functions/nfs-*/` | NFStay Edge Functions |
| `supabase/migrations/*nfs*` | NFStay database migrations |
| `n8n-workflows/nfs-*` | NFStay n8n workflow JSON exports |
| All `nfs_*` database tables | NFStay schema |
| `nfs-*` n8n workflows | NFStay automation |
| `nfs-images`, `nfs-branding` buckets | NFStay storage |

**If a file is NOT in this list → it is outside the safe zone → escalate before touching it.**

---

## 9. HUGO-APPROVAL-REQUIRED ITEMS

These items require Hugo's explicit approval before any agent proceeds:

| Item | Why |
|------|-----|
| **`middleware.ts`** | Routes traffic for hub.nfstay.com — mistake breaks production |
| **Any SQL DDL** (CREATE TABLE, ALTER TABLE, DROP) | Modifies live database — irreversible |
| **`supabase functions deploy`** | Deploys to live Supabase |
| **`supabase secrets set`** | Could overwrite marketplace10 secrets |
| **Activating n8n workflows** | Could process live traffic immediately |
| **`git push origin main`** | Deploys to production |
| **Any file outside the safe zone (§8)** | Could break marketplace10 |
| **New integrations not in `INTEGRATIONS.md`** | Architecture decision |
| **Changes to shared infrastructure** | Affects both modules |

---

## 10. EXTRACTION TEST

NFStay should be extractable to its own repo by:

1. Copying `app/(nfstay)/`, `components/nfstay/`, `hooks/nfstay/`, `lib/nfstay/`
2. Copying all `nfs_*` migration files
3. Copying `docs/nfstay/`
4. Copying `nfs-*` Edge Functions
5. Exporting `nfs-*` n8n workflows
6. Setting up its own Supabase project with the same schema
7. Deploying to its own Vercel project

If any step fails because of a hidden dependency on marketplace10 code → there's a boundary violation that needs fixing.

---

*End of NFStay Boundaries.*
