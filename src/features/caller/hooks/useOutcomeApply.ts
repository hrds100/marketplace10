// Caller — useOutcomeApply.
// Wraps the wk-outcome-apply edge function. Server is the source of
// truth; on success it moves the contact to the new pipeline column,
// fires automation (SMS, task, retry-dial, tag), and returns the list
// of applied automations.

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OutcomeApplyInput {
  callId: string;
  contactId: string;
  columnId: string;
  agentNote?: string | null;
}

export interface OutcomeApplyResult {
  ok: boolean;
  applied: string[];
  columnId?: string;
  error?: string;
}

interface InvokeFn {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: { applied?: string[]; column_id?: string } | null;
    error: { message: string; context?: Response } | null;
  }>;
}

export function useOutcomeApply() {
  const apply = useCallback(
    async (input: OutcomeApplyInput): Promise<OutcomeApplyResult> => {
      try {
        const { data, error } = await (
          supabase.functions as unknown as InvokeFn
        ).invoke('wk-outcome-apply', {
          body: {
            call_id: input.callId,
            contact_id: input.contactId,
            column_id: input.columnId,
            agent_note: input.agentNote ?? null,
          },
        });
        if (error) {
          let real = error.message;
          if (error.context) {
            try {
              const body = await error.context.clone().text();
              let parsed: { error?: string } | null = null;
              try {
                parsed = body ? JSON.parse(body) : null;
              } catch {
                /* not JSON */
              }
              real = `${error.context.status} ${parsed?.error || body || error.message}`.trim();
            } catch {
              /* fall through */
            }
          }
          return { ok: false, applied: [], error: real };
        }
        return {
          ok: true,
          applied: data?.applied ?? [],
          columnId: data?.column_id,
        };
      } catch (e) {
        return {
          ok: false,
          applied: [],
          error: e instanceof Error ? e.message : 'unknown error',
        };
      }
    },
    []
  );

  return { apply };
}
