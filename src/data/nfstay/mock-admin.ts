export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  role: 'traveler' | 'operator' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
  last_sign_in: string;
  avatar_url: string;
  bookings_count: number;
}

export const mockUsers: MockUser[] = [
  { id: 'usr-001', email: 'sarah@example.com', full_name: 'Sarah Johnson', role: 'traveler', status: 'active', created_at: '2025-09-15', last_sign_in: '2026-03-19', avatar_url: '', bookings_count: 5 },
  { id: 'usr-002', email: 'james@example.com', full_name: 'James Williams', role: 'traveler', status: 'active', created_at: '2025-10-02', last_sign_in: '2026-03-18', avatar_url: '', bookings_count: 3 },
  { id: 'usr-003', email: 'maria@example.com', full_name: 'Maria Garcia', role: 'traveler', status: 'active', created_at: '2025-11-20', last_sign_in: '2026-03-17', avatar_url: '', bookings_count: 1 },
  { id: 'usr-004', email: 'tom@example.com', full_name: 'Tom Brown', role: 'traveler', status: 'suspended', created_at: '2025-08-10', last_sign_in: '2026-02-01', avatar_url: '', bookings_count: 2 },
  { id: 'usr-005', email: 'emma@example.com', full_name: 'Emma Davis', role: 'traveler', status: 'active', created_at: '2025-12-05', last_sign_in: '2026-03-15', avatar_url: '', bookings_count: 1 },
  { id: 'usr-006', email: 'alex@example.com', full_name: 'Alex Wilson', role: 'traveler', status: 'active', created_at: '2026-01-12', last_sign_in: '2026-03-20', avatar_url: '', bookings_count: 2 },
  { id: 'usr-007', email: 'hello@sunsetproperties.com', full_name: 'Sunset Properties Ltd', role: 'operator', status: 'active', created_at: '2025-08-01', last_sign_in: '2026-03-20', avatar_url: '', bookings_count: 0 },
  { id: 'usr-008', email: 'info@coastalretreats.com', full_name: 'Coastal Retreats', role: 'operator', status: 'active', created_at: '2025-09-20', last_sign_in: '2026-03-19', avatar_url: '', bookings_count: 0 },
  { id: 'usr-009', email: 'contact@urbanstays.com', full_name: 'Urban Stays Co', role: 'operator', status: 'pending', created_at: '2026-03-10', last_sign_in: '', avatar_url: '', bookings_count: 0 },
  { id: 'usr-010', email: 'hello@alpinelodges.com', full_name: 'Alpine Lodges GmbH', role: 'operator', status: 'pending', created_at: '2026-03-15', last_sign_in: '', avatar_url: '', bookings_count: 0 },
  { id: 'usr-011', email: 'admin@nfstay.app', full_name: 'NFStay Admin', role: 'admin', status: 'active', created_at: '2025-06-01', last_sign_in: '2026-03-20', avatar_url: '', bookings_count: 0 },
];

export interface MockOperatorApplication {
  id: string;
  user_id: string;
  business_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  property_count: number;
  country: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at: string | null;
  notes: string;
}

export const mockOperatorApplications: MockOperatorApplication[] = [
  { id: 'app-001', user_id: 'usr-009', business_name: 'Urban Stays Co', contact_email: 'contact@urbanstays.com', contact_phone: '+44 20 1234 5678', website: 'https://urbanstays.com', property_count: 8, country: 'UK', status: 'pending', applied_at: '2026-03-10', reviewed_at: null, notes: 'Has existing portfolio on Airbnb with 4.9 avg rating.' },
  { id: 'app-002', user_id: 'usr-010', business_name: 'Alpine Lodges GmbH', contact_email: 'hello@alpinelodges.com', contact_phone: '+41 44 567 8901', website: 'https://alpinelodges.ch', property_count: 12, country: 'Switzerland', status: 'pending', applied_at: '2026-03-15', reviewed_at: null, notes: 'Family-run business, 20+ years in hospitality.' },
  { id: 'app-003', user_id: 'usr-007', business_name: 'Sunset Properties Ltd', contact_email: 'hello@sunsetproperties.com', contact_phone: '+44 20 7946 0958', website: 'https://sunsetproperties.com', property_count: 6, country: 'UAE', status: 'approved', applied_at: '2025-07-20', reviewed_at: '2025-08-01', notes: '' },
  { id: 'app-004', user_id: 'usr-008', business_name: 'Coastal Retreats', contact_email: 'info@coastalretreats.com', contact_phone: '+351 912 345 678', website: 'https://coastalretreats.pt', property_count: 4, country: 'Portugal', status: 'approved', applied_at: '2025-09-01', reviewed_at: '2025-09-20', notes: '' },
  { id: 'app-005', user_id: '', business_name: 'QuickBnB Ltd', contact_email: 'spam@quickbnb.xyz', contact_phone: '+1 000 000 0000', website: '', property_count: 0, country: 'Unknown', status: 'rejected', applied_at: '2026-02-28', reviewed_at: '2026-03-01', notes: 'Suspected spam application. No verifiable business.' },
];

export const mockPlatformStats = {
  totalUsers: 1247,
  totalOperators: 38,
  totalProperties: 156,
  totalBookings: 892,
  totalRevenue: 284500,
  monthlyGrowth: 12.4,
  activeListings: 142,
  pendingApprovals: 2,
};

export const mockPlatformRevenue = [
  { month: 'Jul', revenue: 18200, bookings: 62 },
  { month: 'Aug', revenue: 24500, bookings: 84 },
  { month: 'Sep', revenue: 21800, bookings: 75 },
  { month: 'Oct', revenue: 26300, bookings: 91 },
  { month: 'Nov', revenue: 28100, bookings: 96 },
  { month: 'Dec', revenue: 34200, bookings: 118 },
  { month: 'Jan', revenue: 29400, bookings: 101 },
  { month: 'Feb', revenue: 31800, bookings: 109 },
  { month: 'Mar', revenue: 35600, bookings: 122 },
];

export const mockUserGrowth = [
  { month: 'Jul', travelers: 680, operators: 18 },
  { month: 'Aug', travelers: 740, operators: 21 },
  { month: 'Sep', travelers: 810, operators: 24 },
  { month: 'Oct', travelers: 880, operators: 27 },
  { month: 'Nov', travelers: 960, operators: 30 },
  { month: 'Dec', travelers: 1050, operators: 33 },
  { month: 'Jan', travelers: 1100, operators: 34 },
  { month: 'Feb', travelers: 1180, operators: 36 },
  { month: 'Mar', travelers: 1247, operators: 38 },
];
