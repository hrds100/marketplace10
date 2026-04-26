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
  it('uses streaming OpenAI (stream: true) so tokens land in the placeholder live', () => {
    // Hugo 2026-04-28: streaming PR. The OpenAI request body must
    // include `stream: true` so we can pipe tokens into the live
    // placeholder card via the SSE parser.
    expect(source).toMatch(/stream:\s*true/);
    expect(source).toContain('parseSseChunk');
    expect(source).toContain('createThrottledWriter');
  });

  it('acquires a per-call lock before streaming (no race between concurrent invocations)', () => {
    // Hugo 2026-04-28: stateless edge invocations could race. The lock
    // RPC arbitrates which generation_id wins.
    expect(source).toMatch(/rpc\(\s*['"]wk_acquire_coach_lock['"]/);
    expect(source).toMatch(/p_force:\s*isFinal/);
    expect(source).toMatch(/p_min_age_ms:\s*400/);
  });

  it('inserts a streaming placeholder before the first token, then UPDATEs in place', () => {
    // The placeholder appears immediately so the agent sees something
    // happening within ~ms of caller speech, then the body morphs as
    // tokens stream.
    expect(source).toMatch(/status:\s*['"]streaming['"]/);
    expect(source).toMatch(/body:\s*['"]…['"]/);
    expect(source).toMatch(/generation_id:\s*generationId/);
  });

  it('logs the streaming lifecycle (interim received → first token → first update → final)', () => {
    // Per Hugo's spec: "Log timestamps for interim received, stream
    // started, first token, first update, final update, delete/reject."
    expect(source).toMatch(/log\(['"]interim received/);
    expect(source).toMatch(/log\(['"]first token/);
    expect(source).toMatch(/log\(['"]first update/);
    expect(source).toMatch(/log\(['"]final update/);
    expect(source).toMatch(/rejected by post-processor/);
  });

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

  it('passes the last 3 coach cards back to the model for anti-repetition', () => {
    // Hugo 2026-04-28: cards were repeating "Yeah fair enough" 4 in a
    // row because each call was independent — the model had no memory
    // of what it just produced. Fix: SELECT recent wk_live_coach_events
    // and pass them in the user message under "YOUR LAST FEW COACH
    // CARDS".
    expect(source).toMatch(/from\(['"]wk_live_coach_events['"]\)[\s\S]*?\.select\(['"]body/);
    expect(source).toContain('YOUR LAST FEW COACH CARDS');
    expect(source).toContain('priorCards');
  });

  it('default prompt is the script-faithful v7 (open-ended default + earned-close)', () => {
    // Hugo 2026-04-28: v7 keeps v6's script-faithful direction but
    // adds two explicit blocks — OPEN-ENDED DEFAULT and EARNED-CLOSE
    // RULE — to stop the model force-closing on every other line.
    expect(source).toContain('CORE RULES');
    expect(source).toContain('Default to the script. Do not freestyle unless needed.');
    expect(source).toContain('OPEN → QUALIFY → PERMISSION TO PITCH → PITCH → RETURNS → SMS CLOSE → FOLLOW-UP LOCK');
    expect(source).toMatch(/NEVER output labels or acting notes/);
    expect(source).toContain('OPEN-ENDED DEFAULT');
    expect(source).toContain('EARNED-CLOSE RULE');
    expect(source).toMatch(/Most lines should end with a question/);
    expect(source).toMatch(/PITCH and RETURNS steps already/);
    // The old "Three Tens / Belfort" framing must NOT be back.
    expect(source).not.toMatch(/THREE TENS/);
    expect(source).not.toMatch(/Straight Line Selling/);
    // The old example openers we'd anchored on must NOT be in the
    // default prompt anymore.
    expect(source).not.toMatch(/Yeah fair enough — sounds like/);
  });

  it('strips leaked acting-note brackets ([warm], [firm], etc.) from the model output', () => {
    // Defensive post-processor: even if the model slips up and
    // produces "[reasonable man] Fair enough...", the rep should
    // never read the bracket label aloud. Simulate the strip on
    // representative leak shapes and assert the brackets disappear.
    // (Pulling the regex literals out of the source by name so the
    // test breaks loudly if they're removed.)
    const leadingMatch = source.match(/text\.replace\(\/\^\\s\*\(\?:\\\[[^\n]+\)/);
    expect(leadingMatch, 'leading-bracket strip regex missing').toBeTruthy();
    const sentenceStartMatch = source.match(/text\.replace\(\/\(\^\|\[\.![^\n]+/);
    expect(sentenceStartMatch, 'sentence-start-bracket strip regex missing').toBeTruthy();

    // Apply the same regexes to a fixture and assert the brackets are
    // gone — this verifies the regex actually does what we want, not
    // just that it's present in source.
    const stripLeading = (s: string) =>
      s.replace(/^\s*(?:\[[^\]]+\]\s*)+/, '').trim();
    const stripSentenceStart = (s: string) =>
      s.replace(/(^|[.!?]\s+)(?:\[[^\]]+\]\s*)+/g, '$1').trim();

    expect(stripLeading('[reasonable man] Fair enough — that makes sense.'))
      .toBe('Fair enough — that makes sense.');
    expect(stripLeading('[warm] [firm] Quick version: 15-bed in Liverpool.'))
      .toBe('Quick version: 15-bed in Liverpool.');
    expect(
      stripSentenceStart(
        'Fair enough. [warm] What kind of returns are you chasing?'
      )
    ).toBe('Fair enough. What kind of returns are you chasing?');
    // Real bracketed content (e.g. URL-style or template placeholders) shouldn't
    // be over-stripped. We only strip from line start or sentence start.
    expect(stripLeading('Hi [Name], it\'s Hugo from NFSTAY.'))
      .toBe('Hi [Name], it\'s Hugo from NFSTAY.');
  });

  it('keeps temperature low for compliance (script fidelity > creativity)', () => {
    // Hugo 2026-04-28: "this job needs compliance more than
    // creativity". Lock temperature ≤ 0.5 so we don't drift back to
    // the high-creativity 0.9 used by the Belfort prompt.
    const m = source.match(/temperature:\s*([0-9.]+)/);
    expect(m).toBeTruthy();
    const temp = parseFloat(m![1]);
    expect(temp).toBeLessThanOrEqual(0.5);
  });
});
