-- ============================================================================
-- NFStay Phase 6 — Analytics table
-- REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION
-- ============================================================================

-- nfs_analytics: page views and booking events per operator/property
CREATE TABLE IF NOT EXISTS nfs_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,
  property_id UUID REFERENCES nfs_properties(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  session_id TEXT,
  device_type TEXT,
  view_source TEXT DEFAULT 'direct',
  reservation_id UUID REFERENCES nfs_reservations(id) ON DELETE SET NULL,
  booking_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE nfs_analytics ENABLE ROW LEVEL SECURITY;

-- Operators can read their own analytics
CREATE POLICY "nfs_analytics_operator_read" ON nfs_analytics
  FOR SELECT USING (
    operator_id IN (
      SELECT id FROM nfs_operators WHERE profile_id = auth.uid()
    )
  );

-- Service role inserts analytics (Edge Functions, webhooks)
-- service_role bypasses RLS automatically, no explicit policy needed for INSERT

-- Indexes
CREATE INDEX idx_nfs_analytics_operator ON nfs_analytics(operator_id, event_type, timestamp DESC);
CREATE INDEX idx_nfs_analytics_property ON nfs_analytics(property_id, event_type, timestamp DESC);
CREATE INDEX idx_nfs_analytics_session ON nfs_analytics(session_id);
