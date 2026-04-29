import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    // Default the page to V1 (legacy reducer-driven). PR C.7 added a
    // version dropdown defaulting to V2 imperative; this test asserts
    // the V1 surface specifically.
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('crm-v2.dialerVersion', 'v1');
    }
  });

  it('renders without crashing + shows the title + empty-campaign state', async () => {
    render(<DialerV2Page />);
    expect(await screen.findByText('My dialer')).toBeTruthy();
    expect(screen.getByText(/One lead at a time · agent-controlled pacing/)).toBeTruthy();
    expect(await screen.findByText(/No campaigns yet/i)).toBeTruthy();
  });

  it('renders the version switcher dropdown', () => {
    render(<DialerV2Page />);
    const select = screen.getByTestId('dialer-version-select');
    expect(select).toBeTruthy();
  });
});
