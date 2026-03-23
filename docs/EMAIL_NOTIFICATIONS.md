# Email & Notification System — Full Audit

> Complete map of every email, notification, and alert in the system.
> Last audited: 2026-03-17

---

## 1. EMAIL SERVICE

**Provider:** Resend (https://resend.com)
**API Key:** `RESEND_API_KEY` — set as Supabase Edge Function secret (shared by marketplace10 + nfstay)

### Domains

| Domain | Module | From address | Status |
|--------|--------|-------------|--------|
| `hub.nfstay.com` | marketplace10 | `notifications@hub.nfstay.com` | **Not verified** — needs DNS records in Resend |
| `nfstay.app` | nfstay booking module | `bookings@nfstay.app` | **Not verified** — needs DNS records in Resend |
| `nfstay.com` | **NEVER USE** | — | Separate business |
| `resend.dev` | Sandbox (current) | `onboarding@resend.dev` | Active but emails may land in spam |

**Current state:** All emails send from Resend sandbox (`onboarding@resend.dev`). Once Hugo verifies the two domains, we switch the from addresses.

---

## 2. MARKETPLACE10 EMAILS (hub.nfstay.com)

### Edge Function: `send-email`

| Email type | When sent | Recipient | Called from | Status |
|-----------|----------|-----------|-------------|--------|
| `new-deal-admin` | Member submits a deal | Admin (`ADMIN_EMAIL` or `hugo@nfstay.com`) | `ListADealPage.tsx` | **Working** (sandbox sender) |
| `deal-approved-member` | Admin approves a deal | Member's contact_email | `AdminSubmissions.tsx` | **Working** (sandbox sender) |

### Auth emails (Supabase built-in SMTP)

| Email | When sent | Status |
|-------|----------|--------|
| Password reset | User clicks "Forgot password" | **Working** (Supabase SMTP) |
| Email confirmation | User signs up | **Bypassed** — signup flow signs in immediately |

### Emails that SHOULD exist but DON'T

| Missing email | When it should send | Priority |
|--------------|-------------------|----------|
| Deal rejected | Admin rejects a deal | Medium |
| Deal expired | Deal moves to on-offer/inactive (7/14 days) | Medium |
| Payment confirmation | User upgrades tier via GHL | Low |
| Welcome email | New user registration | Low (webhook exists in n8n but never called) |
| Daily digest | Daily summary of new deals | Low (preference toggles exist but no backend) |

---

## 3. WHATSAPP NOTIFICATIONS (via n8n → GHL)

| Webhook | When triggered | Recipient | Called from | Status |
|---------|---------------|-----------|-------------|--------|
| `inbox-new-message` | Operator sends chat message | Landlord (WhatsApp) | `ChatWindow.tsx` | **Working** |
| `inbox-landlord-replied` | Landlord sends chat message | Operator (WhatsApp) | `ChatWindow.tsx` | **Working** |
| `inbox-tenant-message` | Tenant sends message | Operator (WhatsApp) | **NEVER CALLED** | Dead code |
| `send-otp` | User signs up | User (SMS/WhatsApp) | `SignUp.tsx` | **Working** |
| `signup-welcome` | User registers | User (WhatsApp) | **NEVER CALLED** | Dead code |

---

## 4. IN-APP NOTIFICATIONS

### Admin notifications (notifications table)

| Notification | When created | Created by | Status |
|-------------|-------------|-----------|--------|
| New deal submitted | Member submits deal | n8n `notify-admin-new-deal` | **Working** |
| Deal edited | Member edits listing | n8n `notify-admin-edit` | **Working** |

**Admin UI:** Bell icon with badge in AdminLayout, notifications page with mark-read. Polls every 30 seconds (no realtime).

### Member notifications

**None.** Regular members have no notification feed, no bell icon, and no way to see platform notifications. Only admins see notifications.

---

## 5. NOTIFICATION PREFERENCES (cosmetic only)

The Settings page shows 4 toggles. They save to the `profiles` table but **nothing reads them**:

| Preference | Saved? | Actually enforced? |
|-----------|--------|-------------------|
| WhatsApp: New deals | Yes | **No** |
| WhatsApp: Daily digest | Yes | **No** (no digest exists) |
| Email: Daily digest | Yes | **No** (no digest exists) |
| WhatsApp: Status updates | Yes | **No** |

---

## 6. REALTIME SUBSCRIPTIONS

| Component | Table | Purpose |
|-----------|-------|---------|
| DashboardTopNav | `chat_threads` | Unread inbox badge |
| DashboardSidebar | `chat_threads` | Same unread badge |
| InboxPage | `chat_threads` | Live thread list |
| ChatWindow | `chat_messages` | Live messages |
| MyListingsPanel | `properties` | Live status changes |
| useUserTier | `profiles` | Live tier upgrade |

**No realtime on `notifications` table** — admin polls every 30 seconds instead.

---

## 7. NFSTAY BOOKING MODULE EMAILS (planned)

Edge Function `nfs-email-send` (does not exist yet — Phase 3):

| Email | When sent | From |
|-------|----------|------|
| Booking confirmation | Guest completes payment | `bookings@nfstay.app` |
| Magic link | Operator signup/login | `bookings@nfstay.app` |
| Payment notification | Payment succeeded/failed | `bookings@nfstay.app` |
| Payout notification | Operator receives payout | `bookings@nfstay.app` |
| Invitation email | Operator invites team member | `bookings@nfstay.app` |

All planned. None built yet. Tajul handles this in Phase 3 of the nfstay execution plan.

---

## 8. WHAT'S READY vs WHAT'S WAITING

| Item | Status | Blocker |
|------|--------|---------|
| Resend API key | **Set** in Supabase secrets | None |
| `send-email` Edge Function | **Working** (sandbox sender) | Domain verification |
| `hub.nfstay.com` domain in Resend | **Not verified** | Hugo needs to add DNS records |
| `nfstay.app` domain in Resend | **Not verified** | Hugo needs to add DNS records |
| `nfs-email-send` Edge Function | **Not built** | Tajul Phase 3 |
| Sender address switch | **Not done** | Domain verification first |

**Once Hugo verifies domains:** Update `send-email` Edge Function to send from `notifications@hub.nfstay.com` instead of `onboarding@resend.dev`. No other code changes needed.

---

## Shared with marketplace10

- **Same Resend account and API key** for both modules
- **Same Supabase secret** (`RESEND_API_KEY`)
- **Different from domains:** `hub.nfstay.com` (marketplace10) vs `nfstay.app` (nfstay booking)
- **Different Edge Functions:** `send-email` (marketplace10) vs `nfs-email-send` (nfstay)
