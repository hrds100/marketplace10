# NFsTay — Database Schema

All tables are in the `public` schema on Supabase project `asazddtvjvmckouxcmmo`.

## profiles
User accounts and preferences. Created on signup.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | PK | References auth.users |
| name | text | | User display name |
| whatsapp | text | | Phone number |
| photo_url | text | null | Avatar URL |
| tier | text | 'free' | free / monthly / yearly / lifetime |
| suspended | boolean | false | Admin can suspend users |
| whatsapp_verified | boolean | false | OTP verification status |
| samcart_cust_id | text | null | Legacy payment ID |
| notif_whatsapp_new_deals | boolean | true | Notification pref |
| notif_whatsapp_daily | boolean | true | Notification pref |
| notif_email_daily | boolean | true | Notification pref |
| notif_whatsapp_status | boolean | true | Notification pref |

**RLS**: Users read own row. Admin emails can read all rows.

## properties
Deal listings submitted by members.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| name | text | | Property ID (e.g. "Property #1234") |
| city | text | | |
| postcode | text | | |
| rent_monthly | integer | 0 | Monthly rent in £ |
| profit_est | integer | 0 | Estimated profit in £ |
| type | text | | e.g. "2-bed flat" |
| status | text | 'inactive' | pending / approved / live / on-offer / inactive |
| featured | boolean | false | Shown in featured strip |
| submitted_by | uuid | null | References auth.users |
| property_category | text | null | flat / house / hmo |
| bedrooms | integer | null | |
| bathrooms | integer | null | |
| garage | boolean | false | |
| deposit | integer | null | |
| agent_fee | integer | null | |
| sa_approved | text | 'awaiting' | yes / no / awaiting |
| contact_name | text | null | |
| contact_phone | text | null | |
| contact_whatsapp | text | null | |
| contact_email | text | null | |
| landlord_whatsapp | text | null | WhatsApp for inquiries |
| description | text | null | Public listing description |
| notes | text | null | Admin-only notes |
| photos | text[] | {} | Array of photo URLs |
| in_crm | boolean | false | Flagged when added to CRM |
| edit_requested_at | timestamptz | null | Set when member edits a live deal |
| pending_reason | text | null | |
| estimated_nightly_rate | integer | null | AI pricing |
| estimated_monthly_revenue | integer | null | AI pricing |
| estimated_profit | integer | null | AI pricing |
| estimation_confidence | text | null | High / Medium / Low |
| estimation_notes | text | null | AI notes |
| airbnb_search_url_7d | text | null | Generated Airbnb URL |
| airbnb_search_url_30d | text | null | Generated Airbnb URL |
| airbnb_search_url_90d | text | null | Generated Airbnb URL |
| ai_model_used | text | null | Model that generated pricing |
| image_url | text | null | Legacy single image |

**RLS**: Authenticated users can insert. Admin emails can update/delete. Public can select live/on-offer.

## crm_deals
User's personal CRM pipeline entries.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | | References auth.users |
| name | text | | Property name |
| city | text | | |
| postcode | text | | |
| rent | integer | 0 | |
| profit | integer | 0 | |
| type | text | | |
| stage | text | 'New Lead' | New Lead / Under Negotiation / Contract Sent / Follow Up / Closed / Portfolio |
| archived | boolean | false | |
| outsider_lead | boolean | false | |
| whatsapp | text | null | |
| email | text | null | |
| notes | text | null | |
| photo_url | text | null | Cached property image |
| property_id | text | null | Links to properties.id |
| last_contact | text | null | |

**RLS**: Users CRUD own rows (user_id = auth.uid()).

## user_favourites
Saved/bookmarked deals.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| property_id | text | |
| created_at | timestamptz | |

**RLS**: Users manage own rows.

## user_progress
University lesson completion tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| module_id | text | |
| lesson_id | text | |
| step_index | integer | -1 = lesson complete, >= 0 = step complete |
| completed | boolean | default true |
| completed_at | timestamptz | |

**RLS**: Users manage own rows.

## notifications
Platform notifications (currently admin-only).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| type | text | new_deal / deal_edit |
| title | text | |
| body | text | null |
| property_id | uuid | References properties.id |
| read | boolean | false |
| created_at | timestamptz | |

**RLS**: Users select own rows. Service role inserts (via n8n).
**Note**: Not in generated TypeScript types — accessed via `as any` casts.

## ai_settings
Admin-configurable AI model and prompt settings. Single row.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| model_pricing | text | gpt-4o-mini / gpt-4o / claude-opus-4-5 |
| model_university | text | Same options |
| model_description | text | Same options |
| system_prompt_pricing | text | Airbnb pricing engine prompt |
| system_prompt_university | text | University chat prompt |
| system_prompt_description | text | Listing description prompt |
| updated_at | timestamptz | |
| updated_by | uuid | References auth.users |

**RLS**: Open (single row, admin-managed via AdminSettings page).
**Note**: Not in generated TypeScript types — accessed via `as any` casts.

## admin_audit_log
Append-only log of all admin actions. Immutable — no UPDATE or DELETE policies.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| user_id | uuid | | Admin who performed the action |
| action | text | | e.g. approve_deal, reject_deal, suspend_user, delete_user |
| target_table | text | | Table affected (properties, profiles) |
| target_id | text | | Row ID affected |
| metadata | jsonb | {} | Additional context (city, name, etc.) |
| created_at | timestamptz | now() | |

**RLS**: Admin emails can INSERT and SELECT only. No UPDATE or DELETE.
**Note**: Not in generated TypeScript types — accessed via `as any` casts in `src/lib/auditLog.ts`.
