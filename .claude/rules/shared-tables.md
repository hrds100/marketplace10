# Shared Tables — Auto-loaded when editing table contracts

## HARD LAW
No column rename, removal, or type change on a shared table without
updating ALL readers in the same PR. No exceptions.

## select('*') is FORBIDDEN
On any shared table, use explicit column lists:
```typescript
// BAD
const { data } = await supabase.from('profiles').select('*')

// GOOD
const { data } = await supabase.from('profiles').select('id, name, email, tier, whatsapp_verified')
```

## Table Ownership

| Table | Owner | May READ | May WRITE |
|-------|-------|---------|-----------|
| profiles | core/auth | All features | auth, settings, admin-users, wallet, landlord |
| properties | features/deals | deals, deal-detail, deal-submit, admin-deals, gate, inquiry | deal-submit, admin-deals, gate (outreach_sent only) |
| inquiries | features/inquiry | gate, landlord, admin-gate | inquiry, gate (authorized flag), landlord (nda_signed) |
| notifications | core (shared bus) | notifications, admin-notifications | Any feature may INSERT |
| crm_deals | features/crm | deal-detail | crm, deal-detail (INSERT) |
| landlord_invites | features/inquiry | landlord-login | inquiry (INSERT), landlord-login (UPDATE used) |
| aff_profiles | features/affiliates | admin-affiliates, payment | affiliates, admin-affiliates |
| aff_events | features/affiliates | admin-affiliates | affiliates, payment |

## Schema Change Process
1. Update contract in core/contracts/tables.ts
2. List ALL features that read or write the table
3. Run tests for all impacted features
4. If BREAKING (rename/remove/type change): update all readers in same PR
5. Blast radius: HIGH or CORE_CHANGE
