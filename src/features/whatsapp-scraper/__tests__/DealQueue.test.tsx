import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DealQueue from '../components/DealQueue';
import type { ScraperDeal } from '../types';

const mockDeals: ScraperDeal[] = [
  {
    id: 'd1',
    group_id: 'g1',
    group_name: 'London R2R',
    wa_message_id: 'wa-1',
    sender_phone: '+447700900000',
    sender_name: 'John Smith',
    raw_text: '3 bed flat in London, £1500/mo',
    parsed_data: { title: '3 bed flat', city: 'London', bedrooms: 3, rent_monthly: 1500 },
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
    sender_name: 'Jane Doe',
    raw_text: '2 bed house in Manchester',
    parsed_data: { title: '2 bed house', city: 'Manchester', bedrooms: 2 },
    images: [],
    status: 'approved',
    property_id: null,
    created_at: '2026-04-09T11:00:00Z',
  },
  {
    id: 'd3',
    group_id: 'g2',
    group_name: 'Manchester Deals',
    wa_message_id: 'wa-3',
    sender_phone: null,
    sender_name: null,
    raw_text: 'Some deal rejected',
    parsed_data: null,
    images: [],
    status: 'rejected',
    property_id: null,
    created_at: '2026-04-09T10:00:00Z',
  },
];

const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockSubmit = vi.fn();
const mockBulkApprove = vi.fn();
const mockBulkReject = vi.fn();

describe('DealQueue', () => {
  it('renders all deals', () => {
    render(
      <DealQueue
        deals={mockDeals}
        loading={false}
        error={null}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        onBulkApprove={mockBulkApprove}
        onBulkReject={mockBulkReject}
      />
    );

    expect(screen.getByText('3 bed flat')).toBeInTheDocument();
    expect(screen.getByText('2 bed house')).toBeInTheDocument();
  });

  it('filters by status tab', () => {
    render(
      <DealQueue
        deals={mockDeals}
        loading={false}
        error={null}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        onBulkApprove={mockBulkApprove}
        onBulkReject={mockBulkReject}
      />
    );

    const pendingTab = screen.getByRole('tab', { name: /pending/i });
    fireEvent.click(pendingTab);

    // Only pending deal should be visible
    expect(screen.getByText('3 bed flat')).toBeInTheDocument();
    expect(screen.queryByText('2 bed house')).not.toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <DealQueue
        deals={[]}
        loading={false}
        error={null}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        onBulkApprove={mockBulkApprove}
        onBulkReject={mockBulkReject}
      />
    );

    expect(screen.getByText(/no deals in queue/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <DealQueue
        deals={[]}
        loading={true}
        error={null}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        onBulkApprove={mockBulkApprove}
        onBulkReject={mockBulkReject}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <DealQueue
        deals={[]}
        loading={false}
        error="Failed to load deals"
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        onBulkApprove={mockBulkApprove}
        onBulkReject={mockBulkReject}
      />
    );

    expect(screen.getByText(/failed to load deals/i)).toBeInTheDocument();
  });
});
