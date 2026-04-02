# NFsTay Messaging & Communication Architecture
_Last updated: 31 March 2026_

> **MANDATORY: Any agent that adds, removes, or changes ANY email, WhatsApp, or in-app notification MUST update this document in the same commit. No exceptions.**

---

## THE COMPLETE COMMUNICATION FLOW (plain English)

This is the single source of truth for how inquiries work from start to finish.

### A tenant finds a property and wants to inquire

**1. The tenant must be a paid subscriber first**

- A free user clicks WhatsApp or Email on any property and a **paywall panel** opens instead.
- The panel shows a GHL payment iframe (pay.nfstay.com) where the tenant enters card details.
- Once payment is confirmed, their account tier upgrades from `free` to `monthly` (or `yearly`/`lifetime`).
- The panel detects the tier change and redirects them back to the deals grid.
- They can now inquire on any property, unlimited.

**Admin notification:** Hugo and Chris receive an **email** and **bell notification** when a user subscribes ("User [name] upgraded to [tier]").

**2. The tenant sends the inquiry**

- **WhatsApp:** wa.me opens with a short, human-readable pre-filled message containing the deal link and a 5-character reference number. No internal UUID. The tenant hits send.
- **Email:** a modal pops up, they type a message and hit send. This goes through the `process-inquiry` edge function.

**WhatsApp message format (tenant-facing):**
```
Hi, I am interested in a property on nfstay.
Link: hub.nfstay.com/deals/{slug}
Reference no.: {5-char ref}
Please contact me at your earliest convenience.
```
This message must stay short and readable. Do not add internal IDs, UUIDs, or system fields.

**3. The inquiry stops in Admin > Outreach > Tenant Requests**

- WhatsApp inquiries are created by the `receive-tenant-whatsapp` edge function (called by n8n when GHL receives the inbound message). The frontend does NOT insert any inquiry row.
- Email inquiries are created by the `process-inquiry` edge function (called from EmailInquiryModal).
- The inquiry appears in Admin > Outreach > Tenant Requests with `authorized = false`.
- **The landlord receives NOTHING at this point.** No WhatsApp, no email, no notification.

**4. Admin releases the lead**

- Admin opens Tenant Requests and chooses one of three release paths per inquiry:
  - **NDA:** enrolls lister in GHL NDA workflow (workflow `0eb4395c` via `ghl-enroll` edge function). Landlord must complete Lead Access Agreement (NDA) to unlock contact details.
  - **NDA + Claim:** same NDA flow, plus landlord must claim account before lead details unlock.
  - **Direct:** marks authorized immediately in DB. No NDA/claim lock is applied in landlord CRM.
- GHL enrollment must succeed before the DB is updated to `authorized = true`. If GHL fails, the inquiry stays unauthorized.
- **This is the single admin gate.** No inquiry reaches a landlord without admin approval.

**Tenant Requests UI structure**
- Tenant Requests are grouped by landlord phone/identity first.
- Expanding a landlord group shows each tenant inquiry (property, tenant, release state) as child rows.
- Always Authorise is set at landlord phone level from the grouped row.

**4b. NDA required (admin toggle)**

- When admin toggles "NDA Required" ON for a property, ALL leads for that property require the NDA agreement before the lister can see tenant contact details.
- Controlled by `properties.nda_required` boolean (set on admin submissions page).
- The `nda_required` flag is stamped onto each inquiry at creation time.
- In the CRM leads view, contact fields (phone, email) are blurred until the lister signs the Lead Access Agreement.

**5. The landlord taps the magic link**

- Their browser opens hub.nfstay.com/inbox?token=XXX.
- The system looks up the token, finds or creates their user account automatically (no password needed).
- They land on the CRM leads page with the tenant's details visible.

**6. New landlord claims their account**

- Because the system created their account with an internal email (landlord_XXXX@nfstay.internal), a banner appears at the top: "Claim your account."
- The landlord enters their real email and name.
- The system links ALL properties that match their phone number (across contact_phone, contact_whatsapp, and landlord_whatsapp) to their account.
- All chat threads and inquiries for those properties are also linked.
- They now have a full account and can log in anytime with email and password.

**7. Hugo and Chris get notified (admin)**

- **New user registered**: bell notification + email ("New user: [name] ([email])").
- **User subscribed**: bell notification + email ("User [name] upgraded to [tier]").
- **New inquiry**: bell notification + email ("New inquiry on [property name] from [tenant name]").
- **New deal submitted**: bell notification + email ("New deal submitted: [type] in [city]").

All admin notifications go to hugo@nfstay.com and chris@nfstay.com.

---

## Overview

NFsTay connects property operators (tenants/buyers) with landlords
via a web inbox at hub.nfstay.com. WhatsApp is used exclusively as
an outbound notification channel - a "doorbell" that brings users
back to the web app. Neither party communicates via WhatsApp directly.

---

## Actors

| Actor | Description | Auth Method |
|---|---|---|
| Operator / Tenant | Property seeker using the platform | Email/WhatsApp OTP |
| Landlord | Property owner receiving inquiries | Magic link (WhatsApp) |
| Admin | NFsTay team | Email/password |
| n8n | Automation layer | Internal |
| GHL (GoHighLevel) | WhatsApp delivery layer | API key |

---

## How Messages Get Sent

There are **3 channels** the platform uses to contact people:

| Channel | How it works | Sender |
|---------|-------------|--------|
| **Email** | Supabase Edge Function `send-email` calls Resend API | `notifications@hub.nfstay.com` |
| **WhatsApp** | n8n tells GoHighLevel (GHL) to send a WhatsApp template | nfstay number `07676 368123` |
| **In-App** | Row inserted into `notifications` table - bell icon in dashboard | - |

---

## 1. Landlord Account Creation (Magic Link Flow)

```
Operator sends inquiry on hub.nfstay.com
  |
  v
Frontend: useInquiry.ts
  -> SELECT existing thread (idempotent)
  -> INSERT chat_threads (operator_id, property_id, landlord_id,
     status=active, terms_accepted=false)
  -> INSERT first message into chat_messages
     (body = inquiry text, PII masked in body_receiver)
  |
  v
ChatWindow.tsx detects operator message
  -> POST /webhook/inbox-new-message -> n8n (J6hWjodwJlqXHme1)
  |
  v
n8n workflow:
  -> Finds GHL contact by landlord phone
  -> Generates magic token (hex 32 bytes)
  -> INSERT landlord_invites (thread_id, magic_token, used=false)
  -> Sets GHL custom field magic_link_url = ?token=XXX
  -> Enrolls landlord in GHL workflow
  |
  v
GHL sends WhatsApp to landlord:
  "Someone is interested in your property"
  [Open Chat] button -> https://hub.nfstay.com/inbox?token=XXX
```

---

## 2. Landlord Magic Login

```
Landlord taps [Open Chat] on WhatsApp
  |
  v
Browser opens: hub.nfstay.com/inbox?token=XXX
  |
  v
MagicLoginPage.tsx
  -> POST /functions/v1/landlord-magic-login { token }
  |
  v
Edge function: landlord-magic-login
  -> SELECT landlord_invites WHERE magic_token = token (no expiry)
  -> GET thread -> property -> phone number
  -> FIND or CREATE auth user by phone variants
     (tries: +44xxx, 0xxx, xxx formats)
  -> UPSERT profiles (whatsapp, whatsapp_verified=true)
  -> UPDATE chat_threads.landlord_id = user.id
  -> generateLink -> verify -> return { access_token, refresh_token,
     thread_id, user_id }
  |
  v
Frontend sets Supabase session
  -> Redirects to /dashboard/inbox?thread=XXX
  -> Thread auto-selected, tenant message visible
  -> ClaimAccountBanner shown (amber, top of content area)
```

---

## 3. PII Masking

```
Operator types message with phone/email/address
  |
  v
ChatWindow.tsx: maskMessage() runs BEFORE insert
  -> Patterns detected and replaced:

  Pattern                    -> Replacement (body_receiver)
  -------------------------------------------------------
  WhatsApp URLs/mentions     -> "Contact details hidden. Sign NDA."
  Phone numbers (+44/07)     -> [Hidden number]
  Email addresses            -> [Hidden email]
  Street addresses           -> [Hidden address]

Storage:
  body          = original (sender always sees their own message)
  body_receiver = masked (receiver sees masked until NDA signed)
  is_masked     = true/false
  mask_type     = phone | email | address | contact

Display safety net:
  ChatWindow.tsx: maskPhonesForDisplay()
  -> additional regex on render for missed patterns

After NDA signed:
  -> terms_accepted = true on chat_threads
  -> All masking bypassed, both sides see originals
```

---

## 4. NDA Gate & Signing

```
Landlord opens inbox thread
  |
  v
ChatWindow.tsx checks:
  IF isLandlord AND !thread.termsAccepted
    -> Textarea hidden
    -> "Sign NDA to Reply" button shown
  |
  v
Landlord clicks -> AgreementModal.tsx opens
  -> Shows full NDA terms
  |
  v
Landlord signs
  -> UPDATE chat_threads SET terms_accepted = true
  -> INSERT agreement_acceptances (audit log)
  -> POST /webhook/inbox-nda-signed -> n8n
     (workflow NOT YET BUILT - silent fail)
  |
  v
Reply box unlocks
Contact details unmasked for landlord
```

---

## 5. Landlord Reply -> Operator WhatsApp

```
Landlord types reply in ChatWindow
  -> INSERT chat_messages (sender=landlord)
  |
  v
ChatWindow.tsx detects sender is landlord
  -> POST /webhook/inbox-landlord-replied -> n8n (BrwfLUE2LPj9jovR)
  Payload: { thread_id, recipient_phone, sender_name,
             property_title, sender_role="landlord" }
  |
  v
n8n workflow (25 nodes):
  -> Finds GHL contact by operator phone
  -> Sends WhatsApp template to operator:
     "You have a new reply from [Landlord] about [Property]"
     [Open Chat] button -> hub.nfstay.com/dashboard/inbox
  |
  v
Operator receives WhatsApp notification
  -> Taps link -> opens web inbox -> sees landlord reply
  -> Replies in web inbox
```

---

## 6. Operator Reply -> Landlord WhatsApp Notification

```
Operator types reply in web inbox
  -> INSERT chat_messages (sender=operator)
  |
  v
Same flow as step 1 (from "ChatWindow detects operator message")
  -> n8n generates new magic token
  -> GHL sends new WhatsApp to landlord
  -> Landlord taps link -> back in web inbox
```

---

## 7. Claim Account

```
Landlord sees ClaimAccountBanner in inbox
  -> Clicks "Claim Now"
  |
  v
ClaimAccountBanner form:
  -> Name (text input)
  -> Email (text input)
  -> WhatsApp: PRE-FILLED + LOCKED (read-only, cannot change)
  |
  v
POST /functions/v1/claim-landlord-account
  { name, email } + Bearer token
  |
  v
Edge function:
  -> Verifies JWT (landlord must be logged in)
  -> Updates auth email (no confirmation needed -
     already verified via WhatsApp)
  -> UPDATE profiles SET name = name
  -> Links ALL property threads matching landlord phone
     to this user.id
  |
  v
Landlord now has:
  -> Full account with email + name
  -> All their properties linked
  -> Particle wallet provisioned on next page load
     (WalletProvisioner.tsx calls particle-generate-jwt)
  -> WhatsApp locked - contact support to change
```

---

## 8. Particle Wallet

Triggered at TWO points:
1. After WhatsApp OTP signup (existing flow)
2. On any authenticated page load (WalletProvisioner.tsx)

```
Edge function: particle-generate-jwt
  Input: { user_id }
  -> Builds RS256 signed JWT
     sub = user_id
     iss = hub.nfstay.com
     exp = 1 hour
  -> Returns { jwt }

Used for:
  -> Particle Connect SDK wallet creation
  -> Invest feature
  -> Affiliate URL generation
```

---

## 9. Key Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles (name, whatsapp, whatsapp_verified) |
| `properties` | Property listings (contact_phone, landlord_whatsapp) |
| `chat_threads` | Conversations (operator_id, landlord_id, property_id, terms_accepted) |
| `chat_messages` | Messages (body, body_receiver, is_masked, mask_type) |
| `landlord_invites` | Magic tokens (magic_token, thread_id, used) |
| `agreement_acceptances` | NDA audit log |

---

## 10. Known Gaps (as of 31 March 2026)

| # | Gap | Impact | Status |
|---|---|---|---|
| 1 | `inbox-nda-signed` n8n workflow not built | No WhatsApp notification when NDA signed | Not built |
| 2 | WhatsApp is outbound only - no inbound parsing | Both parties must use web inbox to reply | By design |
| 3 | Tenant auto-reply skips when user has no WhatsApp in profile | Auto-reply fires inconsistently | Fix planned |
| 4 | Reference number in pre-filled message is full UUID (36 chars) | Ugly, needs max 5 chars | Fixed 31 March 2026 (PR #146) |
| 5 | DealDetail passes slug instead of UUID as property_id | Silent backend failure | Fixed 31 March 2026 (PR #146) |
| 6 | n8n poll workflow used old lister_type logic for nda_required | Admin NDA toggle had no effect | Fixed 31 March 2026 - n8n Prepare Data now reads property.nda_required directly |
| 7 | n8n poll workflow used old lister_type logic for first_landlord_inquiry | Admin first inquiry toggle had no effect | Fixed 31 March 2026 - n8n Prepare Data now reads property.first_landlord_inquiry + checks prior inquiry count. Polling window widened from 5 to 10 minutes. |
| 8 | New user registration admin notification | No email/bell when someone signs up | Not built |
| 9 | User subscription admin notification | No email/bell when a user subscribes to a paid tier | Not built |

---

## PART 2 - MARKETPLACE NOTIFICATIONS (hub.nfstay.com)

### User Signs Up

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| OTP verification code | WhatsApp | New user | "Verify with the code **1234**" |
| Welcome email | Email | New user | "Welcome to nfstay!" with feature list |
| New signup alert | Email | Hugo (admin) | "New User - James Walker" with name/email/phone |
| New signup alert | In-App | Hugo (admin) | Bell notification in dashboard |

**How it flows:** User fills signup form - frontend calls n8n `/send-otp` - n8n creates GHL contact - GHL `OTP - nfstay` workflow sends WhatsApp. Frontend also calls Resend for welcome + admin emails.

### Member Submits a Deal

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| New deal alert | Email | Hugo (admin) | "New Deal Submitted - Manchester 2-bed flat" |
| New deal alert | In-App | Hugo (admin) | Bell notification |
| n8n admin webhook | n8n | Hugo (admin) | Fires `/webhook/notify-admin-new-deal` |

**How it flows:** Member fills ListADealPage form - saves to Supabase - fires Resend email to admin + n8n webhook.

### Admin Approves/Rejects a Deal

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Deal approved | Email | Member who submitted it | "Your deal is live!" |
| Deal rejected | Email | Member who submitted it | "Deal not approved" + reason |

### Deal Expires Automatically

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Deal expired (14 days) | Email | Member | "Your deal has expired" |
| Deal on-offer (7 days) | Email | Member | "Your deal moved to on-offer" |
| Expiry notification | In-App | Member | Bell notification |

**How it flows:** Supabase Edge Function `deal-expiry` runs on cron - updates status - sends Resend email + in-app notification.

### Member Edits a Deal

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Edit notification | n8n | Hugo (admin) | Fires `/webhook/notify-admin-edit` |

### Deals Grid Inquiry (admin-gated - tenant does NOT contact landlord directly)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Inquiry submitted | DB | System | Row created in `inquiries` (authorized=false) |
| Tenant auto-reply | WhatsApp | Tenant | "Your inquiry has been received for [property]" |
| Inquiry appears in admin dashboard | In-App | Admin | Visible in Outreach > Tenant Requests |

**The landlord receives NOTHING at this point.** The inquiry waits for admin release.

**How it flows:**
1. Tenant clicks WhatsApp on PropertyCard, DealDetail, or InquiryPanel
2. wa.me opens with short message (deal link + 5-char reference, no UUID)
3. Message goes to NFsTay WhatsApp via GHL
4. GHL -> n8n -> `receive-tenant-whatsapp` edge function creates one inquiry
   - Function now accepts optional `tenant_email` field (added 2026-04-02)
   - n8n workflow must include `tenant_email` from GHL contact data if available
5. n8n sends tenant auto-reply confirmation
6. Inquiry appears in Admin > Outreach > Tenant Requests
7. Admin chooses NDA, NDA + Claim, or Direct -> `ghl-enroll` contacts landlord
8. Landlord taps magic link -> auto-login -> CRM leads page
9. New landlord sees "Claim your account" banner -> enters email + name -> all matching properties linked

### Inbox Messaging (post-claim, ongoing conversations)

These fire only from ChatWindow.tsx for existing threads. Not part of the marketplace inquiry flow.

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Operator sends message in thread | WhatsApp | Landlord | "You have a new message about [property] on nfstay" |
| Landlord replies in thread | WhatsApp | Operator | "You have a new message about [property] on nfstay" |

### Payment Confirmed (GHL)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Tier upgraded | Email | Member | "Payment confirmed - you're upgraded!" |

**How it flows:** GHL processes payment - fires webhook to n8n `GHL Payment - Tier Update` - n8n updates Supabase tier - Resend email sent.

### Agent/Affiliate System

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Someone signs up via referral link | Email | Agent | "New referral signup - James joined via your link!" |
| Agent requests payout | Email | Hugo (admin) | "Payout Request - Agent Name (GBP26.80)" |
| Admin sends payout | Email | Agent | "Payout sent - GBP26.80" |

---

## PART 3 - INVESTMENT MODULE (JV Partners)

### Someone Buys Shares

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Purchase confirmed | Email + WhatsApp | Buyer | "Your investment of $500 in Pembroke Place is confirmed" |
| Purchase confirmed | Email + WhatsApp | Agent (if referred) | "Commission earned" |
| New order pending | WhatsApp + In-App | Hugo (admin) | Alert about new order |

### Rental Income Available

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Rent ready to claim | Email + WhatsApp + In-App | Investor | "You have $42.50 ready to claim" |

**How it flows:** n8n cron `inv-rent-sync` runs daily 6am - checks blockchain rent contract - writes claimable amounts - sends notifications.

### Investor Claims Payout

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Claim submitted | In-App | Investor | "Your claim has been submitted" |
| Payout completed (crypto) | Email + In-App | Investor | "Your payout of $42.50 has been sent" |
| Payout completed (bank) | WhatsApp + In-App | Investor | "Your payout of GBP42.50 has arrived" |
| Payout failed (bank) | WhatsApp | Hugo (admin) | Alert to investigate |
| Batch ready for approval | WhatsApp | Hugo (admin) | "Batch ready - 15 payees, GBP4,230" |

**How it flows (bank):** Every Tuesday 5am - n8n `inv-tuesday-payout-batch` - creates Revolut payment draft - Hugo approves via Face ID - Revolut sends money - webhook confirms - notifications sent.

### Proposals & Voting

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| New proposal created | Email + In-App | All shareholders of that property | "New proposal - vote now" |
| Proposal ending soon (2 days) | Email + In-App | All shareholders | "Voting ends soon" |
| Proposal result | Email + WhatsApp + In-App | All shareholders | "Pool renovation APPROVED by 80%" |

### Boost APR

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Boost activated | Email + In-App | Investor | "Your APR has been boosted" |

### Agent Commissions (Investment)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Commission earned (5% first purchase) | Email + WhatsApp + In-App | Agent | "You earned $50 commission!" |
| Commission claimable (after 14 days) | Email + In-App | Agent | "Your $50 is ready to claim" |
| Agent payout sent | Email + WhatsApp + In-App | Agent | "Your payout has been sent" |

### Bank Details

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Bank details saved | WhatsApp | User | "Bank details saved" |

---

## ARCHITECTURE

```
USER ACTION
    |
    v
+---------------+
|  FRONTEND     |  (React app at hub.nfstay.com)
|  SignUp.tsx    |
|  Inbox        |
|  Admin        |
|  Invest       |
+---+-------+---+
    |       |
    |       v
    |  +--------------------+
    |  |  SUPABASE          |
    |  |  Edge Functions     |---- send-email ----> RESEND API ----> Email
    |  |  (deal-expiry,      |         (notifications@hub.nfstay.com)
    |  |   claim, bank,      |
    |  |   magic-login)      |
    |  +--------------------+
    |
    v
+--------------------+
|  n8n               |
|  (36 workflows)    |
|                    |
|  send-otp ---------+--> GHL --> WhatsApp (OTP code)
|  inbox-new-msg ----+--> GHL --> WhatsApp (landlord messages)
|  inbox-replied ----+--> GHL --> WhatsApp (operator messages)
|  inv-notify -------+--> GHL --> WhatsApp (investment alerts)
|  inv-rent-sync ----+--> GHL --> WhatsApp (rent available)
|  inv-payout -------+--> GHL --> WhatsApp (payout updates)
|  tuesday-batch ----+--> GHL --> WhatsApp (Hugo: batch ready)
|                    |
|  GHL Payment ------+--> Supabase (tier update)
|  admin-notify -----+--> Supabase (in-app bell)
+--------------------+
```

---

## EMAIL TYPES (Resend - via `send-email` Edge Function)

| # | Type Key | Subject | Recipient |
|---|----------|---------|-----------|
| 1 | `welcome-member` | Welcome to nfstay! | New user |
| 2 | `new-signup-admin` | New User - {name} | Hugo (admin) |
| 3 | `new-deal-admin` | New Deal Submitted - {city} {type} | Hugo (admin) |
| 4 | `deal-approved-member` | Your deal has been approved - {city} | Member |
| 5 | `deal-rejected-member` | Update on your deal - {city} | Member |
| 6 | `deal-expired-member` | Your deal has expired - {city} | Member |
| 7 | `tier-upgraded-member` | Payment confirmed - you're upgraded! | Member |
| 8 | `payout-requested-admin` | Payout Request - {name} (GBP{amount}) | Hugo (admin) |
| 9 | `payout-sent-member` | Payout sent - GBP{amount} | Agent |
| 10 | `new-referral-agent` | New referral signup - {name} joined! | Agent |

## GHL WHATSAPP WORKFLOWS (Published)

| # | GHL Workflow ID | Name | Triggered By | Sends To |
|---|----------------|------|-------------|----------|
| 1 | `baabc69a` | OTP - nfstay | GHL trigger: OTP Code changed | New user |
| 2 | `67250bfa` | 1-landlord_enquiry | n8n enrollment only | Landlord |
| 3 | `0eb4395c` | 2 Tenant to Landlord | n8n enrollment only | Landlord |
| 4 | `9b826037` | 3- Landlord to Tenant | n8n enrollment only | Operator |
| 5 | `75b14201` | 4- Investment NFSTAY | n8n enrollment only | Investor |
| 6 | `1177dc6e` | Investors 1st message | n8n enrollment only | Investor |
| 7 | `e95b9105` | Investors FB leads Enquiry | n8n enrollment only | FB lead |
| 8 | `7d1bac63` | Webhook nfstay Chat | GHL trigger | - |
| 9 | `11117c1a` | inbox-new-inquiry | GHL trigger | - |
| 10 | `39d1650a` | inbox-new-message | GHL trigger | - |
| 11 | `67f77c19` | landlord replies | GHL trigger | - |

## GHL CUSTOM FIELDS

| Field | ID | Key | Use |
|---|---|---|---|
| Property Reference | Z0thvOTyoO2KxTMt5sP8 | contact.property_reference | WhatsApp template variable |
| Magic Link URL | gWb4evAKLWCK0y8RHp32 | contact.magic_link_url | Stores ?token=XXX for template button |
| First Contact Sent | QIc7FR6U3OGNEhdk7LoY | contact.first_contact_sent | Tracks first message delivery |

## WHAT'S LIVE vs PLANNED

| Area | Email | WhatsApp | Bell | Status |
|------|:-----:|:--------:|:----:|--------|
| Signup + OTP | Y | Y | - | **LIVE** |
| Deal submission/approval | Y | - | Y | **LIVE** |
| Deal expiry | Y | - | Y | **LIVE** |
| Inbox messaging | - | Y | - | **LIVE** |
| Deals grid inquiry (admin-gated) | Y | Y | Y | **LIVE** (admin releases leads via Outreach) |
| Payment/tier | Y | - | - | **LIVE** |
| Affiliates | Y | - | - | **LIVE** |
| New user registration admin alert | - | - | - | **NOT BUILT** (gap 7) |
| User subscription admin alert | - | - | - | **NOT BUILT** (gap 8) |
| Investment purchases | Y | Y | - | **PLANNED** |
| Rent/payouts | Y | Y | - | **PLANNED** |
| Proposals/voting | Y | Y | - | **PLANNED** |
| Boost | Y | - | - | **PLANNED** |

---

## Infrastructure

| Service | Role |
|---|---|
| Supabase (asazddtvjvmckouxcmmo) | Database, Auth, Edge Functions |
| n8n (n8n.srv886554.hstgr.cloud) | Workflow automation |
| GHL (GoHighLevel) | WhatsApp delivery, CRM |
| Vercel (hub.nfstay.com) | Frontend hosting |
| Particle Network | Crypto wallet layer |
| Resend | Email delivery |
