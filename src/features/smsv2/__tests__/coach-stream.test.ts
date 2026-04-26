// TDD harness for the streaming coach helpers (SSE parser + throttle).
// These pure functions live in
// supabase/functions/wk-voice-transcription/coach-stream.ts and are
// imported by both the Deno edge function AND this vitest suite. They
// must contain ZERO Deno-specific imports.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSseChunk,
  createThrottledWriter,
} from '../../../../supabase/functions/wk-voice-transcription/coach-stream';

describe('parseSseChunk — OpenAI streaming SSE parser', () => {
  it('returns no events for an empty buffer', () => {
    const out = parseSseChunk('');
    expect(out.events).toEqual([]);
    expect(out.remaining).toBe('');
  });

  it('parses a single delta event', () => {
    const buf = 'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n';
    const out = parseSseChunk(buf);
    expect(out.events).toEqual([{ delta: 'Hi', done: false }]);
    expect(out.remaining).toBe('');
  });

  it('parses multiple deltas in one chunk', () => {
    const buf =
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n' +
      'data: {"choices":[{"delta":{"content":" there"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"!"}}]}\n';
    const out = parseSseChunk(buf);
    expect(out.events.map((e) => e.delta).join('')).toBe('Hi there!');
    expect(out.events.every((e) => !e.done)).toBe(true);
  });

  it('parses the [DONE] sentinel as a terminal event', () => {
    const buf =
      'data: {"choices":[{"delta":{"content":"end"}}]}\n' +
      'data: [DONE]\n';
    const out = parseSseChunk(buf);
    expect(out.events).toEqual([
      { delta: 'end', done: false },
      { delta: '', done: true },
    ]);
  });

  it('keeps an incomplete trailing line in remaining', () => {
    const buf =
      'data: {"choices":[{"delta":{"content":"complete"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"par';
    const out = parseSseChunk(buf);
    expect(out.events).toEqual([{ delta: 'complete', done: false }]);
    expect(out.remaining).toMatch(/^data: \{"choices":\[\{"delta":\{"content":"par/);
  });

  it('skips lines that are not data: events (comments / heartbeats)', () => {
    const buf =
      ': heartbeat\n' +
      'event: ping\n' +
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n';
    const out = parseSseChunk(buf);
    expect(out.events).toEqual([{ delta: 'ok', done: false }]);
  });

  it('handles an event with no content delta (e.g. role-only first chunk)', () => {
    const buf = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\n';
    const out = parseSseChunk(buf);
    expect(out.events).toEqual([{ delta: '', done: false }]);
  });

  it('survives malformed JSON gracefully', () => {
    const buf =
      'data: not-json\n' +
      'data: {"choices":[{"delta":{"content":"recovered"}}]}\n';
    const out = parseSseChunk(buf);
    expect(out.events).toEqual([{ delta: 'recovered', done: false }]);
  });
});

describe('createThrottledWriter — throttled async write', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the first write immediately', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const writer = createThrottledWriter(fn, 200);
    writer.schedule('a');
    // Allow the microtask queue to flush.
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('coalesces rapid schedules within the throttle window', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const writer = createThrottledWriter(fn, 200);
    writer.schedule('a');
    await vi.advanceTimersByTimeAsync(0);
    writer.schedule('a-b');
    writer.schedule('a-b-c');
    writer.schedule('a-b-c-d');
    // Inside the window — only the first immediate should have fired.
    expect(fn).toHaveBeenCalledTimes(1);
    // After the window expires, the latest pending value runs.
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('a-b-c-d');
  });

  it('flush() forces an immediate write of the latest pending value', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const writer = createThrottledWriter(fn, 200);
    writer.schedule('first');
    await vi.advanceTimersByTimeAsync(0);
    writer.schedule('second');
    // second is queued but throttled — flush() should run it now.
    await writer.flush();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });

  it('does not double-fire when flush() runs without pending', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const writer = createThrottledWriter(fn, 200);
    writer.schedule('only');
    await vi.advanceTimersByTimeAsync(0);
    await writer.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('subsequent schedule after the window fires immediately again', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const writer = createThrottledWriter(fn, 200);
    writer.schedule('a');
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(250);
    writer.schedule('b');
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, 'b');
  });
});
