-- Fix Hugo's contact: clean up duplicates and re-insert with correct details.
-- Two rows existed: "Hugo de Souza" (+447863992555, wrong email) and
-- "Hugo Doe" (+4478863992555, wrong phone). Both deleted, one correct row added.
DELETE FROM wk_contacts WHERE phone = '+447863992555';
DELETE FROM wk_contacts WHERE email = 'hugodesouzax@gmail.com' AND phone != '+447863992555';

INSERT INTO wk_contacts (name, phone, email)
VALUES ('Hugo', '+447863992555', 'hugodesouzax@gmail.com')
ON CONFLICT DO NOTHING;
