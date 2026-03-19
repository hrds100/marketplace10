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

*Last updated: 2026-03-19*
