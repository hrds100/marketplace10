# NFsTay Wallet & Auth Architecture

## Overview

This document describes the complete wallet creation flow, security model, recovery procedures, and backup strategy for the NFsTay investment platform.

---

## User Sign-Up Flow

```
  User
   │
   │  1. name, email, password, WhatsApp
   ▼
 ┌──────────────┐    2. Create account     ┌─────────────────────┐
 │   SignUp.tsx  │ ──────────────────────►  │   Supabase Auth     │
 │              │                          │                     │
 │  hub.nfstay  │                          │  UUID: a1b2c3...    │
 │   .com       │  ◄──────────────────────  │  email + password   │
 └──────┬───────┘    session returned      │  user_metadata      │
        │                                  └─────────┬───────────┘
        │  3. Redirect                               │
        ▼                                            │ profile row created
 ┌──────────────┐                                    ▼
 │ VerifyOtp.tsx│                          ┌─────────────────────┐
 │              │                          │  profiles table     │
 │  Enter 4-    │                          │                     │
 │  digit code  │                          │  id: a1b2c3...      │
 └──────┬───────┘                          │  name: "Hugo"       │
        │                                  │  whatsapp: +44...   │
        │  4. OTP verified                 │  whatsapp_verified  │
        │                                  │  wallet_address: ?  │
        │  5. Generate JWT                 └─────────────────────┘
        ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                    SUPABASE EDGE FUNCTION                       │
 │                 particle-generate-jwt                           │
 │                                                                 │
 │   Input:  { user_id: "a1b2c3..." }                             │
 │                                                                 │
 │   Signs JWT with RSA private key (PARTICLE_JWT_PRIVATE_KEY)    │
 │                                                                 │
 │   Output: { jwt: "eyJhbGciOiJSUzI1NiIs..." }                  │
 │                                                                 │
 │   Payload: {                                                    │
 │     sub: "a1b2c3...",      <- Supabase UUID (never changes)    │
 │     iss: "hub.nfstay.com",                                     │
 │     exp: 1hr                                                    │
 │   }                                                             │
 └──────────────────────────┬──────────────────────────────────────┘
                            │
                            │  JWT stored in sessionStorage
                            ▼
                   ┌─────────────────┐
                   │   Redirect to   │
                   │   /dashboard    │
                   └────────┬────────┘
                            │
                            ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                      DASHBOARD LAYOUT                           │
 │                                                                 │
 │  ┌─────────────────────────────────────┐                       │
 │  │      WalletProvisioner.tsx          │  (runs once, silent)  │
 │  │                                     │                       │
 │  │  1. Check profiles.wallet_address   │                       │
 │  │     -> null? Continue...            │                       │
 │  │                                     │                       │
 │  │  2. Get JWT from sessionStorage     │                       │
 │  │     or generate fresh one           │                       │
 │  │                                     │                       │
 │  │  3. Lazy-load Particle SDK (1MB)    │                       │
 │  │     (separate chunk, not in         │                       │
 │  │      main bundle)                   │                       │
 │  └──────────────┬──────────────────────┘                       │
 └─────────────────┼──────────────────────────────────────────────┘
                   │
                   │  4. particleAuth.init() + connect()
                   ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                     PARTICLE NETWORK (External)                         │
 │                                                                         │
 │   Step A: Verify JWT                                                    │
 │   ──────────────────                                                    │
 │   Particle fetches our JWKS endpoint:                                   │
 │   GET .../functions/v1/particle-jwks                                    │
 │                                                                         │
 │   ┌─────────────────────────┐                                          │
 │   │  particle-jwks          │                                          │
 │   │  (Edge Function)        │                                          │
 │   │                         │                                          │
 │   │  Returns PUBLIC key     │                                          │
 │   │  in JWK format          │                                          │
 │   │  kid: "nfstay-hub-1"    │                                          │
 │   └─────────────────────────┘                                          │
 │                                                                         │
 │   Verifies: signature matches, not expired, sub = "a1b2c3..."         │
 │                                                                         │
 │   Step B: Create MPC Wallet                                             │
 │   ─────────────────────────                                             │
 │                                                                         │
 │   ┌─────────────────┐    ┌─────────────────┐                          │
 │   │   KEY SHARE 1   │    │   KEY SHARE 2   │                          │
 │   │                 │    │                 │                          │
 │   │  Particle's     │    │  User's         │                          │
 │   │  server         │    │  browser        │                          │
 │   │                 │    │                 │                          │
 │   │  Can't sign     │    │  Can't sign     │                          │
 │   │  alone          │    │  alone          │                          │
 │   └────────┬────────┘    └────────┬────────┘                          │
 │            │                      │                                    │
 │            └──────────┬───────────┘                                    │
 │                       │                                                │
 │                       ▼                                                │
 │              BOTH NEEDED TO SIGN                                       │
 │              any transaction                                           │
 │                                                                         │
 │   Returns: wallet address 0x9b35C61598a4b7952CACcCa3E6C...            │
 └─────────────────────────────┬───────────────────────────────────────────┘
                               │
                               │  5. Save to Supabase
                               ▼
                    ┌─────────────────────┐
                    │  profiles table     │
                    │                     │
                    │  wallet_address:    │
                    │  0x9b35C615...      │
                    │                     │
                    │  DONE               │
                    └─────────────────────┘
```

---

## Recovery Scenarios

### Scenario 1: User clears browser / new device

```
User signs in (email + password)
  │
  ▼
WalletProvisioner checks profiles.wallet_address
  │
  ├── wallet_address EXISTS -> done, wallet shown
  │
  └── wallet_address NULL -> generate JWT -> Particle reconnects
                               using same UUID ("a1b2c3...")
                               -> wallet restored
```

### Scenario 2: User forgets password

```
User clicks "Forgot password"
  │
  ▼
Supabase sends reset email -> user sets new password -> signs in
  │
  ▼
Same UUID -> same JWT sub -> Particle reconnects -> wallet back
```

### Scenario 3: User loses WhatsApp number

```
User still has email + password
  │
  ▼
Signs in normally -> wallet tied to UUID, not phone -> wallet back
(WhatsApp is for OTP only, not for wallet identity)
```

### Scenario 4: Admin intervention needed

```
User locked out completely (lost email + phone)
  │
  ▼
Admin goes to Supabase Dashboard -> Auth -> Users
  │
  ├── Reset password manually
  ├── Update email
  └── Re-trigger wallet: delete wallet_address -> user logs in -> auto-recreated
```

---

## Security Layers

### What's Safe

| Layer | Protection |
|-------|-----------|
| JWT Private Key | Only in Supabase Edge Function secrets. Never exposed to browser |
| Wallet Private Key | Split across 2 parties (MPC). Nobody holds the full key |
| On-chain Funds | Live on BNB Chain, not in any database. Survive any server failure |
| Wallet Address | Backed up in Supabase profiles table + Supabase backup |
| User Identity | Supabase UUID never changes. Wallet recovery always works via JWT |

### What To Protect

| Risk | Severity | Mitigation |
|------|----------|------------|
| PARTICLE_JWT_PRIVATE_KEY leaked | HIGH | Rotate key immediately + update Particle dashboard JWKS |
| OTP hardcoded to 3467 | HIGH | Implement real OTP verification |
| /reset-password route missing | MEDIUM | Build the page so forgot-password flow works |
| Particle Network goes offline permanently | LOW | Funds safe on-chain but can't be moved. Particle has export/recovery procedures |
| Supabase project deleted | LOW | Restore from backup. UUIDs preserved = wallets reconnect via JWT |

---

## Where Data Lives (Backup Map)

```
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
 │   SUPABASE      │     │   BNB CHAIN     │     │  PARTICLE NETWORK   │
 │   (your DB)     │     │   (blockchain)  │     │  (wallet service)   │
 │                 │     │                 │     │                     │
 │  * User accounts│     │  * Share tokens │     │  * Key Share 1      │
 │  * Profiles     │     │  * USDC balance │     │  * Wallet metadata  │
 │  * wallet_addr  │     │  * Rent pools   │     │  * MPC state        │
 │  * Bank details │     │  * Vote records │     │                     │
 │  * Commissions  │     │  * Tx history   │     │  Recoverable via    │
 │                 │     │                 │     │  JWT with same UUID │
 │  YOUR BACKUP    │     │  IMMUTABLE      │     │  DEPENDS ON THEM    │
 │  (Supabase Pro) │     │  (public ledger)│     │  (3rd party)        │
 └─────────────────┘     └─────────────────┘     └─────────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                         ALL THREE NEEDED
                        for full system to work

                   But if ONE fails:
                   ┌────────────────────────────────────────┐
                   │ Supabase down -> restore from backup   │
                   │ BNB Chain down -> impossible (it won't)│
                   │ Particle down -> funds safe, can't sign│
                   └────────────────────────────────────────┘
```

---

## Admin Capabilities

| Action | How |
|--------|-----|
| See any user's wallet | `profiles.wallet_address` in Supabase |
| See on-chain balances | BscScan.com -> paste wallet address |
| Re-trigger wallet creation | Delete `wallet_address` from profile -> user logs in -> WalletProvisioner creates new one |
| Reset a user's password | Supabase Dashboard > Auth > Users > find user > reset |
| Re-issue JWT manually | Call `particle-generate-jwt` Edge Function with user_id |
| View all transactions | The Graph subgraph indexes every on-chain event |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/WalletProvisioner.tsx` | Auto-creates wallet on dashboard load |
| `src/components/ParticleWalletCreator.tsx` | Particle auth-core init + connect (no React wrapper) |
| `src/lib/particleIframe.ts` | Lazy-loads Particle SDK, exports `createParticleWallet()` |
| `src/lib/particle.ts` | Particle credentials, contract addresses, chain config |
| `src/hooks/useWallet.ts` | Wallet state + fallback retry logic |
| `supabase/functions/particle-generate-jwt/index.ts` | Signs JWT with RSA private key |
| `supabase/functions/particle-jwks/index.ts` | Serves public key for Particle verification |
| `src/pages/VerifyOtp.tsx` | OTP verification + JWT generation |
| `src/pages/SettingsPage.tsx` | Payout Address display + copy button |

---

## Troubleshooting

### Wallet not created after signup

**Symptoms:** User signs up, verifies OTP, lands on dashboard, but `profiles.wallet_address` is null.

**Diagnosis:**
1. Open browser console (F12) → look for `[WalletProvisioner]` logs
2. If `No wallet — starting creation...` appears but no `Wallet created:` → Particle SDK failed
3. If no `[WalletProvisioner]` log at all → component didn't mount (check DashboardLayout)

**Common causes:**
| Cause | Fix |
|-------|-----|
| Particle SDK WASM not loading | Check `dist/assets/thresh_sig_wasm_bg*.wasm` exists. Rebuild if missing |
| JWT generation failed | Check `PARTICLE_JWT_PRIVATE_KEY` is set in Supabase Edge Function secrets |
| Particle overlay blocking page | CSS in `index.css` hides overlays. If too aggressive, wallet creation breaks. Only hide `pn-modal`, `pn-auth`, `particle-auth-core-modal` |
| JWKS endpoint down | Test: `curl https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/particle-jwks` — should return JSON with public key |
| Particle dashboard misconfigured | Login to Particle dashboard → check JWT JWKS URL is set to our endpoint |

**Manual fix for a specific user:**
```sql
-- In Supabase SQL Editor: clear wallet so WalletProvisioner retries
UPDATE profiles SET wallet_address = NULL WHERE id = 'USER_UUID_HERE';
-- User logs in again → wallet auto-created
```

### Particle overlay blocking clicks

**Symptoms:** User can see the page but can't click anything. Invisible layer on top.

**Cause:** Particle SDK injects modal/overlay divs with high z-index.

**Fix (already applied):** CSS in `src/index.css` sets `pointer-events: none; opacity: 0; z-index: -1` on Particle modal classes. If the selectors need updating, inspect the DOM for new Particle class names.

**Important:** Do NOT hide elements with `[id*="particle"]` or `iframe[src*="particle"]` — Particle needs its internal iframes for MPC/WASM key operations. Only hide the visible modal overlays.

### JWT key rotation

**If you need to rotate the RSA key pair:**

1. Generate new RSA key pair
2. Update `PARTICLE_JWT_PRIVATE_KEY` in Supabase Edge Function secrets
3. Update the public key `n` value in `supabase/functions/particle-jwks/index.ts`
4. Redeploy both edge functions
5. **Critical:** Update Particle dashboard JWKS URL or register new key — otherwise Particle can't verify new JWTs and ALL wallet creation stops
6. Old wallets are unaffected — they're already created

### Particle Network outage

**If Particle is down:**
- Wallet creation silently fails (non-blocking)
- Users can still use the app — wallet is optional until they do blockchain transactions
- Existing wallets still work for on-chain reads (via The Graph)
- On-chain writes (buy shares, claim rent, vote) require Particle to sign transactions
- Funds are SAFE on-chain — they don't move without a valid signature

### Vercel deployment checklist (wallet-related)

- [ ] `dist/assets/thresh_sig_wasm_bg*.wasm` exists in build output
- [ ] `ParticleWalletCreator-*.js` chunk is separate from main bundle
- [ ] Supabase Edge Functions `particle-generate-jwt` and `particle-jwks` are deployed
- [ ] `PARTICLE_JWT_PRIVATE_KEY` is set in Supabase secrets
- [ ] Particle dashboard has JWKS URL: `https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/particle-jwks`

---

*Last updated: 2026-03-19*
