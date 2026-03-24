# Cross-Repo Coordination Rules

> marketplace10 (hub.nfstay.com) and bookingsite (nfstay.app) share the same Supabase project.
> Changes to shared tables affect BOTH apps. Follow these rules to avoid breaking the other app.

## Shared infrastructure

| Resource | Project ID | Used by |
|----------|-----------|---------|
| Supabase DB + Auth | asazddtvjvmckouxcmmo | Both apps |
| Supabase Edge Functions | asazddtvjvmckouxcmmo | marketplace10 deploys, bookingsite calls |
| n8n Webhooks | n8n.srv886554.hstgr.cloud | Both apps (nfs- prefix for booking) |
| Vercel Team | hugos-projects-f8cc36a8 | Both apps (separate projects) |

## Shared Supabase tables

These tables are read/written by BOTH apps. Changing them requires coordination.

| Prefix | Tables | Primary owner | Also used by |
|--------|--------|--------------|-------------|
| nfs_ | nfs_properties, nfs_reservations, nfs_operators, nfs_users, nfs_promo_codes | bookingsite | marketplace10 admin |
| profiles | profiles (auth, tier, wallet) | marketplace10 | bookingsite (auth) |
| inv_ | inv_orders, inv_shareholders, inv_payouts, inv_commissions | marketplace10 | N/A (marketplace10 only) |
| aff_ | aff_commission_settings, affiliate_profiles, affiliate_events | marketplace10 | N/A (marketplace10 only) |

## Rules for cross-repo changes

### Adding a column to a shared table
1. Plan the migration in marketplace10 first (write the SQL)
2. Check: does bookingsite read this table? If yes, update bookingsite code too
3. Deploy marketplace10 branch first - preview and test
4. Deploy bookingsite branch - preview and test against marketplace10's branch
5. Hugo approves both previews
6. Merge marketplace10 to main FIRST
7. Merge bookingsite to main SECOND
8. Run Playwright audit on both sites after merge

### Changing an RLS policy
1. Check which app's queries will be affected
2. Test the policy change against BOTH apps' query patterns
3. Same deploy order as above (marketplace10 first, bookingsite second)

### Changing auth logic
1. Auth is shared - a change in marketplace10 affects bookingsite logins
2. STOP and tell Hugo before modifying any auth flow
3. Test sign-in on BOTH apps before merging

### Adding an edge function
1. Edge functions are deployed from marketplace10 via Supabase CLI
2. If bookingsite needs to call it, coordinate the deployment
3. Deploy edge function BEFORE deploying the bookingsite code that calls it

## Who deploys first?

Always marketplace10 first, bookingsite second. This is because:
- marketplace10 owns the Supabase migrations
- marketplace10 owns the edge functions
- bookingsite is the consumer, not the owner

## Red flags (STOP and ask Hugo)

- Adding/removing a column on nfs_* or profiles table
- Changing RLS policy on any shared table
- Modifying auth flow (SignIn, SignUp, OTP, social login)
- Deploying a new edge function that bookingsite will call
- Changing n8n webhook URLs or payloads that both apps use
