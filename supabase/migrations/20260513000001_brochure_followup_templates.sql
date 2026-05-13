-- Brochure follow-up templates (SMS, WhatsApp, Email) for cold-call leads.
-- Uses Hugo's exact template text. Elijah signs off on all three.
-- Brochure PDF attached manually (no attachment support in CRM yet).

INSERT INTO wk_sms_templates (name, body_md, channel, subject, is_global, owner_agent_id, move_to_stage_id)
VALUES
  (
    'Brochure — SMS',
    E'Hi {first_name},\n\nAs per our quick conversation, please see the brochure attached. This is a rent-to-rent Airbnb property, we rent it from the landlord on a long lease and list it on Airbnb for profit. You can join the joint venture from just £500.\n\nYou can also view the full deal directly on our website: nfstay.com\n\n{agent_first_name},\nnfstay.com',
    'sms',
    NULL,
    true,
    NULL,
    NULL
  ),
  (
    'Brochure — WhatsApp',
    E'Hi {first_name},\n\nAs per our quick conversation, please see the brochure attached. This is a rent-to-rent Airbnb property, we rent it from the landlord on a long lease and list it on Airbnb for profit. You can join the joint venture from just £500.\n\nYou can also view the full deal directly on our website: nfstay.com\n\n{agent_first_name},\nnfstay.com',
    'whatsapp',
    NULL,
    true,
    NULL,
    NULL
  ),
  (
    'Brochure — Email',
    E'Hi {first_name},\n\nAs per our quick conversation, please see the brochure attached. This is a rent-to-rent Airbnb property, we rent it from the landlord on a long lease and list it on Airbnb for profit. You can join the joint venture from just £500.\n\nYou can also view the full deal directly on our website: nfstay.com\n\n{agent_first_name},\nnfstay.com',
    'email',
    'Brochure — Airbnb Joint Venture from £500',
    true,
    NULL,
    NULL
  )
ON CONFLICT DO NOTHING;
