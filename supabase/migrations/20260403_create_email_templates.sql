-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  html_body text NOT NULL,
  variables text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY admin_select_email_templates ON email_templates FOR SELECT USING (
  auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
);
CREATE POLICY admin_update_email_templates ON email_templates FOR UPDATE USING (
  auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
);
CREATE POLICY admin_insert_email_templates ON email_templates FOR INSERT WITH CHECK (
  auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
);
-- Service role can always read (for edge functions)
CREATE POLICY service_role_select_email_templates ON email_templates FOR SELECT USING (true);

-- Seed templates
INSERT INTO email_templates (type, label, category, subject, html_body, variables) VALUES
  ('new-deal-admin', 'New deal submitted (admin)', 'admin', 'New Deal Submitted - {{city}} {{type}}', '<p>New deal submitted</p>', ARRAY['name', 'city', 'postcode', 'type', 'rent', 'contactName', 'contactEmail']),
  ('new-signup-admin', 'New user signup (admin)', 'admin', 'New User - {{name}}', '<p>New user signed up</p>', ARRAY['name', 'email', 'phone']),
  ('payout-requested-admin', 'Payout requested (admin)', 'admin', 'Payout Request - {{name}} (£{{amount}})', '<p>An agent has requested a payout.</p>', ARRAY['name', 'amount', 'paypal', 'email']),
  ('inv-purchase-admin', 'New allocation (admin)', 'admin', 'New allocation — ${{amount}} from {{buyerName}}', '<p>New allocation purchase</p>', ARRAY['buyerName', 'buyerEmail', 'property', 'amount', 'shares', 'agentName', 'commission']),
  ('deal-approved-member', 'Deal approved', 'member', 'Your deal has been approved - {{city}}', '<p>Your property in <strong>{{city}}</strong> has been approved and is now live.</p>', ARRAY['memberEmail', 'city', 'name']),
  ('deal-rejected-member', 'Deal rejected', 'member', 'Update on your deal - {{city}}', '<p>Your submitted property in <strong>{{city}}</strong> was not approved.</p>', ARRAY['memberEmail', 'city', 'name', 'reason']),
  ('deal-expired-member', 'Deal expired', 'member', 'Your deal has expired - {{city}}', '<p>Your property listing in <strong>{{city}}</strong> has expired.</p>', ARRAY['memberEmail', 'city', 'name', 'newStatus', 'days']),
  ('welcome-member', 'Welcome email', 'member', 'Welcome to nfstay!', '<p>Welcome to the UK rent-to-rent property marketplace.</p>', ARRAY['email', 'name']),
  ('tier-upgraded-member', 'Tier upgraded', 'member', 'Payment confirmed - you''re upgraded!', '<p>Your payment has been processed and your account has been upgraded.</p>', ARRAY['email', 'tier']),
  ('payout-sent-member', 'Payout sent', 'member', 'Payout sent - £{{amount}}', '<p>Your commission payout has been sent.</p>', ARRAY['email', 'amount', 'method']),
  ('new-referral-agent', 'New referral signup', 'affiliate', 'New referral signup - {{referredName}} joined via your link!', '<p>Someone just signed up using your referral link.</p>', ARRAY['agentEmail', 'referredName', 'referredEmail', 'totalSignups']),
  ('inv-purchase-buyer', 'Partnership confirmed (buyer)', 'investment', 'Partnership confirmed — {{property}}', '<p>Your order has been received and is being processed.</p>', ARRAY['email', 'property', 'amount', 'shares']),
  ('inv-purchase-agent', 'Sale commission (agent)', 'investment', 'New sale — you earned ${{commission}} commission', '<p>Someone purchased shares through your referral link.</p>', ARRAY['agentEmail', 'property', 'amount', 'commission', 'rate', 'claimableDate']),
  ('inv-order-approved-buyer', 'Shares allocated (buyer)', 'investment', 'Shares allocated — {{property}}', '<p>Your allocation order has been approved and your shares are now in your portfolio.</p>', ARRAY['email', 'property', 'shares', 'amount', 'txHash']),
  ('inquiry-tenant-confirmation', 'Inquiry confirmation (tenant)', 'inquiry', 'Your inquiry has been sent!', '<p>Your inquiry about <strong>{{property_name}}</strong> has been received.</p>', ARRAY['tenant_email', 'tenant_name', 'property_name', 'property_url']),
  ('inquiry-lister-notification', 'New lead (lister)', 'inquiry', 'New lead for {{property_name}}', '<p>You have a new inquiry from <strong>{{tenant_name}}</strong> about <strong>{{property_name}}</strong>.</p>', ARRAY['lister_email', 'tenant_name', 'property_name', 'lead_url', 'property_url']),
  ('inquiry-lister-nda', 'New lead with NDA (lister)', 'inquiry', 'New lead - quick agreement needed', '<p>You have a new inquiry about <strong>{{property_name}}</strong>.</p>', ARRAY['lister_email', 'property_name', 'nda_url', 'property_url'])
ON CONFLICT (type) DO NOTHING;
