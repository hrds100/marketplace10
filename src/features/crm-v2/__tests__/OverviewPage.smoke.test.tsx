import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub auth — return a fixed agent.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'agent-uuid' },
    session: null,
    loading: false,
    isAdmin: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    setSession: vi.fn(),
  }),
}));

// Stub supabase — every from('...').select(...) chain returns empty
// and resolves OK. Stub channel + functions too. Just enough for the
// page + every hook to mount without throwing.
vi.mock('@/integrations/supabase/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    in: () => builder,
    gte: () => builder,
    is: () => builder,
    update: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (cb: (v: { data: unknown[]; error: null }) => unknown) =>
      cb({ data: [], error: null }),
  };
  // Make builder thenable so awaiting it returns the empty result.
  builder[Symbol.asyncIterator] = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channel: any = {
    on: () => channel,
    subscribe: () => channel,
  };
  return {
    supabase: {
      from: () => builder,
      channel: () => channel,
      removeChannel: vi.fn(),
      functions: { invoke: vi.fn() },
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    },
  };
});

import DialerV2Page from '../pages/DialerV2Page';

describe('crm-v2 OverviewPage — smoke', () => {
  it('renders without crashing + shows the title + empty-campaign state', async () => {
    render(<DialerV2Page />);
    expect(screen.getByText('My dialer')).toBeTruthy();
    expect(screen.getByText(/One lead at a time/)).toBeTruthy();
    expect(await screen.findByText(/No campaigns yet/i)).toBeTruthy();
  });
});
