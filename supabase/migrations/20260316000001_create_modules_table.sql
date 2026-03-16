-- supabase/migrations/20260316000001_create_modules_table.sql

CREATE TABLE IF NOT EXISTS modules (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  emoji         TEXT,
  description   TEXT,
  xp_reward     INTEGER NOT NULL DEFAULT 100,
  order_index   INTEGER NOT NULL DEFAULT 0,
  is_locked     BOOLEAN NOT NULL DEFAULT false,
  tier_required TEXT NOT NULL DEFAULT 'free',
  learning_outcomes TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_select_authenticated"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "modules_all_admin"
  ON modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
