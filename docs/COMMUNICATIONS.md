# nfstay - Complete Communication Map

> **MANDATORY: Any agent that adds, removes, or changes ANY email, WhatsApp, or in-app notification MUST update this document in the same commit. No exceptions.**

*Last updated: 2026-03-19*

---

## How Messages Get Sent

There are **3 channels** the platform uses to contact people:

| Channel | How it works | Sender |
|---------|-------------|--------|
| **Email** | Supabase Edge Function `send-email` calls Resend API | `notifications@hub.nfstay.com` |
| **WhatsApp** | n8n tells GoHighLevel (GHL) to send a WhatsApp template | nfstay number `07676 368123` |
| **In-App** | Row inserted into `notifications` table → bell icon in dashboard | - |

---

## PART 1 - MARKETPLACE (hub.nfstay.com)

### 1. User Signs Up

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| OTP verification code | WhatsApp | New user | "Verify with the code **1234**" |
| Welcome email | Email | New user | "Welcome to nfstay!" with feature list |
| New signup alert | Email | Hugo (admin) | "New User - James Walker" with name/email/phone |
| New signup alert | In-App | Hugo (admin) | Bell notification in dashboard |

**How it flows:** User fills signup form → frontend calls n8n `/send-otp` → n8n creates GHL contact → GHL `OTP - nfstay` workflow sends WhatsApp. Frontend also calls Resend for welcome + admin emails.

### 2. Member Submits a Deal

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| New deal alert | Email | Hugo (admin) | "New Deal Submitted - Manchester 2-bed flat" |
| New deal alert | In-App | Hugo (admin) | Bell notification |
| n8n admin webhook | n8n | Hugo (admin) | Fires `/webhook/notify-admin-new-deal` |

**How it flows:** Member fills ListADealPage form → saves to Supabase → fires Resend email to admin + n8n webhook.

### 3. Admin Approves/Rejects a Deal

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Deal approved | Email | Member who submitted it | "Your deal is live! 🎉" |
| Deal rejected | Email | Member who submitted it | "Deal not approved" + reason |

**How it flows:** Admin clicks Approve/Reject in AdminSubmissions → Resend email sent to member.

### 4. Deal Expires Automatically

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Deal expired (14 days) | Email | Member | "Your deal has expired" |
| Deal on-offer (7 days) | Email | Member | "Your deal moved to on-offer" |
| Expiry notification | In-App | Member | Bell notification |

**How it flows:** Supabase Edge Function `deal-expiry` runs on cron → updates status → sends Resend email + in-app notification.

### 5. Member Edits a Deal

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Edit notification | n8n | Hugo (admin) | Fires `/webhook/notify-admin-edit` |

### 6. Inbox - Operator Messages Landlord (First Time)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| First contact enquiry | WhatsApp | Landlord | "Hey, is your [property] still available?" + magic link |

**How it flows:** Operator types message → saves to Supabase → n8n `/inbox-new-message` → checks if landlord ever replied → NO → removes from GHL workflow → waits 3s → enrolls in GHL `1-landlord_enquiry` → GHL sends WhatsApp.

### 7. Inbox - Operator Messages Landlord (Follow-up)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Follow-up message | WhatsApp | Landlord | "You have a new message about [property] on nfstay" |

**How it flows:** Same as above but landlord has replied before → enrolls in GHL `2-Tenant to Landlord` instead.

### 8. Inbox - Landlord Replies

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Landlord replied | WhatsApp | Operator | "You have a new message about [property] on nfstay" |

**How it flows:** Landlord sends message → saves to Supabase → n8n `/inbox-landlord-replied` → enrolls in GHL `3-Landlord to Tenant` → GHL sends WhatsApp to operator.

### 9. Payment Confirmed (GHL)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Tier upgraded | Email | Member | "Payment confirmed - you're upgraded! 🚀" |

**How it flows:** GHL processes payment → fires webhook to n8n `GHL Payment → Tier Update` → n8n updates Supabase tier → Resend email sent.

### 10. Agent/Affiliate System

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Someone signs up via referral link | Email | Agent | "New referral signup - James joined via your link! 🎉" |
| Agent requests payout | Email | Hugo (admin) | "Payout Request - Agent Name (£26.80)" |
| Admin sends payout | Email | Agent | "Payout sent - £26.80 💰" |

---

## PART 2 - INVESTMENT MODULE (JV Partners)

### 11. Someone Buys Shares

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Purchase confirmed | Email + WhatsApp | Buyer | "Your investment of $500 in Seseh Villa is confirmed" |
| Purchase confirmed | Email + WhatsApp | Agent (if referred) | "Commission earned" |
| New order pending | WhatsApp + In-App | Hugo (admin) | Alert about new order |

### 12. Rental Income Available

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Rent ready to claim | Email + WhatsApp + In-App | Investor | "You have $42.50 ready to claim" |

**How it flows:** n8n cron `inv-rent-sync` runs daily 6am → checks blockchain rent contract → writes claimable amounts → sends notifications.

### 13. Investor Claims Payout

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Claim submitted | In-App | Investor | "Your claim has been submitted" |
| Payout completed (crypto) | Email + In-App | Investor | "Your payout of $42.50 has been sent" |
| Payout completed (bank) | WhatsApp + In-App | Investor | "Your payout of £42.50 has arrived" |
| Payout failed (bank) | WhatsApp | Hugo (admin) | Alert to investigate |
| Batch ready for approval | WhatsApp | Hugo (admin) | "Batch ready - 15 payees, £4,230" |

**How it flows (bank):** Every Tuesday 5am → n8n `inv-tuesday-payout-batch` → creates Revolut payment draft → Hugo approves via Face ID → Revolut sends money → webhook confirms → notifications sent.

### 14. Proposals & Voting

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| New proposal created | Email + In-App | All shareholders of that property | "New proposal - vote now" |
| Proposal ending soon (2 days) | Email + In-App | All shareholders | "Voting ends soon" |
| Proposal result | Email + WhatsApp + In-App | All shareholders | "Pool renovation APPROVED by 80%" |

### 15. Boost APR

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Boost activated | Email + In-App | Investor | "Your APR has been boosted" |

### 16. Agent Commissions (Investment)

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Commission earned (5% first purchase) | Email + WhatsApp + In-App | Agent | "You earned $50 commission!" |
| Commission claimable (after 14 days) | Email + In-App | Agent | "Your $50 is ready to claim" |
| Agent payout sent | Email + WhatsApp + In-App | Agent | "Your payout has been sent" |

### 17. Bank Details

| What happens | Channel | Who receives | Message |
|-------------|---------|-------------|---------|
| Bank details saved | WhatsApp | User | "Bank details saved ✅" |

---

## ARCHITECTURE

```
USER ACTION
    │
    ▼
┌─────────────┐
│  FRONTEND   │  (React app at hub.nfstay.com)
│  SignUp.tsx  │
│  Inbox      │
│  Admin      │
│  Invest     │
└──┬──────┬───┘
   │      │
   │      ▼
   │  ┌──────────────────┐
   │  │  SUPABASE        │
   │  │  Edge Functions   │──── send-email ──→ RESEND API ──→ 📧 Email
   │  │  (deal-expiry,    │         (notifications@hub.nfstay.com)
   │  │   claim, bank)    │
   │  └──────────────────┘
   │
   ▼
┌──────────────────┐
│  n8n             │
│  (36 workflows)  │
│                  │
│  send-otp ───────┼──→ GHL ──→ 📱 WhatsApp (OTP code)
│  inbox-new-msg ──┼──→ GHL ──→ 📱 WhatsApp (landlord messages)
│  inbox-replied ──┼──→ GHL ──→ 📱 WhatsApp (operator messages)
│  inv-notify ─────┼──→ GHL ──→ 📱 WhatsApp (investment alerts)
│  inv-rent-sync ──┼──→ GHL ──→ 📱 WhatsApp (rent available)
│  inv-payout ─────┼──→ GHL ──→ 📱 WhatsApp (payout updates)
│  tuesday-batch ──┼──→ GHL ──→ 📱 WhatsApp (Hugo: batch ready)
│                  │
│  GHL Payment ────┼──→ Supabase (tier update)
│  admin-notify ───┼──→ Supabase (in-app bell)
└──────────────────┘
```

---

## EMAIL TYPES (Resend - via `send-email` Edge Function)

| # | Type Key | Subject | Recipient |
|---|----------|---------|-----------|
| 1 | `welcome-member` | Welcome to nfstay! 🏠 | New user |
| 2 | `new-signup-admin` | New User - {name} | Hugo (admin) |
| 3 | `new-deal-admin` | New Deal Submitted - {city} {type} | Hugo (admin) |
| 4 | `deal-approved-member` | Your deal has been approved - {city} | Member |
| 5 | `deal-rejected-member` | Update on your deal - {city} | Member |
| 6 | `deal-expired-member` | Your deal has expired - {city} | Member |
| 7 | `tier-upgraded-member` | Payment confirmed - you're upgraded! 🚀 | Member |
| 8 | `payout-requested-admin` | Payout Request - {name} (£{amount}) | Hugo (admin) |
| 9 | `payout-sent-member` | Payout sent - £{amount} 💰 | Agent |
| 10 | `new-referral-agent` | New referral signup - {name} joined! 🎉 | Agent |

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

## WHAT'S LIVE vs PLANNED

| Area | Email | WhatsApp | Status |
|------|:-----:|:--------:|--------|
| Signup + OTP | ✅ | ✅ | **LIVE** |
| Deal submission/approval | ✅ | - | **LIVE** |
| Deal expiry | ✅ | - | **LIVE** |
| Inbox messaging | - | ✅ | **LIVE** |
| Payment/tier | ✅ | - | **LIVE** |
| Affiliates | ✅ | - | **LIVE** |
| Investment purchases | ✅ | ✅ | **PLANNED** |
| Rent/payouts | ✅ | ✅ | **PLANNED** |
| Proposals/voting | ✅ | ✅ | **PLANNED** |
| Boost | ✅ | - | **PLANNED** |
