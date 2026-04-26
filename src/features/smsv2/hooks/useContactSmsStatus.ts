// useContactSmsStatus — for a list of phone numbers, return the most
// recent outbound SMS (timestamp + body preview) per number.
//
// Hugo 2026-04-26 (PR 20): "every read on the pipeline should show SMS
// sent and then which SMS." Pipeline cards now render a small badge:
//   "SMS sent · 2h ago"     (with the body preview as tooltip)
// The data lives in sms_messages (keyed off to_number, not contact_id),
// so we group by to_number client-side.

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContactSmsStatus {
  /** Most recent outbound SMS timestamp (ISO). */
  lastSentAt: string;
  /** Snippet of the most recent body (≤140 chars). */
  bodyPreview: string;
}

interface SmsRow {
  to_number: string;
  body: string;
  created_at: string;
  direction: string;
}

interface SmsTable {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        in: (c: string, vs: string[]) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{
            data: SmsRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
}

/** Map keyed by raw `to_number` (E.164 string). */
export function useContactSmsStatus(phones: string[]): Map<string, ContactSmsStatus> {
  const [rows, setRows] = useState<SmsRow[]>([]);
  // Stabilise the array so we don't refetch on every render. Sort +
  // stringify the input list, then use the resulting string as the
  // effect dep.
  const phonesKey = useMemo(
    () => Array.from(new Set(phones.filter(Boolean))).sort().join('|'),
    [phones]
  );

  useEffect(() => {
    let cancelled = false;
    const list = phonesKey.split('|').filter(Boolean);
    if (list.length === 0) {
      setRows([]);
      return;
    }
    (async () => {
      try {
        const { data, error } = await (
          supabase as unknown as SmsTable
        )
          .from('sms_messages')
          .select('to_number, body, created_at, direction')
          .eq('direction', 'outbound')
          .in('to_number', list)
          .order('created_at', { ascending: false });
        if (cancelled || error) return;
        setRows(data ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phonesKey]);

  // Reduce to one row per to_number (the first, since ORDER BY DESC).
  return useMemo(() => {
    const map = new Map<string, ContactSmsStatus>();
    for (const r of rows) {
      if (!map.has(r.to_number)) {
        map.set(r.to_number, {
          lastSentAt: r.created_at,
          bodyPreview: r.body.length > 140 ? `${r.body.slice(0, 137)}…` : r.body,
        });
      }
    }
    return map;
  }, [rows]);
}
