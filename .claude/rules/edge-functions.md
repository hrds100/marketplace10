# Edge Functions — Auto-loaded when editing supabase/functions/**

## Deploy Rules
- Source of truth: supabase/config.toml (verify_jwt settings)
- Deploy script: scripts/deploy-function.sh
- ALWAYS use --no-verify-jwt when deploying
- After deploy: verify function responds (not 401)
- NEVER hardcode tokens in scripts or code

## Structure
Edge functions stay FLAT — one folder per function (Supabase CLI requirement).
```
supabase/functions/
  send-otp/index.ts
  verify-otp/index.ts
  process-inquiry/index.ts
  ...
```

## Contract Rules
Each edge function has typed input/output in core/contracts/edge-functions.ts.
If you change what a function accepts or returns, update the contract.

## Domain Ownership
- auth: send-otp, verify-otp
- inquiry: process-inquiry, receive-tenant-whatsapp
- landlord: landlord-magic-login, claim-landlord-account, lead-magic-login
- admin: hard-delete-user, hard-delete-property, ghl-enroll, reset-for-testing
- ai: ai-chat, ai-description, airbnb-pricing, ai-parse-listing
- email: send-email, deal-expiry
- referral: track-referral
- wallet: particle-generate-jwt, particle-jwks
- banking: save-bank-details
- monitoring: health

## FROZEN edge functions (NEVER touch)
- inv-process-order, inv-approve-order, inv-crypto-confirm, inv-samcart-webhook
- revolut-pay, revolut-webhook, revolut-token-refresh, revolut-check-status
- submit-payout-claim
- nfs-stripe-checkout, nfs-stripe-webhook, nfs-stripe-connect-oauth
- nfs-domain-verify, nfs-hospitable-oauth, nfs-ical-feed, nfs-email-send
