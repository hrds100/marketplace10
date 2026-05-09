-- Seed the 3 agreement message templates (SMS, WhatsApp, Email) so they
-- are editable from /crm/templates. SendAgreementModal reads these by
-- name prefix "Agreement —" and falls back to hardcoded text if missing.

INSERT INTO wk_sms_templates (name, body_md, channel, subject, is_global, owner_agent_id, move_to_stage_id)
VALUES
  (
    'Agreement — SMS',
    E'Hi {first_name},\n\nI''ve prepared your Partnership Agreement for the {property_title} opportunity.\n\nReview and sign here:\n{agreement_url}\n\nBest,\n{agent_first_name}\nnfstay',
    'sms',
    NULL,
    true,
    NULL,
    NULL
  ),
  (
    'Agreement — WhatsApp',
    E'Hi {first_name},\n\nFollowing our conversation, I''ve prepared your Partnership Agreement for the {property_title} opportunity.\n\nPlease review the terms and sign here:\n{agreement_url}\n\nOnce signed, you''ll be taken straight to the secure payment page.\n\nLet me know if you have any questions.\n\nBest,\n{agent_first_name}\nnfstay',
    'whatsapp',
    NULL,
    true,
    NULL,
    NULL
  ),
  (
    'Agreement — Email',
    E'Hi {first_name},\n\nThank you for your interest in the {property_title} property.\n\nI''ve prepared a Partnership Agreement for your review. This document outlines the deal details, allocation terms, financial projections, and your rights as a partner.\n\nPlease review and sign the agreement here:\n{agreement_url}\n\nAfter signing, you''ll be redirected to complete your secure payment.\n\nBest,\n{agent_first_name}\nnfstay\nhub.nfstay.com',
    'email',
    'Your Partnership Agreement — {property_title}',
    true,
    NULL,
    NULL
  )
ON CONFLICT DO NOTHING;
