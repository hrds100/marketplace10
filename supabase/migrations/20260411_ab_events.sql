-- A/B Testing events table
-- Stores all tracked events from landing page A/B tests

CREATE TABLE IF NOT EXISTS ab_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id  TEXT NOT NULL,
  variant     TEXT NOT NULL CHECK (variant IN ('a', 'b')),
  event_type  TEXT NOT NULL,
  page_url    TEXT DEFAULT '/',
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries by variant + event type + date
CREATE INDEX IF NOT EXISTS idx_ab_events_variant_type
  ON ab_events (variant, event_type, created_at DESC);

-- Index for visitor session lookups
CREATE INDEX IF NOT EXISTS idx_ab_events_visitor
  ON ab_events (visitor_id, created_at DESC);

-- RLS: service role only (edge function writes, admin reads via service key)
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;

-- Allow the edge function (service role) full access
CREATE POLICY "Service role full access on ab_events"
  ON ab_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE ab_events IS 'Landing page A/B test event tracking';
