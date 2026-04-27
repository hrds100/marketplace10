-- Backfill dummy subject lines on existing wk_sms_templates that have no
-- subject yet. Hugo 2026-04-27: "the one that's already made it just put
-- a dummy subject there so it's ready" — so when the agent sends one of
-- these as an email, the subject line is pre-populated and they can
-- override on the spot.
--
-- Only touches rows where subject IS NULL. Universal (channel=NULL) and
-- email templates both get a subject. SMS / WhatsApp templates are left
-- alone — they ignore subject anyway and a backfill might confuse later
-- exports.

UPDATE wk_sms_templates
SET subject = COALESCE(NULLIF(subject, ''), 'Re: ' || name)
WHERE (channel IS NULL OR channel = 'email')
  AND (subject IS NULL OR subject = '');
