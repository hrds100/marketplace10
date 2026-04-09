import { describe, it, expect } from 'vitest';
import type { ScraperGroup, ScraperDeal, ParsedDealData, ScraperActivity, ScraperConfig, DealStatus } from '../types';

describe('WhatsApp Scraper Types', () => {
  it('ScraperGroup has correct shape', () => {
    const group: ScraperGroup = {
      id: '123',
      group_name: 'London R2R Deals',
      member_count: 150,
      is_active: true,
      last_scanned_at: '2026-04-09T10:00:00Z',
      deals_found: 42,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-04-09T10:00:00Z',
    };
    expect(group.group_name).toBe('London R2R Deals');
    expect(group.is_active).toBe(true);
    expect(group.last_scanned_at).not.toBeNull();
  });

  it('ScraperGroup allows null last_scanned_at', () => {
    const group: ScraperGroup = {
      id: '456',
      group_name: 'New Group',
      member_count: 0,
      is_active: false,
      last_scanned_at: null,
      deals_found: 0,
      created_at: '2026-04-09T00:00:00Z',
      updated_at: '2026-04-09T00:00:00Z',
    };
    expect(group.last_scanned_at).toBeNull();
  });

  it('ScraperDeal has correct shape with parsed data', () => {
    const deal: ScraperDeal = {
      id: 'deal-1',
      group_id: 'group-1',
      group_name: 'Manchester Deals',
      wa_message_id: 'wa-123',
      sender_phone: '+447700900000',
      sender_name: 'John',
      raw_text: '3 bed house in Manchester, £1200/mo, £300 profit',
      parsed_data: {
        title: '3 bed house',
        city: 'Manchester',
        postcode: 'M1 1AA',
        bedrooms: 3,
        rent_monthly: 1200,
        profit_est: 300,
        property_type: 'house',
        property_category: 'house',
      },
      images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      status: 'pending',
      property_id: null,
      created_at: '2026-04-09T12:00:00Z',
    };
    expect(deal.status).toBe('pending');
    expect(deal.parsed_data?.bedrooms).toBe(3);
    expect(deal.images).toHaveLength(2);
  });

  it('ScraperDeal allows null optional fields', () => {
    const deal: ScraperDeal = {
      id: 'deal-2',
      group_id: null,
      group_name: 'Unknown',
      wa_message_id: 'wa-456',
      sender_phone: null,
      sender_name: null,
      raw_text: 'Some deal text',
      parsed_data: null,
      images: [],
      status: 'rejected',
      property_id: null,
      created_at: '2026-04-09T12:00:00Z',
    };
    expect(deal.sender_phone).toBeNull();
    expect(deal.parsed_data).toBeNull();
  });

  it('DealStatus only allows valid values', () => {
    const validStatuses: DealStatus[] = ['pending', 'approved', 'rejected', 'submitted'];
    expect(validStatuses).toHaveLength(4);
  });

  it('ParsedDealData property_category is constrained', () => {
    const flat: ParsedDealData = { property_category: 'flat' };
    const house: ParsedDealData = { property_category: 'house' };
    const hmo: ParsedDealData = { property_category: 'hmo' };
    expect(flat.property_category).toBe('flat');
    expect(house.property_category).toBe('house');
    expect(hmo.property_category).toBe('hmo');
  });

  it('ScraperActivity has correct shape', () => {
    const activity: ScraperActivity = {
      id: 'act-1',
      action: 'scan_complete',
      details: 'Found 5 new deals',
      group_name: 'London R2R',
      created_at: '2026-04-09T12:00:00Z',
    };
    expect(activity.action).toBe('scan_complete');
  });

  it('ScraperConfig has all required fields', () => {
    const config: ScraperConfig = {
      selected_groups: ['group-1', 'group-2'],
      scan_interval_minutes: 15,
      lookback_hours: 24,
      is_paused: false,
      notifications_enabled: true,
      notification_email: 'admin@hub.nfstay.com',
      max_messages_per_group: 100,
      auto_submit_approved: false,
      duplicate_window_days: 7,
    };
    expect(config.selected_groups).toHaveLength(2);
    expect(config.scan_interval_minutes).toBe(15);
    expect(config.is_paused).toBe(false);
  });
});
