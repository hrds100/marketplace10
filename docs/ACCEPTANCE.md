# NFsTay — Acceptance Scenarios (BDD)

_Last updated: 2026-03-16_

> **Project-wide behavior in Given/When/Then form.** For feature or flow work, the prompt to Claude must include the relevant scenarios; implementation must satisfy them. See `docs/DOMAIN.md` for terms.

---

## Auth & sign-up

- **Sign-up**
  - Given I am on the sign-up page, When I submit valid email, password, name, and phone, Then I am created in auth and a profile row exists, and I am prompted for OTP verification.
  - Given I have just signed up, When I enter the correct OTP, Then my profile has whatsapp_verified true and I can access the dashboard.

- **Sign-in**
  - Given I have an account with verified phone, When I sign in with correct email and password, Then I am redirected to the dashboard and my session persists (localStorage).
  - Given I checked "Remember me" and signed in successfully, When I open the sign-in page again, Then the email field is pre-filled (password is never stored).

- **Forgot password**
  - Given I am on forgot-password, When I submit my email, Then I receive a reset link (or see the success message) and can reset from the link.

---

## Deals & listing

- **Browse deals**
  - Given I am signed in, When I go to /dashboard/deals, Then I see live deals (from properties table) and can open a deal detail page.

- **List a deal**
  - Given I am signed in, When I submit the list-a-deal form with required fields, Then a property row is created, admin is notified via n8n, and I see my listing in My Listings.

- **Inquire (start conversation)**
  - Given I am a tenant and I am on a deal page, When I click "Inquire Now", Then I am taken to the inbox with a thread created or selected for that property (deal query param).

---

## Inbox & messaging (canonical flows)

- **Tenant — first message requires payment**
  - Given I am the tenant (operator) in a thread with no messages yet, When I try to type or send a message, Then the payment gate (PaymentSheet / GHL) is shown and I cannot send until I have a paid tier.
  - Given I am the tenant and I have a paid tier (or the thread already has messages), When I type and send, Then the message is saved and the other party can see it (Realtime).

- **Landlord — first reply requires NDA**
  - Given I am the landlord in a thread where the NDA is not yet signed, When I try to type or send a reply, Then the NDA modal or "Sign NDA to reply" flow is shown and I cannot send until I sign.
  - Given I am the landlord and I have signed the NDA, When I type and send, Then the message is saved and the tenant sees it; contact details (phone/email) are visible in the right panel for me.

- **Both sides see the conversation**
  - Given I am either the tenant or the landlord in a thread, When I open the inbox, Then I see that thread in the list (thread list loads for both operator_id and landlord_id).
  - Given a new message is inserted in the DB, When I have the thread open, Then I see the new message without refreshing (Realtime).

- **Payment success after redirect**
  - Given I paid in GHL and was redirected to hub.nfstay.com/dashboard/inbox?payment=success, When the page loads, Then my tier is refreshed and the inbox input is unlocked (no manual copy-paste of payment status).

---

## Payments & tier

- **Payment unlocks tenant messaging**
  - Given I am a free-tier tenant, When I complete payment in the GHL funnel (or return with ?payment=success), Then my profile.tier is updated (via n8n) and the inbox shows the input as unlocked for my first message.

- **Settings — membership**
  - Given I am signed in, When I open Settings → Membership, Then I see my current tier and upgrade options; "Manage Plan" or upgrade cards open the GHL funnel.

---

## CRM

- **Pipeline**
  - Given I have deals in my CRM, When I drag a deal to another stage, Then the crm_deals row is updated and the move is reflected (and optionally n8n is notified).

---

## Admin

- **Admin access**
  - Given my email is in the admin list, When I sign in, Then I can access /admin/* routes; otherwise I am redirected or blocked.

- **Admin actions**
  - Given I am an admin, When I perform an action that modifies or deletes data (e.g. approve/reject listing, suspend user), Then a row is written to admin_audit_log and a toast is shown.

---

## How to use these

- **Phase 1 (Prompt Refinement):** When refining a prompt for feature or flow work, copy the relevant Given/When/Then blocks into the execution prompt so they are treated as required behavior.
- **Phase 2 (Execution):** When the prompt includes acceptance scenarios, implement so the behaviors hold and verify before marking DONE. "Verify" means: run the affected flow once and report what you did and saw, or give Hugo a 2–4 step checklist. Do not mark scenarios as held without one of these. Add or adjust tests if needed.
- **New flows:** When adding a new feature, add new scenarios here and reference `docs/DOMAIN.md` for terms.
- **Full protocol:** `docs/AGENT_INSTRUCTIONS.md` — Section 2 (two-phase protocol), Section 3d (acceptance scenarios in execution).
