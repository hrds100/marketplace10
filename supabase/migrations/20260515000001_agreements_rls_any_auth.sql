-- Fix: agreements INSERT was restricted to 3 admin emails.
-- CRM agents (like Elijah) need to send agreements too.
-- Change INSERT policy to allow any authenticated user.

DROP POLICY IF EXISTS "agreements_admin_insert" ON agreements;

CREATE POLICY "agreements_auth_insert"
  ON agreements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
