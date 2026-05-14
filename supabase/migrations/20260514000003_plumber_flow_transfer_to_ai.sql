-- Follow-up to 20260514000002_seed_plumber_cold_outreach_flow.
--
-- Hugo: replace the terminal "Transfer to Elijah" node with an AI Reply
-- node that engages the lead in conversation. Same node ID + position so
-- existing edges (all 3 "If Reply" branches from the WAIT_FOR_REPLY nodes)
-- keep pointing at it without re-wiring.
--
-- Behaviour change: when a contact replies during any wait window the AI
-- now answers in-context instead of immediately handing off to a human.
-- Human takeover still happens automatically — sms-automation-run detects
-- a manual outbound and suspends the automation.

UPDATE sms_automations
SET flow_json = jsonb_set(
  flow_json,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN n->>'id' = 'pco-transfer'
          THEN jsonb_build_object(
            'id', 'pco-transfer',
            'type', 'DEFAULT',
            'position', n->'position',
            'data', jsonb_build_object(
              'name', 'AI Reply (engaged lead)',
              'prompt', E'The contact replied during a follow-up window — they''re engaged.\n\nGoal: warmly answer their question using the facts in the global prompt. Keep it under 320 characters. If they ask price/details → point to https://nfstay.com/brochure. If they ask to talk on the phone → reply "Cheers — what time suits you for a quick call?" and stop. If they say no thanks → "All good, feel free to reach out whenever" and stop.',
              'useGlobalSettings', true,
              'modelOptions', jsonb_build_object('temperature', 0.6)
            )
          )
        ELSE n
      END
    )
    FROM jsonb_array_elements(flow_json->'nodes') AS n
  )
)
WHERE name = 'Example: Plumber Cold Outreach';
