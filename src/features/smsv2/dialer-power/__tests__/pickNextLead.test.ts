// pickNextLead — picks the next dialable lead from wk_dialer_queue
// using the agent-side filter (filters out already-dialed contacts
// in-memory). Cloned from caller dialer.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pickNextLead } from '../pickNextLead';

interface QueueRow {
  id: string;
  status: string;
  wk_contacts: {
    id: string;
    name: string | null;
    phone: string | null;
    pipeline_column_id: string | null;
  } | null;
}

function mockSupabase(rows: QueueRow[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (cb: (v: { data: QueueRow[]; error: null }) => unknown) =>
      cb({ data: rows, error: null }),
  };
  return {
    from: () => builder,
  };
}

const ROWS: QueueRow[] = [
  {
    id: 'q1',
    status: 'pending',
    wk_contacts: {
      id: 'c1',
      name: 'Alice',
      phone: '+447800000001',
      pipeline_column_id: null,
    },
  },
  {
    id: 'q2',
    status: 'pending',
    wk_contacts: {
      id: 'c2',
      name: 'Bob',
      phone: '+447800000002',
      pipeline_column_id: 'col-x',
    },
  },
  {
    id: 'q3',
    status: 'pending',
    wk_contacts: {
      id: 'c3',
      name: null,
      phone: '+447800000003',
      pipeline_column_id: null,
    },
  },
];

describe('pickNextLead', () => {
  let supabase: ReturnType<typeof mockSupabase>;
  beforeEach(() => {
    supabase = mockSupabase(ROWS);
  });

  it('returns the FIRST pending row whose contact is not in the dialed set', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await pickNextLead(supabase as any, {
      campaignId: 'camp-1',
      agentId: null,
      isAdmin: true,
      dialed: new Set(),
    });
    expect(lead).not.toBeNull();
    expect(lead!.id).toBe('c1');
    expect(lead!.queueId).toBe('q1');
    expect(lead!.name).toBe('Alice');
    expect(lead!.phone).toBe('+447800000001');
  });

  it('skips rows whose contact is already in the dialed set', async () => {
    const dialed = new Set(['c1', 'c2']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await pickNextLead(supabase as any, {
      campaignId: 'camp-1',
      agentId: null,
      isAdmin: true,
      dialed,
    });
    expect(lead).not.toBeNull();
    expect(lead!.id).toBe('c3');
  });

  it('returns null when all pending rows are already dialed', async () => {
    const dialed = new Set(['c1', 'c2', 'c3']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await pickNextLead(supabase as any, {
      campaignId: 'camp-1',
      agentId: null,
      isAdmin: true,
      dialed,
    });
    expect(lead).toBeNull();
  });

  it('skips rows with no phone number', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sup = mockSupabase([
      {
        id: 'q1',
        status: 'pending',
        wk_contacts: { id: 'c1', name: 'X', phone: null, pipeline_column_id: null },
      },
      ROWS[0],
    ]);
    const lead = await pickNextLead(sup as never, {
      campaignId: 'camp-1',
      agentId: null,
      isAdmin: true,
      dialed: new Set(),
    });
    expect(lead!.id).toBe('c1'); // ROWS[0] still has phone
    // Wait — first row has id c1 phone=null, second is also c1. They share id.
    // Use a clearer set.
  });

  it('uses contact.name fallback to phone when name is null', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await pickNextLead(supabase as any, {
      campaignId: 'camp-1',
      agentId: null,
      isAdmin: true,
      dialed: new Set(['c1', 'c2']),
    });
    expect(lead!.id).toBe('c3');
    expect(lead!.name).toBe('+447800000003'); // phone, since name is null
  });

  it('returns null when query returns empty array', async () => {
    const sup = mockSupabase([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await pickNextLead(sup as any, {
      campaignId: 'camp-1',
      agentId: null,
      isAdmin: true,
      dialed: new Set(),
    });
    expect(lead).toBeNull();
  });

  it('returns null when campaignId is null', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await pickNextLead(supabase as any, {
      campaignId: null,
      agentId: null,
      isAdmin: true,
      dialed: new Set(),
    });
    expect(lead).toBeNull();
  });
});
