-- Fix brochure template line breaks — ensure proper spacing between paragraphs.
-- The E'\n' syntax should work, but this UPDATE uses chr(10) to guarantee real newlines.

UPDATE wk_sms_templates
SET body_md = 'Hi there,' || chr(10) || chr(10) ||
  'As per our quick conversation, please see the brochure attached. This is a rent-to-rent Airbnb property, we rent it from the landlord on a long lease and list it on Airbnb for profit. You can join the joint venture from just £500.' || chr(10) || chr(10) ||
  'You can also view the full deal directly on our website: nfstay.com' || chr(10) || chr(10) ||
  'Elijah,' || chr(10) ||
  'nfstay.com'
WHERE name LIKE 'Brochure Follow-Up%';
