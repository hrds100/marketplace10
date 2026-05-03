-- Seed CRM message templates for sending agreement links.
-- WhatsApp + email variants. Agents pick from template list in inbox.

INSERT INTO wk_sms_templates (name, body_md, is_global, channel, subject, owner_agent_id, move_to_stage_id)
VALUES
  (
    'Agreement — WhatsApp',
    E'Hi {first_name},\n\nFollowing our conversation, I''ve prepared your Token Sale Agreement for the Pembroke Place opportunity.\n\nPlease review the terms and sign here:\nhub.nfstay.com/agreement/TOKEN\n\nOnce signed, you''ll be taken straight to the secure payment page.\n\nLet me know if you have any questions.\n\nBest,\n{agent_first_name}\nnfstay',
    true,
    'whatsapp',
    NULL,
    NULL,
    NULL
  ),
  (
    'Agreement — Email',
    E'Hi {first_name},\n\nThank you for your interest in the Pembroke Place property.\n\nI''ve prepared a Token Sale Agreement for your review. This document outlines the investment terms, property details, financial projections, and your rights as a token holder.\n\nPlease review and sign the agreement here:\nhub.nfstay.com/agreement/TOKEN\n\nAfter signing, you''ll be redirected to complete your secure payment.\n\nIf you have any questions about the terms or the property, don''t hesitate to reach out.\n\nKind regards,\n{agent_first_name}\nnfstay | hub.nfstay.com',
    true,
    'email',
    'Your Token Sale Agreement — Pembroke Place',
    NULL,
    NULL
  )
ON CONFLICT DO NOTHING;
