import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

import { rowToCampaign } from '../useDialerCampaigns';

describe('rowToCampaign', () => {
  const baseRow = {
    id: 'camp-1',
    name: 'Outbound May',
    pipeline_id: 'pipe-1',
    parallel_lines: 3,
    auto_advance_seconds: 10,
    ai_coach_enabled: true,
    ai_coach_prompt_id: null,
    script_md: 'Hello!',
    created_by: 'agent-1',
    is_active: true,
  };

  it('maps a row with no queue rollup to zero counts', () => {
    const c = rowToCampaign(baseRow, undefined);
    expect(c).toMatchObject({
      id: 'camp-1',
      name: 'Outbound May',
      parallelLines: 3,
      autoAdvanceSeconds: 10,
      aiCoachEnabled: true,
      totalLeads: 0,
      doneLeads: 0,
      connectedLeads: 0,
      voicemailLeads: 0,
    });
  });

  it('totalLeads = pending + done from rollup', () => {
    const c = rowToCampaign(baseRow, {
      campaign_id: 'camp-1',
      pending: 7,
      done: 3,
      connected: 2,
      voicemail: 1,
    });
    expect(c.totalLeads).toBe(10);
    expect(c.doneLeads).toBe(3);
    expect(c.connectedLeads).toBe(2);
    expect(c.voicemailLeads).toBe(1);
  });

  it('null script + prompt id coerce to undefined', () => {
    const c = rowToCampaign({ ...baseRow, script_md: null, ai_coach_prompt_id: null }, undefined);
    expect(c.scriptMd).toBeUndefined();
    expect(c.aiCoachPromptId).toBeUndefined();
  });

  it('owner falls back to empty string when created_by is null', () => {
    const c = rowToCampaign({ ...baseRow, created_by: null }, undefined);
    expect(c.ownerAgentId).toBe('');
  });

  it('PR 60: maps is_active → isActive (used by Settings Active/Paused toggle)', () => {
    const active = rowToCampaign({ ...baseRow, is_active: true }, undefined);
    const paused = rowToCampaign({ ...baseRow, is_active: false }, undefined);
    expect(active.isActive).toBe(true);
    expect(paused.isActive).toBe(false);
  });
});
