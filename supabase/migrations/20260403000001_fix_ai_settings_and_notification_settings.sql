-- Fix AI settings RLS: ensure admin access policies exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_settings' AND policyname = 'admin_select_ai_settings') THEN
    CREATE POLICY admin_select_ai_settings ON ai_settings FOR SELECT USING (
      auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_settings' AND policyname = 'admin_update_ai_settings') THEN
    CREATE POLICY admin_update_ai_settings ON ai_settings FOR UPDATE USING (
      auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_settings' AND policyname = 'admin_insert_ai_settings') THEN
    CREATE POLICY admin_insert_ai_settings ON ai_settings FOR INSERT WITH CHECK (
      auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
    );
  END IF;
END $$;

-- Create notification_settings table for admin toggle control
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  bell_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'admin_select_notif_settings') THEN
    CREATE POLICY admin_select_notif_settings ON notification_settings FOR SELECT USING (
      auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'admin_update_notif_settings') THEN
    CREATE POLICY admin_update_notif_settings ON notification_settings FOR UPDATE USING (
      auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'admin_insert_notif_settings') THEN
    CREATE POLICY admin_insert_notif_settings ON notification_settings FOR INSERT WITH CHECK (
      auth.jwt() ->> 'email' IN ('admin@hub.nfstay.com', 'hugo@nfstay.com', 'chris@nfstay.com')
    );
  END IF;
END $$;

-- Seed 22 notification types
INSERT INTO notification_settings (event_key, label, category, bell_enabled, email_enabled) VALUES
  ('new_signup', 'New user signup', 'general', true, true),
  ('new_deal_submitted', 'New listing submitted', 'deals', true, true),
  ('deal_approved', 'Deal approved', 'deals', true, true),
  ('deal_rejected', 'Deal rejected', 'deals', true, true),
  ('deal_expired', 'Deal expired', 'deals', true, true),
  ('new_inquiry_email', 'New tenant inquiry (email)', 'deals', true, true),
  ('new_inquiry_whatsapp', 'New tenant inquiry (WhatsApp)', 'deals', true, true),
  ('landlord_claimed', 'Landlord claimed account', 'deals', true, true),
  ('nda_signed', 'NDA signed by landlord', 'deals', true, true),
  ('tier_upgraded', 'User subscribed (tier upgrade)', 'general', true, true),
  ('subscription_commission', 'Subscription commission earned', 'affiliate', true, true),
  ('crypto_purchase', 'Crypto/SamCart purchase', 'investment', true, true),
  ('share_purchased', 'Investment share purchased', 'investment', true, true),
  ('agent_commission', 'Agent commission earned', 'investment', true, true),
  ('payout_requested', 'Payout requested', 'affiliate', true, true),
  ('payout_completed', 'Payout completed', 'affiliate', true, true),
  ('new_referral', 'New referral signup', 'affiliate', true, true),
  ('booking_new', 'Booking site new booking', 'nfstay', true, true),
  ('jv_commission', 'JV partner commission earned', 'investment', true, true),
  ('rent_available', 'Rent available', 'investment', true, true),
  ('rent_claimed', 'Rent claimed', 'investment', true, true),
  ('weekly_digest', 'Weekly analytics digest', 'general', false, true)
ON CONFLICT (event_key) DO NOTHING;
