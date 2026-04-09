import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DealCard from '../components/DealCard';
import type { ScraperDeal } from '../types';

const baseDeal: ScraperDeal = {
  id: 'd1',
  group_id: 'g1',
  group_name: 'London R2R',
  wa_message_id: 'wa-1',
  sender_phone: '+447700900000',
  sender_name: 'John Smith',
  raw_text: '3 bed flat in London, £1500/mo, great location near tube',
  parsed_data: {
    title: '3 bed flat in Islington',
    city: 'London',
    postcode: 'N1 2AA',
    bedrooms: 3,
    bathrooms: 1,
    rent_monthly: 1500,
    profit_est: 400,
    property_type: 'flat',
    property_category: 'flat',
  },
  images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  status: 'pending',
  property_id: null,
  created_at: '2026-04-09T12:00:00Z',
};

const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockSubmit = vi.fn();
const mockSelect = vi.fn();

describe('DealCard', () => {
  it('renders parsed deal data', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByText('3 bed flat in Islington')).toBeInTheDocument();
    expect(screen.getByText('London, N1 2AA')).toBeInTheDocument();
    // "3 bed" appears in title and bed count
    expect(screen.getAllByText(/3/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows rent and profit', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByText(/1,500/)).toBeInTheDocument();
    expect(screen.getByText(/400/)).toBeInTheDocument();
  });

  it('shows sender info', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('+447700900000')).toBeInTheDocument();
  });

  it('shows group name', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByText('London R2R')).toBeInTheDocument();
  });

  it('shows approve/reject buttons for pending deals', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('calls onApprove when approve clicked', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    expect(mockApprove).toHaveBeenCalledWith('d1');
  });

  it('calls onReject when reject clicked', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    expect(mockReject).toHaveBeenCalledWith('d1');
  });

  it('shows submit button for approved deals', () => {
    const approvedDeal = { ...baseDeal, status: 'approved' as const };
    render(
      <DealCard
        deal={approvedDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByRole('button', { name: /submit as deal/i })).toBeInTheDocument();
  });

  it('calls onSubmit when submit clicked', () => {
    const approvedDeal = { ...baseDeal, status: 'approved' as const };
    render(
      <DealCard
        deal={approvedDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /submit as deal/i }));
    expect(mockSubmit).toHaveBeenCalledWith('d1');
  });

  it('shows pending status badge', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('handles deal with no parsed data gracefully', () => {
    const noParsedDeal: ScraperDeal = {
      ...baseDeal,
      parsed_data: null,
      sender_name: null,
      sender_phone: null,
    };

    render(
      <DealCard
        deal={noParsedDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    // Should show raw text when no parsed data
    expect(screen.getByText(/3 bed flat in London/)).toBeInTheDocument();
  });

  it('toggles raw text visibility', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    // Raw text should be hidden by default when parsed data exists
    const toggleBtn = screen.getByRole('button', { name: /show raw/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/3 bed flat in London, £1500\/mo, great location near tube/)).toBeInTheDocument();
  });

  it('handles checkbox select', () => {
    render(
      <DealCard
        deal={baseDeal}
        onApprove={mockApprove}
        onReject={mockReject}
        onSubmit={mockSubmit}
        selected={false}
        onSelect={mockSelect}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockSelect).toHaveBeenCalledWith('d1');
  });
});
