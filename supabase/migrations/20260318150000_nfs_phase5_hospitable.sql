-- ============================================================================
-- NFStay Phase 5 — Hospitable Connections Table
-- Migration: 20260318150000_nfs_phase5_hospitable.sql
--
-- Tables: nfs_hospitable_connections
-- Includes: RLS policies, indexes, updated_at trigger
--
-- ⚠️  REQUIRES HUGO TO REVIEW SQL BEFORE EXECUTION
-- This migration creates new tables only. No existing tables are modified.
-- ============================================================================

-- ============================================================================
-- 1. nfs_hospitable_connections
-- ============================================================================

CREATE TABLE nfs_hospitable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  operator_id UUID NOT NULL REFERENCES nfs_operators(id) ON DELETE CASCADE,

  -- Hospitable identity
  hospitable_customer_id TEXT NOT NULL,
  hospitable_connection_id TEXT,
  channel_info JSONB DEFAULT '{}',

  -- OAuth
  auth_code TEXT,
  auth_code_expires_at TIMESTAMPTZ,

  -- Connection status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'failed')),
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,

  -- Sync state
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
  user_metadata JSONB DEFAULT '{}',
  connected_platforms JSONB DEFAULT '[]',
  total_properties INTEGER DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,
  last_sync_results JSONB DEFAULT '{}',
  sync_progress JSONB DEFAULT '{}',

  -- Health monitoring
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'error')),
  last_health_check TIMESTAMPTZ,
  last_sync_error TEXT,
  last_error JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_nfs_hospitable_connections_operator ON nfs_hospitable_connections(operator_id);
CREATE INDEX idx_nfs_hospitable_connections_customer ON nfs_hospitable_connections(hospitable_customer_id);
CREATE INDEX idx_nfs_hospitable_connections_status ON nfs_hospitable_connections(status, sync_status);

-- updated_at trigger (reuses Phase 1 function)
CREATE TRIGGER nfs_hospitable_connections_updated_at
  BEFORE UPDATE ON nfs_hospitable_connections
  FOR EACH ROW EXECUTE FUNCTION nfs_set_updated_at();

-- RLS
ALTER TABLE nfs_hospitable_connections ENABLE ROW LEVEL SECURITY;

-- Operator reads/updates own Hospitable connection
CREATE POLICY "nfs_hospitable_connections_operator_access" ON nfs_hospitable_connections
  FOR ALL USING (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    operator_id IN (SELECT id FROM nfs_operators WHERE profile_id = auth.uid())
  );

-- ============================================================================
-- End of migration
-- ============================================================================
