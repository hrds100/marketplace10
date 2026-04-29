// PR 153 (Hugo 2026-04-29): smoke test that the v3 OverviewPage
// renders its top-level regions without crashing. Deeper per-component
// tests live next to each component (PacingControl + SessionControlBar
// already pinned). The integration test plan in §11 of the rebuild
// plan adds end-to-end flows in PR 154.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'agent-1', email: 'agent@example.com' },
    isAdmin: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { workspace_role: 'agent' }, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: function () {
        return this;
      },
    }),
    removeChannel: () => undefined,
  },
}));

vi.mock('../../../../hooks/useDialerCampaigns', () => ({
  useDialerCampaigns: () => ({
    campaigns: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Demo Campaign',
        autoAdvanceSeconds: 5,
        parallelLines: 1,
        isActive: true,
        pendingLeads: 12,
        doneLeads: 3,
        connectedLeads: 1,
        voicemailLeads: 0,
        mode: 'power',
      },
    ],
    loading: false,
  }),
}));

vi.mock('../../../../hooks/useNextLead', () => ({
  useNextLead: () => ({
    next: {
      id: 'c1',
      queueId: 'q1',
      name: 'Lead Alice',
      phone: '+447900000001',
      pipelineColumnId: null,
      priority: 0,
      attempts: 0,
    },
    all: [
      {
        id: 'c1',
        queueId: 'q1',
        name: 'Lead Alice',
        phone: '+447900000001',
        pipelineColumnId: null,
        priority: 0,
        attempts: 0,
      },
      {
        id: 'c2',
        queueId: 'q2',
        name: 'Lead Bob',
        phone: '+447900000002',
        pipelineColumnId: null,
        priority: 0,
        attempts: 0,
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../../hooks/useMyDialerQueue', () => ({
  useMyDialerQueue: () => ({ items: [], loading: false, error: null }),
}));

vi.mock('../../../../hooks/useSpendLimit', () => ({
  useSpendLimit: () => ({
    isLimitReached: false,
    isAdmin: false,
    spendPence: 0,
    limitPence: 1000,
    percentUsed: 0,
    blocked: false,
    reason: null,
    loading: false,
  }),
}));

vi.mock('../../../../hooks/useKillSwitch', () => ({
  useKillSwitch: () => ({ allDialers: false, loading: false }),
}));

vi.mock('../../../../hooks/useCurrentAgent', () => ({
  useCurrentAgent: () => ({
    agent: { id: 'agent-1', name: 'Hugo', callsToday: 0, isAdmin: false, spendPence: 0 },
    firstName: 'Hugo',
    talkRatioPercent: 0,
    loading: false,
  }),
}));

vi.mock('../../../../hooks/useSessionStats', () => ({
  useSessionStats: () => ({ stats: null, loading: false, error: null }),
}));

vi.mock('../../../../hooks/useContactPersistence', () => ({
  useContactPersistence: () => ({
    moveToColumn: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../../live-call/ActiveCallContext', () => ({
  useActiveCallCtx: () => ({
    callPhase: 'idle',
    startCall: vi.fn(),
    endCall: vi.fn(),
    requestPause: vi.fn(),
    requestResume: vi.fn(),
    requestSkip: vi.fn(),
    requestNextCall: vi.fn(),
    pacingDeadlineMs: null,
    setActiveCampaignId: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useDialerSession', () => ({
  useDialerSession: () => ({
    sessionId: null,
    startedAt: null,
    paused: false,
    pacing: { mode: 'manual', delaySeconds: 0 },
    dialedThisSession: new Set<string>(),
    pause: vi.fn(),
    resume: vi.fn(),
    setPacing: vi.fn(),
    recordDialed: vi.fn(),
    endSession: vi.fn(),
  }),
}));

vi.mock('../../../../store/SmsV2Store', () => ({
  useSmsV2: () => ({
    contacts: [],
    columns: [],
    patchContact: vi.fn(),
    upsertContact: vi.fn(),
    pushToast: vi.fn(),
  }),
}));

vi.mock('../RecentCallsPanel', () => ({
  default: () => <div data-testid="recent-calls-stub" />,
}));

vi.mock('../../shared/StageSelector', () => ({
  default: () => <div data-testid="stage-selector" />,
}));

vi.mock('../CampaignList', () => ({
  default: () => <div data-testid="campaign-list-stub" />,
}));

vi.mock('../../contacts/EditContactModal', () => ({
  default: () => null,
}));

import OverviewPage from '../OverviewPage';

describe('OverviewPage v3 — smoke', () => {
  it('renders the top-level regions without crashing', () => {
    render(<OverviewPage />);
    expect(screen.getByTestId('overview-page')).toBeInTheDocument();
    expect(screen.getByTestId('overview-header')).toBeInTheDocument();
    expect(screen.getByTestId('hero-card')).toBeInTheDocument();
    expect(screen.getByTestId('ordered-queue-list')).toBeInTheDocument();
    expect(screen.getByTestId('history-list')).toBeInTheDocument();
    expect(screen.getByTestId('session-footer')).toBeInTheDocument();
  });

  it('hero card shows the next lead name when queue has rows', () => {
    render(<OverviewPage />);
    expect(screen.getByTestId('hero-lead-name')).toHaveTextContent('Lead Alice');
  });

  it('ordered queue list excludes the head (it is in the hero)', () => {
    render(<OverviewPage />);
    // Lead Bob should be queue-row-0 (head was Alice in HeroCard).
    expect(screen.getByTestId('queue-row-0')).toHaveTextContent('Lead Bob');
  });
});
