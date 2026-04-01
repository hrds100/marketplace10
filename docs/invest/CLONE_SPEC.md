# Investment 100% Clone Spec

> Approved direction on 2026-04-01. This document freezes the rule for the investment rebuild: clone the proven product first, redesign later.

---

## 1. Decision

The investment module is **not** being redesigned on the first rebuild pass.

The goal is:

- **clone the working legacy investment experience as closely as possible**
- **keep shared login on Supabase**
- **replace only the payout bank layer and the affiliate/referral plumbing where required**
- **delay any visual redesign until after parity is live and verified**

This is the lowest-risk path.

---

## 2. The Rule In One Sentence

**If changing it creates avoidable risk, do not change it during the clone.**

That applies to:

- layout
- flow order
- wording
- button intent
- wallet sequence
- property presentation
- share purchase journey
- proposal voting journey
- payout choices
- agent journey

---

## 3. What "100% Clone" Means

For investment, "100% clone" means the rebuilt version must preserve the same proven user experience unless this document explicitly allows a change.

### Must stay the same

- The way investment properties are presented
- The order of information on property/investment pages
- The sequence of actions in buy flow
- The sequence of actions in payout flow
- The sequence of actions in governance/proposals
- The sequence of actions in agent/referral flow
- All core wording that affects decision-making, trust, or conversion
- Wallet prompts and transaction checkpoints
- The contract interactions and subgraph behavior
- The overall "feel" of the working investment product

### Must not happen in clone phase

- New investment UI system
- New information architecture for investment pages
- Restyled cards "just because"
- Renamed flow steps
- Reordered calls to action
- Simplified or shortened purchase flow without proof
- New investment dashboard concepts
- Migrating all legacy business data into Supabase on day one

---

## 4. Allowed Changes In Clone Phase

Only these changes are allowed before parity is proven:

### A. Shared login

Investment must use the same shared login system as the rest of NF Stay.

- **Supabase Auth is the master identity system**
- User signs in through the shared NF Stay auth flow
- After sign-in, the app maps the Supabase user to the legacy investment identity where needed

### B. Bank payout layer

The old bank payout handling does **not** have to be cloned exactly.

Allowed replacement:

- Revolut bank payout flow
- `user_bank_accounts`
- `payout_claims`
- `payout_audit_log`
- Tuesday batch approval flow

### C. Affiliate / referral plumbing

The user-facing agent experience should stay the same, but the plumbing may be updated.

Allowed replacement:

- referral tracking implementation
- commission write path
- payout request path
- admin commission settings path

### D. Shared platform shell

The investment clone may live inside the new shared NF Stay app structure as long as the investment experience itself remains effectively the same.

Allowed adaptation:

- shared app shell
- shared route guards
- shared Supabase client
- shared notification adapters
- shared env handling

---

## 5. System Of Record During Clone Phase

The clone phase uses a split model on purpose.

### Shared identity

- **Supabase Auth**
- shared profile / role / session
- same login across marketplace, booking, and investment

### Legacy investment behavior

- legacy frontend behavior is the visual and flow reference
- legacy backend behavior is the operational reference
- blockchain + The Graph remain the source of truth for on-chain investment state

### Current platform services we keep

- n8n
- GHL
- Resend
- Supabase edge functions
- Vercel preview flow

---

## 6. Legacy Source Of Truth

The working legacy investment reference is:

- **Local path:** `/Users/hugo/Downloads/AI Folder/archive-openclaw/nfstay-org`
- **Legacy frontend:** `/Users/hugo/Downloads/AI Folder/archive-openclaw/nfstay-org/frontend`
- **Legacy backend:** `/Users/hugo/Downloads/AI Folder/archive-openclaw/nfstay-org/backend`

### What the legacy stack uses

- **MongoDB** for legacy app records
- **Firebase** for notification/messaging services
- **Blockchain + The Graph** for investment state and history

### Important consequence

During the first clone pass:

- **Supabase handles login**
- **legacy investment data may remain on legacy services where needed**
- **we do not force a full data migration first**

If we migrate legacy investment records too early, we create unnecessary risk.

---

## 7. Pages And Flows To Clone

The first investment clone must preserve these user journeys:

### 1. Investment marketplace

- investment property listing grid
- property card structure
- investment property details
- amount entry
- card vs crypto purchase choice

### 2. Purchase flow

- SamCart purchase path
- crypto purchase path
- wallet approval sequence
- post-purchase confirmation path

### 3. Portfolio

- holdings
- current positions
- returns / earnings presentation
- reward / boost / APR surfaces where already proven

### 4. Payouts

- visible claimable payout state
- claim action
- same payout decision logic
- same user understanding of what happens next

### 5. Proposals / governance

- active proposal list
- vote path
- results / participation behavior

### 6. Agent / affiliate journey

- referral code ownership
- referral link sharing
- commission visibility
- payout visibility

---

## 8. Exact Clone Rules By Area

### Properties

Properties must be listed the same way as the working investment product.

Do not change:

- listing order logic unless proven necessary
- information blocks
- primary metrics shown
- trust signals
- CTA placement

### Property detail page

Property detail layout must remain functionally the same.

Do not change:

- hero/content order
- investment numbers presentation
- purchase CTA placement
- legal/trust sections
- supporting data blocks

### Buy flow

Buy flow must remain functionally the same.

Do not change:

- purchase entry logic
- wallet interaction sequence
- SamCart handoff behavior
- crypto confirmation checkpoints

### Payout flow

User-facing payout choices should feel the same except where bank handling must change.

Allowed difference:

- bank path may route to the new Revolut-based implementation

Not allowed:

- changing payout meaning
- changing when a user believes funds become claimable
- changing visible status names without reason

### Affiliate flow

The visible journey should remain the same to the user.

Allowed difference:

- backend commission tracking
- backend referral attribution logic
- payout processing path

---

## 9. Shared Login Rule

Investment must share the same login as the rest of NF Stay.

### Required model

- user signs in through shared Supabase auth
- shared session is used across apps
- investment screens read the signed-in Supabase user
- if legacy mapping is needed, the system resolves the user after sign-in

### Not required on day one

- full migration of legacy user records into Supabase investment tables
- replacing every old backend dependency before parity exists

### Why

Shared login is mandatory.
Full legacy data migration is not mandatory for the clone to work.

---

## 10. Email / WhatsApp / Notification Rule

Keep the communication behavior stable during clone phase.

### Keep

- Resend for transactional email sending
- n8n for orchestration
- GHL where already required

### Do not redesign

- email types
- payout notification intent
- purchase notification intent
- admin notification intent

Only change internals if needed for reliability.

---

## 11. Non-Negotiable No-Change Areas

These are locked during clone phase unless Hugo explicitly approves breaking parity:

- investment property UI structure
- buy flow structure
- payout decision structure
- proposal flow structure
- agent flow structure
- major copy and wording
- wallet flow sequence
- contract interaction semantics

---

## 12. What Happens After Clone Works

Only after the investment clone is verified on Vercel preview and behaves correctly do we move to the redesign phase.

### Phase 2 may include

- new visual design
- new shared UI language
- cleaner card system
- improved spacing/typography
- cleaner admin experience
- merged data services if still desirable

### Phase 2 may not begin until

- shared login works
- buy flow works
- payout flow works
- proposal flow works
- affiliate flow works
- preview verification is complete

---

## 13. Acceptance Standard For Clone Phase

The clone phase is done only when all of these are true:

1. A signed-in shared Supabase user can enter the investment area.
2. Investment properties are shown in the same practical way as legacy.
3. The buy journey matches the proven legacy behavior.
4. The payout journey matches the proven legacy behavior except for approved bank-path replacement.
5. The affiliate journey still behaves the same for the user.
6. The app passes preview verification without breaking the rest of the platform.
7. No redesign decisions were smuggled into the clone.

---

## 14. Implementation Order

Use this order only:

1. Shared login and identity mapping
2. Clone investment marketplace and property detail behavior
3. Clone buy flow
4. Clone portfolio behavior
5. Clone proposals behavior
6. Clone payout behavior
7. Replace bank payout implementation where required
8. Replace affiliate/referral plumbing where required
9. Verify parity on preview
10. Only then discuss redesign

---

## 15. Plain-English Summary

The investment product is the one part of NF Stay where "clean rebuild" is **not** the first move.

For investment, the first move is:

- copy what already works
- keep the same experience
- connect it to shared Supabase login
- leave the legacy behavior intact where needed
- only swap out the payout-bank and affiliate plumbing

After that works, we can make it prettier.
Not before.

