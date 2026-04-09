import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupManager from '../components/GroupManager';
import type { ScraperGroup } from '../types';

const mockGroups: ScraperGroup[] = [
  {
    id: 'g1',
    group_name: 'London R2R Deals',
    member_count: 200,
    is_active: true,
    last_scanned_at: '2026-04-09T10:00:00Z',
    deals_found: 50,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-09T10:00:00Z',
  },
  {
    id: 'g2',
    group_name: 'Manchester Property',
    member_count: 100,
    is_active: false,
    last_scanned_at: null,
    deals_found: 0,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'g3',
    group_name: 'Birmingham R2R',
    member_count: 80,
    is_active: true,
    last_scanned_at: '2026-04-09T09:00:00Z',
    deals_found: 15,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-04-09T09:00:00Z',
  },
];

const mockToggle = vi.fn();
const mockRefresh = vi.fn();

describe('GroupManager', () => {
  it('renders all groups', () => {
    render(
      <GroupManager
        groups={mockGroups}
        loading={false}
        error={null}
        onToggleGroup={mockToggle}
        onRefresh={mockRefresh}
      />
    );

    expect(screen.getByText('London R2R Deals')).toBeInTheDocument();
    expect(screen.getByText('Manchester Property')).toBeInTheDocument();
    expect(screen.getByText('Birmingham R2R')).toBeInTheDocument();
  });

  it('shows active group count', () => {
    render(
      <GroupManager
        groups={mockGroups}
        loading={false}
        error={null}
        onToggleGroup={mockToggle}
        onRefresh={mockRefresh}
      />
    );

    expect(screen.getByText(/2 of 3 groups active/i)).toBeInTheDocument();
  });

  it('filters groups by search', () => {
    render(
      <GroupManager
        groups={mockGroups}
        loading={false}
        error={null}
        onToggleGroup={mockToggle}
        onRefresh={mockRefresh}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search groups/i);
    fireEvent.change(searchInput, { target: { value: 'London' } });

    expect(screen.getByText('London R2R Deals')).toBeInTheDocument();
    expect(screen.queryByText('Manchester Property')).not.toBeInTheDocument();
    expect(screen.queryByText('Birmingham R2R')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <GroupManager
        groups={[]}
        loading={true}
        error={null}
        onToggleGroup={mockToggle}
        onRefresh={mockRefresh}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <GroupManager
        groups={[]}
        loading={false}
        error="Failed to load groups"
        onToggleGroup={mockToggle}
        onRefresh={mockRefresh}
      />
    );

    expect(screen.getByText(/failed to load groups/i)).toBeInTheDocument();
  });

  it('shows empty state when no groups', () => {
    render(
      <GroupManager
        groups={[]}
        loading={false}
        error={null}
        onToggleGroup={mockToggle}
        onRefresh={mockRefresh}
      />
    );

    expect(screen.getByText(/no groups found/i)).toBeInTheDocument();
  });
});
