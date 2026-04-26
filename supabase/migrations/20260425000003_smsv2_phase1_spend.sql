-- ============================================================================
-- SMSV2 — Phase 1 spend control + kill switches RPCs
-- These RPCs are called by edge functions (wk-spend-check, wk-spend-record,
-- wk-killswitch-check) and the post-call AI flow.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- wk_check_spend(agent_id) — pre-dial gate.
-- Returns: jsonb { allowed, reason, daily_spend_pence, daily_limit_pence }
-- Logic:
--   1. is_admin → always allowed (limit shown as -1 = unlimited)
--   2. daily_limit_pence IS NULL → allowed (NULL = unlimited per Tier 1)
--   3. daily_spend_pence >= daily_limit_pence → blocked (reason='limit')
--   4. Active 'outbound' or 'all_dialers' killswitch → blocked (reason='killswitch_global')
--   5. Active 'agent_dialer' for this agent → blocked (reason='killswitch_agent')
--   6. Otherwise allowed.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_check_spend(p_agent_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  integer;
  v_spend  integer;
  v_admin  boolean;
  v_block  boolean;
  v_global boolean;
  v_agentks boolean;
BEGIN
  SELECT daily_limit_pence, daily_spend_pence, is_admin, block_outbound
    INTO v_limit, v_spend, v_admin, v_block
    FROM wk_voice_agent_limits
   WHERE agent_id = p_agent_id;

  -- No row = create one with defaults (NULL limit = unlimited)
  IF NOT FOUND THEN
    INSERT INTO wk_voice_agent_limits (agent_id, daily_limit_pence, is_admin)
    VALUES (p_agent_id, NULL, false)
    ON CONFLICT (agent_id) DO NOTHING;
    v_limit := NULL; v_spend := 0; v_admin := false; v_block := false;
  END IF;

  -- Killswitches
  SELECT EXISTS (SELECT 1 FROM wk_killswitches
                 WHERE is_active = true
                   AND kind IN ('outbound', 'all_dialers')
                   AND scope_agent_id IS NULL)
    INTO v_global;
  SELECT EXISTS (SELECT 1 FROM wk_killswitches
                 WHERE is_active = true
                   AND kind = 'agent_dialer'
                   AND scope_agent_id = p_agent_id)
    INTO v_agentks;

  IF v_global THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'killswitch_global',
                              'daily_spend_pence', v_spend, 'daily_limit_pence', v_limit);
  END IF;
  IF v_agentks THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'killswitch_agent',
                              'daily_spend_pence', v_spend, 'daily_limit_pence', v_limit);
  END IF;
  IF v_admin THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin_unlimited',
                              'daily_spend_pence', v_spend, 'daily_limit_pence', -1);
  END IF;
  IF v_block THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit',
                              'daily_spend_pence', v_spend, 'daily_limit_pence', v_limit);
  END IF;
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_limit',
                              'daily_spend_pence', v_spend, 'daily_limit_pence', NULL);
  END IF;
  IF v_spend >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit',
                              'daily_spend_pence', v_spend, 'daily_limit_pence', v_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'reason', 'within_limit',
                            'daily_spend_pence', v_spend, 'daily_limit_pence', v_limit);
END;
$$;

REVOKE ALL ON FUNCTION wk_check_spend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_check_spend(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- wk_add_ai_cost(call_id, pence) — bumps the AI portion of the cost row.
-- Called by wk-ai-postcall after model usage.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_add_ai_cost(p_call_id uuid, p_pence integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent uuid;
BEGIN
  IF p_pence IS NULL OR p_pence <= 0 THEN RETURN; END IF;

  -- Ensure cost row exists
  INSERT INTO wk_voice_call_costs (call_id, carrier_cost_pence, ai_cost_pence)
  VALUES (p_call_id, 0, p_pence)
  ON CONFLICT (call_id) DO UPDATE
    SET ai_cost_pence = wk_voice_call_costs.ai_cost_pence + EXCLUDED.ai_cost_pence,
        computed_at   = now();

  -- Bump the agent's daily spend
  SELECT agent_id INTO v_agent FROM wk_calls WHERE id = p_call_id;
  IF v_agent IS NOT NULL THEN
    UPDATE wk_voice_agent_limits
       SET daily_spend_pence = daily_spend_pence + p_pence,
           block_outbound = CASE
             WHEN daily_limit_pence IS NULL THEN false
             WHEN daily_spend_pence + p_pence >= daily_limit_pence THEN true
             ELSE block_outbound
           END,
           updated_at = now()
     WHERE agent_id = v_agent;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION wk_add_ai_cost(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_add_ai_cost(uuid, integer) TO service_role;

-- ----------------------------------------------------------------------------
-- wk_record_carrier_cost(call_id, pence) — bumps the carrier portion + spend.
-- Called by wk-spend-record after a call completes (Twilio price API).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_record_carrier_cost(p_call_id uuid, p_pence integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent uuid;
BEGIN
  IF p_pence IS NULL OR p_pence <= 0 THEN RETURN; END IF;

  INSERT INTO wk_voice_call_costs (call_id, carrier_cost_pence, ai_cost_pence)
  VALUES (p_call_id, p_pence, 0)
  ON CONFLICT (call_id) DO UPDATE
    SET carrier_cost_pence = wk_voice_call_costs.carrier_cost_pence + EXCLUDED.carrier_cost_pence,
        computed_at        = now();

  SELECT agent_id INTO v_agent FROM wk_calls WHERE id = p_call_id;
  IF v_agent IS NOT NULL THEN
    UPDATE wk_voice_agent_limits
       SET daily_spend_pence = daily_spend_pence + p_pence,
           block_outbound = CASE
             WHEN daily_limit_pence IS NULL THEN false
             WHEN daily_spend_pence + p_pence >= daily_limit_pence THEN true
             ELSE block_outbound
           END,
           updated_at = now()
     WHERE agent_id = v_agent;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION wk_record_carrier_cost(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_record_carrier_cost(uuid, integer) TO service_role;

-- ----------------------------------------------------------------------------
-- wk_killswitch_state() — what's currently blocked.
-- Returns: jsonb { all_dialers, ai_coach, outbound, per_agent: {...} }
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_killswitch_state()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'all_dialers', EXISTS (
      SELECT 1 FROM wk_killswitches
      WHERE is_active=true AND kind='all_dialers' AND scope_agent_id IS NULL
    ),
    'ai_coach', EXISTS (
      SELECT 1 FROM wk_killswitches
      WHERE is_active=true AND kind='ai_coach' AND scope_agent_id IS NULL
    ),
    'outbound', EXISTS (
      SELECT 1 FROM wk_killswitches
      WHERE is_active=true AND kind='outbound' AND scope_agent_id IS NULL
    ),
    'per_agent', COALESCE((
      SELECT jsonb_object_agg(scope_agent_id, true)
      FROM wk_killswitches
      WHERE is_active=true AND kind='agent_dialer' AND scope_agent_id IS NOT NULL
    ), '{}'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION wk_killswitch_state() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- wk_set_killswitch(kind, scope_agent_id, active, reason) — toggle a switch.
-- Admin-only. Audit-logs every flip.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wk_set_killswitch(
  p_kind text,
  p_scope_agent_id uuid,
  p_active boolean,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT wk_is_admin() THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  IF p_kind NOT IN ('all_dialers','agent_dialer','ai_coach','outbound') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind;
  END IF;

  IF p_active THEN
    INSERT INTO wk_killswitches (kind, scope_agent_id, is_active, reason, created_by)
    VALUES (p_kind, p_scope_agent_id, true, p_reason, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE wk_killswitches
       SET is_active = false,
           cleared_at = now()
     WHERE kind = p_kind
       AND ((scope_agent_id = p_scope_agent_id) OR (scope_agent_id IS NULL AND p_scope_agent_id IS NULL))
       AND is_active = true
     RETURNING id INTO v_id;
  END IF;

  INSERT INTO wk_audit_log (actor_id, action, entity_type, entity_id, meta)
  VALUES (auth.uid(),
          CASE WHEN p_active THEN 'killswitch_on' ELSE 'killswitch_off' END,
          'wk_killswitch',
          v_id,
          jsonb_build_object('kind', p_kind, 'scope_agent_id', p_scope_agent_id, 'reason', p_reason));

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION wk_set_killswitch(text, uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wk_set_killswitch(text, uuid, boolean, text) TO authenticated;
