import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScraperGroups } from '../hooks/useScraperGroups';

// Mock supabase
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'wa_scraper_groups') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      if (table === 'wa_scraper_config') {
        return {
          upsert: mockUpsert,
          select: mockSelect,
        };
      }
      return { select: mockSelect, update: mockUpdate, upsert: mockUpsert };
    }),
  },
}));

const mockGroups = [
  {
    id: 'g1',
    group_name: 'London R2R',
    member_count: 200,
    is_active: true,
    last_scanned_at: '2026-04-09T10:00:00Z',
    deals_found: 50,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-09T10:00:00Z',
  },
  {
    id: 'g2',
    group_name: 'Manchester Deals',
    member_count: 100,
    is_active: false,
    last_scanned_at: null,
    deals_found: 0,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
];

describe('useScraperGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: mockGroups, error: null });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockEq.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('fetches groups on mount', async () => {
    const { result } = renderHook(() => useScraperGroups());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toEqual(mockGroups);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { result } = renderHook(() => useScraperGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('DB error');
    expect(result.current.groups).toEqual([]);
  });

  it('toggleGroup updates is_active', async () => {
    const { result } = renderHook(() => useScraperGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleGroup('g1', false);
    });

    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false, updated_at: expect.any(String) });
    expect(mockEq).toHaveBeenCalledWith('id', 'g1');
  });
});
