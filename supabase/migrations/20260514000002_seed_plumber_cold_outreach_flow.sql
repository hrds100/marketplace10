-- Seed: "Plumber Cold Outreach" automation flow (Hugo, 2026-05-14).
--
-- Maps Hugo's diagram (DAY 0 cold SMS → brochure → DAY 2 check-in →
-- DAY 10 final → stop) onto the WAIT_FOR_REPLY building block shipped
-- in the previous migration.
--
-- DAY 0 (cold SMS) is sent via the campaigns feature, not this automation.
-- This automation reacts to the FIRST inbound reply and runs the funnel.
--
-- Branch policy (chosen because Hugo's chart only shows REPLY/NO REPLY
-- at the message-send junctions, and replies during a wait window almost
-- always mean an engaged lead worth a human):
--   • Reply during ANY wait     → Transfer to Elijah (human takes over)
--   • No reply during a wait    → Send the next funnel message
--   • No reply after Day 10     → Stop + auto-label "no_response"
--
-- All sends use exact text (not AI) so wording is locked. Hugo can edit
-- nodes in /sms/automations after this seeds.

INSERT INTO sms_automations (name, description, trigger_type, is_active, flow_json)
SELECT
  'Plumber Cold Outreach',
  'Cold SMS funnel for tradespeople. Brochure on reply → Day 2 check-in → Day 10 final → stop. DAY 0 cold SMS comes from a campaign; this flow reacts to the first reply.',
  'new_message',
  false, -- inactive on seed — Hugo flips it on in the UI when ready
  jsonb_build_object(
    'globalPrompt', 'You are Elijah from nfstay, helping tradespeople invest in Airbnb properties from £500. Be warm, concise, and professional. UK English. Mention nfstay.com when relevant.',
    'globalModel', 'gpt-4o-mini',
    'globalTemperature', 0.6,
    'maxRepliesPerLead', 20,
    'nodes', jsonb_build_array(
      -- 1. Start (reply trigger)
      jsonb_build_object(
        'id', 'pco-start',
        'type', 'DEFAULT',
        'position', jsonb_build_object('x', 400, 'y', 60),
        'data', jsonb_build_object(
          'name', 'Cold SMS Reply',
          'isStart', true,
          'prompt', '',
          'useGlobalSettings', true,
          'modelOptions', jsonb_build_object('temperature', 0.6)
        )
      ),
      -- 2. Send brochure (exact text)
      jsonb_build_object(
        'id', 'pco-brochure',
        'type', 'DEFAULT',
        'position', jsonb_build_object('x', 400, 'y', 220),
        'data', jsonb_build_object(
          'name', 'Send Brochure',
          'text', E'Thanks, here''s the full breakdown of the Liverpool deal 👇\nhttps://nfstay.com/brochure',
          'useGlobalSettings', false,
          'modelOptions', jsonb_build_object('temperature', 0)
        )
      ),
      -- 3. Wait 2 days for reply
      jsonb_build_object(
        'id', 'pco-wait-day2',
        'type', 'WAIT_FOR_REPLY',
        'position', jsonb_build_object('x', 400, 'y', 380),
        'data', jsonb_build_object(
          'name', 'Wait 2 days',
          'waitValue', 2,
          'waitUnit', 'days'
        )
      ),
      -- 4. Day 2 check-in (exact text)
      jsonb_build_object(
        'id', 'pco-day2-msg',
        'type', 'DEFAULT',
        'position', jsonb_build_object('x', 200, 'y', 560),
        'data', jsonb_build_object(
          'name', 'Day 2 Check-in',
          'text', 'Hi, did you get a chance to look at the deal? Is that okay if I give you a quick call to discuss?',
          'useGlobalSettings', false,
          'modelOptions', jsonb_build_object('temperature', 0)
        )
      ),
      -- 5. Wait 8 days for reply (Day 2 → Day 10)
      jsonb_build_object(
        'id', 'pco-wait-day10',
        'type', 'WAIT_FOR_REPLY',
        'position', jsonb_build_object('x', 200, 'y', 720),
        'data', jsonb_build_object(
          'name', 'Wait 8 days',
          'waitValue', 8,
          'waitUnit', 'days'
        )
      ),
      -- 6. Day 10 final (exact text)
      jsonb_build_object(
        'id', 'pco-day10-msg',
        'type', 'DEFAULT',
        'position', jsonb_build_object('x', 200, 'y', 900),
        'data', jsonb_build_object(
          'name', 'Day 10 Final',
          'text', E'Hi, just a final one from nfstay.\n\nIf now''s not the right time, no worries at all — feel free to reach out whenever suits you.',
          'useGlobalSettings', false,
          'modelOptions', jsonb_build_object('temperature', 0)
        )
      ),
      -- 7. Wait 5 days for reply (final grace period)
      jsonb_build_object(
        'id', 'pco-wait-final',
        'type', 'WAIT_FOR_REPLY',
        'position', jsonb_build_object('x', 200, 'y', 1060),
        'data', jsonb_build_object(
          'name', 'Wait 5 days',
          'waitValue', 5,
          'waitUnit', 'days'
        )
      ),
      -- 8. Transfer to Elijah (engaged reply)
      jsonb_build_object(
        'id', 'pco-transfer',
        'type', 'TRANSFER',
        'position', jsonb_build_object('x', 700, 'y', 600),
        'data', jsonb_build_object(
          'name', 'Transfer to Elijah',
          'assignTo', 'hugo'
        )
      ),
      -- 9. Stop + no_response (final terminate)
      jsonb_build_object(
        'id', 'pco-stop',
        'type', 'STOP_CONVERSATION',
        'position', jsonb_build_object('x', 200, 'y', 1240),
        'data', jsonb_build_object(
          'name', 'Stop — No Response',
          'text', ''
        )
      )
    ),
    'edges', jsonb_build_array(
      -- Start → Brochure
      jsonb_build_object(
        'id', 'pco-e1',
        'source', 'pco-start',
        'target', 'pco-brochure',
        'type', 'custom',
        'data', jsonb_build_object('label', 'Reply received')
      ),
      -- Brochure → Wait Day 2
      jsonb_build_object(
        'id', 'pco-e2',
        'source', 'pco-brochure',
        'target', 'pco-wait-day2',
        'type', 'custom',
        'data', jsonb_build_object('label', '')
      ),
      -- Wait Day 2: replied → Transfer
      jsonb_build_object(
        'id', 'pco-e3',
        'source', 'pco-wait-day2',
        'sourceHandle', 'replied',
        'target', 'pco-transfer',
        'type', 'custom',
        'data', jsonb_build_object('label', 'Replied')
      ),
      -- Wait Day 2: no_reply → Day 2 message
      jsonb_build_object(
        'id', 'pco-e4',
        'source', 'pco-wait-day2',
        'sourceHandle', 'no_reply',
        'target', 'pco-day2-msg',
        'type', 'custom',
        'data', jsonb_build_object('label', 'No Reply')
      ),
      -- Day 2 message → Wait Day 10
      jsonb_build_object(
        'id', 'pco-e5',
        'source', 'pco-day2-msg',
        'target', 'pco-wait-day10',
        'type', 'custom',
        'data', jsonb_build_object('label', '')
      ),
      -- Wait Day 10: replied → Transfer
      jsonb_build_object(
        'id', 'pco-e6',
        'source', 'pco-wait-day10',
        'sourceHandle', 'replied',
        'target', 'pco-transfer',
        'type', 'custom',
        'data', jsonb_build_object('label', 'Replied')
      ),
      -- Wait Day 10: no_reply → Day 10 final
      jsonb_build_object(
        'id', 'pco-e7',
        'source', 'pco-wait-day10',
        'sourceHandle', 'no_reply',
        'target', 'pco-day10-msg',
        'type', 'custom',
        'data', jsonb_build_object('label', 'No Reply')
      ),
      -- Day 10 final → Wait Final
      jsonb_build_object(
        'id', 'pco-e8',
        'source', 'pco-day10-msg',
        'target', 'pco-wait-final',
        'type', 'custom',
        'data', jsonb_build_object('label', '')
      ),
      -- Wait Final: replied → Transfer
      jsonb_build_object(
        'id', 'pco-e9',
        'source', 'pco-wait-final',
        'sourceHandle', 'replied',
        'target', 'pco-transfer',
        'type', 'custom',
        'data', jsonb_build_object('label', 'Replied')
      ),
      -- Wait Final: no_reply → Stop
      jsonb_build_object(
        'id', 'pco-e10',
        'source', 'pco-wait-final',
        'sourceHandle', 'no_reply',
        'target', 'pco-stop',
        'type', 'custom',
        'data', jsonb_build_object('label', 'No Reply')
      )
    )
  )
WHERE NOT EXISTS (
  SELECT 1 FROM sms_automations WHERE name = 'Plumber Cold Outreach'
);
