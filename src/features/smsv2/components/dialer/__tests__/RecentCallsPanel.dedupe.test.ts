// PR 138 (Hugo 2026-04-28): pin the Recent Calls dedupe-by-contact_id
// behaviour against realtime stress.
//
// Hugo (PR 137 → 138, Rule 9): "Duplicate numbers in Recent Calls
// must be fixed cleanly." The panel pulls 30 raw rows and dedupes by
// contact_id keeping the FIRST occurrence (= most recent because rows
// are ordered by started_at DESC). Rows with no contact_id are kept
// as-is (rare — incoming pre-resolution).
//
// The dedupe is implemented inline in RecentCallsPanel (lines 244-258).
// This test re-implements the same algorithm and pins it against
// scenarios that simulate realtime updates inserting multiple rows
// for the same contact in quick succession.

import { describe, it, expect } from 'vitest';

interface CallRow {
  id: string;
  contact_id: string | null;
  started_at: string | null;
}

/** Mirrors the dedupe loop in RecentCallsPanel.tsx (PR 137). Kept here
 *  so we can unit-test the algorithm without mounting the component. */
function dedupeByContactId(rows: CallRow[], limit = 10): CallRow[] {
  const seen = new Set<string>();
  const out: CallRow[] = [];
  for (const r of rows) {
    const key = r.contact_id ?? `__null_${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

describe('RecentCallsPanel dedupe (Rule 9)', () => {
  it('keeps the first occurrence of each contact_id (= the most recent call)', () => {
    const rows: CallRow[] = [
      { id: 'c3', contact_id: 'contact-A', started_at: '2026-04-28T10:30:00Z' },
      { id: 'c2', contact_id: 'contact-A', started_at: '2026-04-28T10:25:00Z' },
      { id: 'c1', contact_id: 'contact-A', started_at: '2026-04-28T10:20:00Z' },
    ];
    const out = dedupeByContactId(rows);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('c3');
  });

  it('handles realtime stress: 3 fake inserts for the same contact_id collapse to one row', () => {
    // Simulates wk_calls realtime channel firing INSERT events for
    // the same contact_id in quick succession. Each event triggers a
    // refetch — we want to verify the dedupe stays correct after each.
    const initial: CallRow[] = [
      { id: 'i1', contact_id: 'contact-X', started_at: '2026-04-28T11:00:00Z' },
    ];
    expect(dedupeByContactId(initial)).toHaveLength(1);

    const afterFirst: CallRow[] = [
      { id: 'i2', contact_id: 'contact-X', started_at: '2026-04-28T11:01:00Z' },
      ...initial,
    ];
    expect(dedupeByContactId(afterFirst)).toHaveLength(1);
    expect(dedupeByContactId(afterFirst)[0].id).toBe('i2');

    const afterSecond: CallRow[] = [
      { id: 'i3', contact_id: 'contact-X', started_at: '2026-04-28T11:02:00Z' },
      ...afterFirst,
    ];
    expect(dedupeByContactId(afterSecond)).toHaveLength(1);
    expect(dedupeByContactId(afterSecond)[0].id).toBe('i3');

    const afterThird: CallRow[] = [
      { id: 'i4', contact_id: 'contact-X', started_at: '2026-04-28T11:03:00Z' },
      ...afterSecond,
    ];
    expect(dedupeByContactId(afterThird)).toHaveLength(1);
    expect(dedupeByContactId(afterThird)[0].id).toBe('i4');
  });

  it('preserves separate contacts (no false dedupe across contacts)', () => {
    const rows: CallRow[] = [
      { id: 'c5', contact_id: 'contact-B', started_at: '2026-04-28T10:30:00Z' },
      { id: 'c4', contact_id: 'contact-A', started_at: '2026-04-28T10:29:00Z' },
      { id: 'c3', contact_id: 'contact-B', started_at: '2026-04-28T10:28:00Z' },
      { id: 'c2', contact_id: 'contact-A', started_at: '2026-04-28T10:27:00Z' },
      { id: 'c1', contact_id: 'contact-C', started_at: '2026-04-28T10:26:00Z' },
    ];
    const out = dedupeByContactId(rows);
    expect(out.map((r) => r.id)).toEqual(['c5', 'c4', 'c1']);
    expect(out.map((r) => r.contact_id)).toEqual(['contact-B', 'contact-A', 'contact-C']);
  });

  it('keeps rows with null contact_id distinct from each other', () => {
    const rows: CallRow[] = [
      { id: 'n1', contact_id: null, started_at: '2026-04-28T10:30:00Z' },
      { id: 'n2', contact_id: null, started_at: '2026-04-28T10:29:00Z' },
      { id: 'n3', contact_id: null, started_at: '2026-04-28T10:28:00Z' },
    ];
    const out = dedupeByContactId(rows);
    expect(out).toHaveLength(3);
  });

  it('respects the 10-unique-contacts limit (slice happens after dedupe)', () => {
    const rows: CallRow[] = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      contact_id: `contact-${i}`,
      started_at: '2026-04-28T10:00:00Z',
    }));
    const out = dedupeByContactId(rows, 10);
    expect(out).toHaveLength(10);
    expect(out[0].contact_id).toBe('contact-0');
    expect(out[9].contact_id).toBe('contact-9');
  });
});
