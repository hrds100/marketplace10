-- Add Hugo as a CRM contact for testing brochure templates.
INSERT INTO wk_contacts (name, phone, email)
VALUES ('Hugo', '+447863992555', 'hugodesouzax@gmail.com')
ON CONFLICT DO NOTHING;
