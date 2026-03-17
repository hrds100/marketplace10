# NFStay — Boundaries

> What belongs to NFStay. What belongs to marketplace10. What is shared. What must never be coupled.
> **Read this file on every NFStay task.** This is the file that stops accidental cross-wiring.

---

## 1. THE RULE

NFStay is a **separate apartment in the same building.**

- It has its own rooms (tables, routes, components, Edge Functions, n8n workflows).
- It shares the building's foundation (Supabase, Vercel, auth, UI kit).
- It does not run extension cords into the other apartments.
- The other apartments do not run extension cords into NFStay.

---

## 2. WHAT BELONGS TO NFSTAY

Everything prefixed with `nfs_` or in an `nfstay/` directory:

| Layer | NFStay owns |
|-------|------------|
| **Database** | All `nfs_*` tables (11 tables) |
| **Frontend routes** | `app/(nfstay)/*` |
| **Components** | `components/nfstay/*` |
| **Hooks** | `hooks/nfstay/*` |
| **Services/lib** | `lib/nfstay/*` |
| **Edge Functions** | All `nfs-*` functions (9 functions) |
| **n8n workflows** | All `nfs-*` workflows (9 workflows) |
| **Storage buckets** | `nfs-images`, `nfs-branding` |
| **Documentation** | `docs/nfstay/*` |
| **Domains** | `nfstay.app`, `*.nfstay.app` |

---

## 3. WHAT BELONGS TO MARKETPLACE10

Everything NOT prefixed with `nfs_` or in `nfstay/`:

| Layer | marketplace10 owns |
|-------|-------------------|
| **Database** | `profiles`, `properties`, `crm_deals`, `chat_threads`, `chat_messages`, `modules`, `lessons`, `user_progress`, `user_achievements`, `user_favourites`, `message_templates`, `landlord_invites`, `agreement_acceptances`, `notifications`, `ai_settings`, `admin_audit_log`, `otps`, `inquiries` |
| **Frontend routes** | `app/(hub)/*`, `/dashboard/*`, `/admin/*`, `/inbox/*`, `/university/*` |
| **Components** | `components/` (except `components/nfstay/` and `components/ui/`) |
| **Hooks** | `hooks/` (except `hooks/nfstay/`) |
| **Edge Functions** | `landlord-magic-login`, `claim-landlord-account`, `send-email` |
| **n8n workflows** | All non-`nfs-` workflows |
| **Documentation** | `docs/` (except `docs/nfstay/`) |
| **Domains** | `hub.nfstay.com` |

---

## 4. WHAT IS SHARED INFRASTRUCTURE

Neither module "owns" these — they are building-level services:

| Shared thing | Details |
|-------------|---------|
| **Supabase Auth** | `auth.users` — managed by Supabase |
| **`profiles` table** | Identity bridge — both modules read it. marketplace10 manages it. NFStay never writes to it. |
| **`notifications` table** | Both modules INSERT. Neither modifies schema. |
| **Supabase project** | Same database, same connection, same RLS engine |
| **Vercel project** | Same deployment, same build pipeline |
| **n8n instance** | Same server — workflows coexist with prefixes |
| **GitHub repo** | Same repo, same CI pipeline |
| **UI components** | `components/ui/*` — shared Button, Modal, Input, etc. |
| **Auth hooks** | Shared Supabase auth utilities |
| **Tailwind config** | Same design tokens, colors, typography |
| **Google Maps API key** | Same key for both modules |
| **Middleware** | One file handles routing for both modules |

---

## 5. WHAT MUST NEVER BE COUPLED

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

## 6. HOW TO CHECK BOUNDARIES

Before any NFStay change, ask:

1. **Am I touching a non-`nfs_` table?** → Stop. Check if it's `profiles` (read OK) or `notifications` (insert OK). Anything else → don't touch.
2. **Am I importing from a non-`nfstay/` directory?** → Only OK if it's `components/ui/`, shared auth, or shared utilities.
3. **Am I modifying middleware?** → Check that marketplace10 routing still works.
4. **Am I adding an env var?** → Use `NFS_` prefix for NFStay-specific vars.
5. **Am I creating a migration?** → Include `nfs_` in the filename.
6. **Am I creating an n8n workflow?** → Use `nfs-` prefix in the name.

---

## 7. EXTRACTION TEST

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
