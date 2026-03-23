# Investment Module - Boundaries

> What the investment module owns, what it shares, and what it must never touch.
> Read this on EVERY investment task.

---

## 1. THE MODEL

The investment module is a **feature set inside marketplace10**, not a separate module.
It uses the existing layout, sidebar, admin panel, and auth system.
It has its OWN database tables and n8n workflows, but shares everything else.

Unlike nfstay booking (completely isolated), the invest module:
- Lives in `src/pages/invest/` (existing directory)
- Uses the existing `DashboardLayout`, `DashboardSidebar`, `InvestSubNav`
- Extends the existing admin panel (new admin pages in `src/pages/admin/`)
- Shares `profiles` table (read + write - it's the same users)
- Shares `notifications` table
- Shares `admin_audit_log`

---

## 2. WHAT THE INVESTMENT MODULE OWNS

| Layer | Invest owns |
|-------|------------|
| **Database** | All `inv_*` tables, all `aff_*` tables |
| **Frontend pages** | `src/pages/invest/*` |
| **Mock data** | `src/data/investMockData.ts` |
| **Admin pages** | New invest admin pages (to be created in `src/pages/admin/invest/`) |
| **n8n workflows** | All `inv-*` and `aff-*` workflows |
| **Edge Functions** | All `inv-*` and `aff-*` functions (if needed) |

---

## 3. WHAT IS SHARED (USE CAREFULLY)

| Shared resource | How invest uses it |
|----------------|-------------------|
| `profiles` | Read AND write - same users invest and do deals |
| `notifications` | INSERT - send investment notifications |
| `admin_audit_log` | INSERT - log admin actions |
| `DashboardLayout` | Uses as-is - no modifications |
| `DashboardSidebar` | Already has invest menu - no modifications unless Hugo requests |
| `InvestSubNav` | Already exists - no modifications unless Hugo requests |
| `components/ui/*` | Use freely - shared UI kit |
| Auth hooks | Use freely - same auth |
| `AffiliatesPage` | This page already exists for subscription affiliates. Investment commissions will be added to it. |

---

## 4. WHAT MUST NOT BE TOUCHED

| Do NOT touch | Why |
|-------------|-----|
| `src/pages/DealsPageV2.tsx` | Deals page - separate feature |
| `src/pages/InboxPage.tsx` | Inbox - separate feature |
| `src/pages/CRMPage.tsx` | CRM - separate feature |
| `src/pages/UniversityPage.tsx` | University - separate feature |
| Any `nfs_*` table | nfstay booking module - Tajul's territory |
| Any existing n8n workflow without `inv-` or `aff-` prefix | marketplace10 or nfstay workflows |
| `middleware.ts` | Routing for all modules - requires Hugo approval |
| `supabase/functions/` (existing) | Edge functions for other features |

---

## 5. NAMING CONVENTIONS

| What | Prefix | Example |
|------|--------|---------|
| Investment tables | `inv_` | `inv_properties`, `inv_shareholdings` |
| Affiliate tables | `aff_` | `aff_profiles`, `aff_commissions` |
| n8n workflows (investment) | `inv-` | `inv-share-purchase`, `inv-rent-sync` |
| n8n workflows (affiliate) | `aff-` | `aff-commission-subscription`, `aff-payout-batch` |
| Edge Functions | `inv-` or `aff-` | `inv-process-claim` |
| Env vars (if needed) | `VITE_INV_` | `VITE_INV_TREASURY_WALLET` |

---

## 6. ADMIN EXTENSIONS

New admin pages go in `src/pages/admin/invest/` (new directory).
They are registered in `src/App.tsx` under the existing admin routes.
They use the existing `AdminLayout` and `AdminGuard`.
All admin mutations log to `admin_audit_log`.

---

*For the full project boundaries, see `docs/AGENT_INSTRUCTIONS.md`.*
*For nfstay booking boundaries, see `docs/nfstay/BOUNDARIES.md`.*
