import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScraperDeals } from '../hooks/useScraperDeals';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockIn = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'wa_scraper_deals') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      if (table === 'properties') {
        return {
          insert: mockInsert,
        };
      }
      return { select: mockSelect, update: mockUpdate, insert: mockInsert };
    }),
  },
}));

const mockDeals = [
  {
    id: 'd1',
    group_id: 'g1',
    group_name: 'London R2R',
    wa_message_id: 'wa-1',
    sender_phone: '+447700900000',
    sender_name: 'John',
    raw_text: '3 bed flat in London',
    parsed_data: { title: '3 bed flat', city: 'London', bedrooms: 3 },
    images: ['img1.jpg'],
    status: 'pending',
    property_id: null,
    created_at: '2026-04-09T12:00:00Z',
  },
  {
    id: 'd2',
    group_id: 'g1',
    group_name: 'London R2R',
    wa_message_id: 'wa-2',
    sender_phone: '+447700900001',
    sender_name: 'Jane',
    raw_text: '2 bed house in Manchester',
    parsed_data: { title: '2 bed house', city: 'Manchester', bedrooms: 2 },
    images: [],
    status: 'approved',
    property_id: null,
    created_at: '2026-04-09T11:00:00Z',
  },
];

describe('useScraperDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: mockDeals, error: null });
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
    mockIn.mockResolvedValue({ data: null, error: null });
  });

  it('fetches all deals on mount', async () => {
    const { result } = renderHook(() => useScraperDeals());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deals).toEqual(mockDeals);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } });

    const { result } = renderHook(() => useScraperDeals());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.deals).toEqual([]);
  });

  it('approveDeal updates status to approved', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: eqMock });

    const { result } = renderHook(() => useScraperDeals());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.approveDeal('d1');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'approved' });
    expect(eqMock).toHaveBeenCalledWith('id', 'd1');
  });

  it('rejectDeal updates status to rejected', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: eqMock });

    const { result } = renderHook(() => useScraperDeals());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.rejectDeal('d1');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'rejected' });
    expect(eqMock).toHaveBeenCalledWith('id', 'd1');
  });
});
