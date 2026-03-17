# NFStay — Integrations

> Every external service NFStay connects to. Where it's configured, how it's used, and what access is needed.

---

## 1. STRIPE (Payments + Connect)

### What it does
- **Stripe Checkout:** Travelers pay for bookings via hosted checkout pages
- **Stripe Connect:** Operators onboard their Stripe accounts to receive payouts
- **Webhooks:** Stripe notifies NFStay of payment events (success, failure, refund, dispute, payout)

### Where it runs
| Component | System |
|-----------|--------|
| Checkout session creation | Edge Function `nfs-stripe-checkout` |
| Connect OAuth flow | Edge Function `nfs-stripe-connect-oauth` |
| Platform webhook handler | Edge Function `nfs-stripe-webhook` |
| Connect webhook handler | Edge Function `nfs-stripe-connect-webhook` |
| Frontend Checkout UI | `@stripe/react-stripe-js` |

### Access required
| Credential | Where stored | Who has it |
|-----------|-------------|-----------|
| `STRIPE_SECRET_KEY` (live) | Edge Function secret | Hugo (Stripe Dashboard) |
| `STRIPE_PUBLISHABLE_KEY` (live) | Vercel env var | Hugo (Stripe Dashboard) |
| `STRIPE_CLIENT_ID` (Connect) | Edge Function secret | Hugo (Stripe Dashboard) |
| `STRIPE_WEBHOOK_SECRET` | Edge Function secret | Hugo (create endpoint in Stripe) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Edge Function secret | Hugo (create endpoint in Stripe) |

### Webhook endpoints
| Endpoint | URL | Events |
|----------|-----|--------|
| Platform | `https://[supabase-url]/functions/v1/nfs-stripe-webhook` | payment_intent.*, charge.*, refund.*, dispute.* |
| Connect | `https://[supabase-url]/functions/v1/nfs-stripe-connect-webhook` | account.updated, payout.*, capability.* |

### Status: Code complete, awaiting deployment
- Edge Functions written: `nfs-stripe-checkout`, `nfs-stripe-connect-oauth`, `nfs-stripe-webhook`
- Test keys provided by Tajul (publishable, secret, Connect client ID)
- Frontend integration complete: SettingsStripe (Connect OAuth), NfsBookingWidget (Checkout), payment pages
- **Deployment pending:** `supabase secrets set` for NFS_STRIPE_SECRET_KEY, NFS_STRIPE_WEBHOOK_SECRET, NFS_STRIPE_CLIENT_ID
- **Webhook endpoint needs creation** in Stripe Dashboard pointing to `nfs-stripe-webhook`

### Shared with marketplace10
**No.** marketplace10 uses GoHighLevel for payments, not Stripe. NFStay has its own Stripe account and flows. Completely separate.

---

## 2. HOSPITABLE (Airbnb/VRBO Sync)

### What it does
- Syncs listings, reservations, calendar, and images from Airbnb/VRBO/Booking.com via Hospitable's partner API
- Operators connect via OAuth → NFStay receives webhook events for ongoing sync
- NFStay has **no direct Airbnb API** — all Airbnb data flows through Hospitable

### Where it runs
| Component | System |
|-----------|--------|
| OAuth initiate + callback | Edge Function `nfs-hospitable-oauth` |
| Initial full sync | n8n workflow `nfs-hospitable-init-sync` |
| Listing change sync | n8n workflow `nfs-hospitable-listing-sync` |
| Reservation change sync | n8n workflow `nfs-hospitable-reservation-sync` |
| Manual resync | n8n workflow `nfs-hospitable-manual-sync` |
| Failed job retry | n8n workflow `nfs-hospitable-retry` (cron) |
| Webhook receiver | n8n webhook node |

### Access required
| Credential | Where stored | Who has it |
|-----------|-------------|-----------|
| `HOSPITABLE_PARTNER_ID` | n8n credential | From legacy VPS .env |
| `HOSPITABLE_PARTNER_SECRET` | n8n credential | From legacy VPS .env |
| `HOSPITABLE_BEARER_TOKEN` | n8n credential | From legacy VPS .env (may expire) |
| `HOSPITABLE_WEBHOOK_SECRET` | n8n credential | From legacy VPS .env |

### API endpoints used
- `https://connect.hospitable.com` — OAuth
- `https://api.connect.hospitable.com` — REST API (customers, listings, reservations, calendar)
- Webhook: `https://n8n.srv886554.hstgr.cloud/webhook/nfs-hospitable-webhook`

### Status: Credentials captured, not yet verified
Bearer token may have expired. Requires verification before Phase 5.

### Shared with marketplace10
**Partially.** marketplace10 has an `airbnb-pricing` n8n workflow that uses Hospitable data for pricing estimates. The Hospitable credentials may overlap. NFStay uses them for full listing/reservation sync.

---

## 3. GOOGLE MAPS

### What it does
- Search map with property markers and clustering
- Property detail location map
- Places autocomplete for address entry during property creation

### Where it runs
| Component | System |
|-----------|--------|
| Search map | Frontend (`@googlemaps/js-api-loader`, `@googlemaps/markerclusterer`) |
| Property map | Frontend (`@googlemaps/react-wrapper`) |
| Places autocomplete | Frontend (`usePlacesAutocomplete` hook) |

### Access required
| Credential | Where stored | Who has it |
|-----------|-------------|-----------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Vercel env var | From legacy VPS .env |

### Status: Key captured, may need referrer restrictions updated
Google Cloud Console may restrict the key to specific domains. Need to add `hub.nfstay.com`, `nfstay.app`, `*.nfstay.app`.

### Shared with marketplace10
**Yes.** Same API key. marketplace10 uses it for property location display. NFStay uses it for search maps and Places autocomplete. Key is in the same Vercel env vars.

---

## 4. EMAIL (Resend)

### What it does
- Magic link emails for operator signup/login
- Booking confirmation emails
- Payment notification emails
- Invitation emails for team members
- Payout success/failure notifications

### Where it runs
| Component | System |
|-----------|--------|
| Transactional send | Edge Function `nfs-email-send` (calls Resend API) |
| Triggered sends | n8n workflows (booking notification, payout notification) |

### Access required
| Credential | Where stored | Who has it |
|-----------|-------------|-----------|
| `NFS_RESEND_API_KEY` | Edge Function secret | Create new Resend account |

### Status: Code complete, awaiting deployment
- API key provided by Tajul (`NFS_RESEND_API_KEY`)
- Edge Function code written: `supabase/functions/nfs-email-send/index.ts`
- 3 email types: booking_confirmation, booking_cancelled, operator_new_booking
- Deployment pending: `supabase secrets set NFS_RESEND_API_KEY=...` + `supabase functions deploy nfs-email-send`
- From address uses `onboarding@resend.dev` (sandbox) until verified domain configured

### Shared with marketplace10
**Partially.** marketplace10 already uses Resend for email (Edge Function `send-email`). NFStay will use a separate Edge Function (`nfs-email-send`) but may share the same Resend account/API key. The domain may differ (nfstay.com vs nfstay.app).

---

## 5. SUPABASE STORAGE

### What it does
- Property photos (upload, serve, delete)
- Branding assets (logos, favicons, hero images)
- Replaces legacy Cloudinary integration

### Where it runs
| Component | System |
|-----------|--------|
| Upload | Frontend via `supabase.storage.upload()` |
| Display | Public URLs from Supabase Storage CDN |
| Image transform | Supabase Image Transformation API |

### Buckets
| Bucket | Purpose | Access |
|--------|---------|--------|
| `nfs-images` | Property photos | Public read, authenticated upload |
| `nfs-branding` | Operator logos, favicons, hero images | Public read, authenticated upload |

### Status: Not yet created
Create buckets as part of Phase 2 (Properties).

### Shared with marketplace10
**No.** NFStay has its own storage buckets. marketplace10 uses Pexels for stock photos and doesn't have user-uploaded images.

---

## 6. CLOUDFLARE (Custom Domains)

### What it does
- Provisions custom domains for white-label operators
- Creates SSL certificates via Cloudflare for SaaS
- Verifies DNS for operator custom domains

### Where it runs
| Component | System |
|-----------|--------|
| Domain provisioning | Edge Function `nfs-domain-verify` (calls Cloudflare API) |
| DNS verification | Edge Function `nfs-domain-verify` |

### Access required
| Credential | Where stored | Who has it |
|-----------|-------------|-----------|
| `CF_API_TOKEN` | Edge Function secret | From legacy VPS .env |
| `CF_ZONE_ID` | Edge Function secret | From legacy VPS .env |

### Status: Credentials captured, needs verification
Phase 6 requirement.

### Shared with marketplace10
**No.** marketplace10 doesn't use custom domains or Cloudflare.

---

## 7. n8n (Workflow Automation)

### What it does
- All Hospitable sync workflows (5 workflows)
- iCal inbound sync (cron)
- Booking/payout notification emails
- Expired data cleanup (cron)

### Where it runs
Same n8n instance as marketplace10: `https://n8n.srv886554.hstgr.cloud`

### NFStay-specific workflows
See `docs/nfstay/WEBHOOKS.md` for the complete list.

### Shared with marketplace10
**Yes.** Same n8n instance. NFStay workflows coexist with marketplace10 workflows. All NFStay workflows use the `nfs-` prefix to avoid naming collisions.

---

## Integration Status Summary

| Integration | Phase | Status | Blocker? |
|-------------|-------|--------|----------|
| Stripe | 4 | Code complete | Awaiting deployment + webhook endpoint creation |
| Hospitable | 5 | Credentials captured | Bearer token may be expired |
| Google Maps | 2 | Key captured | May need referrer update |
| Email (Resend) | 3 | Not configured | Need Resend account |
| Storage | 2 | Not created | No blocker |
| Cloudflare | 6 | Credentials captured | Needs verification |
| n8n | 5 | Instance available | No blocker |

---

*End of NFStay Integrations.*
