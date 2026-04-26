// Static contract test for supabase/functions/wk-voice-transcription/index.ts.
// We can't easily run the Deno edge function inside vitest, but we CAN
// read its source and lock the parts that matter so they don't regress
// silently.
//
// Why this exists: on 2026-04-27 the live coach silently produced zero
// cards because the OpenAI request used `max_tokens`, which gpt-5.4-mini
// rejects with HTTP 400 ("Unsupported parameter: 'max_tokens' is not
// supported with this model. Use 'max_completion_tokens' instead."). The
// edge function logged the warning, but no one caught it until Hugo
// noticed the empty pane mid-call. These assertions catch the same class
// of regression at PR time.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const SOURCE_PATH = resolve(
  __dirname,
  '../../../../supabase/functions/wk-voice-transcription/index.ts'
);
const source = readFileSync(SOURCE_PATH, 'utf8');

describe('wk-voice-transcription — OpenAI request contract', () => {
  it('uses max_completion_tokens, not max_tokens (GPT-5 family compatibility)', () => {
    // The chat.completions body must use the modern parameter name. The
    // legacy `max_tokens` is rejected by gpt-5.4-mini and other GPT-5
    // family models. `max_completion_tokens` is supported across
    // gpt-4o-mini, gpt-4.1-mini, gpt-4.1-nano, gpt-5.4-mini.
    expect(source).toContain('max_completion_tokens');
    // Make sure no stray legacy `max_tokens` slipped back in. We allow
    // it inside comments by checking only on lines that look like JSON
    // body keys.
    const offendingLines = source
      .split(/\r?\n/)
      .filter((line) => /^\s*max_tokens\s*:/.test(line));
    expect(offendingLines).toEqual([]);
  });

  it('reads live_coach_model from wk_ai_settings (no hardcoded model in OpenAI call)', () => {
    // The model must come from the DB row so admins can swap models in
    // the Settings UI without a redeploy. The hardcode is a fallback
    // only, used when the DB column is empty.
    expect(source).toMatch(/select\(['"][^'"]*live_coach_model/);
    expect(source).toContain('liveCoachModel');
    // The actual fetch body should reference the variable, not a string
    // literal like model: 'gpt-5.4-mini'.
    expect(source).toMatch(/model:\s*liveCoachModel/);
  });

  it('reads live_coach_system_prompt from wk_ai_settings (no hardcoded prompt-only mode)', () => {
    expect(source).toMatch(/select\(['"][^'"]*live_coach_system_prompt/);
  });

  it('logs OpenAI response body on non-2xx (so a wrong model surfaces in logs)', () => {
    // Hugo 2026-04-27: agents must surface OpenAI errors, not swallow
    // them. The non-2xx branch must include the response body in the
    // warning, not just the status code.
    const nonOkBlock = source.match(/if\s*\(!resp\.ok\)\s*\{[\s\S]*?\}/);
    expect(nonOkBlock).toBeTruthy();
    expect(nonOkBlock![0]).toMatch(/await\s+resp\.text\(\)/);
  });

  it('keeps the speaker→track mapping for outbound calls (caller=outbound, agent=inbound)', () => {
    // Regression guard for PR #551 — Twilio's track labels were inverted
    // in earlier versions, causing the caller's voice to show as "You".
    expect(source).toMatch(
      /track\.startsWith\(['"]outbound['"]\)\s*\?\s*['"]caller['"]\s*:\s*['"]agent['"]/
    );
  });
});
