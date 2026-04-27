-- Swap mail.nfstay.com email addresses to hub.nfstay.com so they sit on the
-- working eu-west-1 Resend domain. PR 76 (multi-channel pivot), Hugo
-- 2026-04-27.
--
-- mail.nfstay.com was Resend ap-northeast-1 (Tokyo) — inbound dispatcher
-- broken on that region in our account. Hugo's call: "use hub.nfstay.com,
-- don't care about domain". hub.nfstay.com is eu-west-1, fully verified
-- for sending, receiving capability now also enabled via Resend API.
--
-- Hugo still needs to update DNS at GoDaddy (delete 3 Jellyfish MX records
-- on hub.nfstay.com + add one Resend MX) before inbound actually fires.
-- This migration just renames the addresses our app uses.

UPDATE wk_numbers
SET e164 = 'elijah@hub.nfstay.com'
WHERE channel = 'email'
  AND e164 = 'elijah@mail.nfstay.com';

UPDATE wk_numbers
SET e164 = 'georgia@hub.nfstay.com'
WHERE channel = 'email'
  AND e164 = 'georgia@mail.nfstay.com';

-- Update the wk_channel_credentials Resend row too.
UPDATE wk_channel_credentials
SET label = 'Resend hub.nfstay.com',
    meta = meta || jsonb_build_object(
      'domain', 'hub.nfstay.com',
      'region', 'eu-west-1',
      'addresses', jsonb_build_array(
        'elijah@hub.nfstay.com',
        'georgia@hub.nfstay.com'
      ),
      'note', 'Swapped from mail.nfstay.com (Tokyo, broken inbound) to hub.nfstay.com (eu-west-1) on 2026-04-27.'
    )
WHERE provider = 'resend';
