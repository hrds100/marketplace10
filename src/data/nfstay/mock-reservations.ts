export interface MockReservation {
  id: string;
  property_id: string;
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  infants: number;
  status: string;
  payment_status: string;
  total_amount: number;
  payment_currency: string;
  created_at: string;
}

/** Helper: resolve property display info (placeholder until Supabase is wired) */
export function getReservationProperty(_r: MockReservation) {
  return {
    title: "Property",
    image: "",
    city: "",
    country: "",
  };
}

export const mockReservations: MockReservation[] = [
  {
    id: 'res-001',
    property_id: 'prop-001',
    guest_email: 'sarah@example.com',
    guest_first_name: 'Sarah',
    guest_last_name: 'Johnson',
    guest_phone: '+44 7700 900001',
    check_in: '2026-04-10',
    check_out: '2026-04-15',
    adults: 2,
    children: 0,
    infants: 0,
    status: 'confirmed',
    payment_status: 'paid',
    total_amount: 970,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-002',
    property_id: 'prop-002',
    guest_email: 'james@example.com',
    guest_first_name: 'James',
    guest_last_name: 'Williams',
    guest_phone: '+44 7700 900002',
    check_in: '2026-05-01',
    check_out: '2026-05-08',
    adults: 4,
    children: 2,
    infants: 0,
    status: 'confirmed',
    payment_status: 'paid',
    total_amount: 744,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-003',
    property_id: 'prop-003',
    guest_email: 'maria@example.com',
    guest_first_name: 'Maria',
    guest_last_name: 'Garcia',
    guest_phone: '+34 600 123 456',
    check_in: '2026-03-25',
    check_out: '2026-03-28',
    adults: 2,
    children: 0,
    infants: 0,
    status: 'pending',
    payment_status: 'pending',
    total_amount: 310,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-004',
    property_id: 'prop-005',
    guest_email: 'sarah@example.com',
    guest_first_name: 'Sarah',
    guest_last_name: 'Johnson',
    guest_phone: '+44 7700 900001',
    check_in: '2026-02-10',
    check_out: '2026-02-14',
    adults: 2,
    children: 1,
    infants: 0,
    status: 'completed',
    payment_status: 'paid',
    total_amount: 740,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-005',
    property_id: 'prop-009',
    guest_email: 'tom@example.com',
    guest_first_name: 'Tom',
    guest_last_name: 'Brown',
    guest_phone: '+44 7700 900003',
    check_in: '2026-06-15',
    check_out: '2026-06-22',
    adults: 4,
    children: 3,
    infants: 1,
    status: 'confirmed',
    payment_status: 'paid',
    total_amount: 1741,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-006',
    property_id: 'prop-007',
    guest_email: 'emma@example.com',
    guest_first_name: 'Emma',
    guest_last_name: 'Davis',
    guest_phone: '+1 555 123 4567',
    check_in: '2026-01-20',
    check_out: '2026-01-23',
    adults: 2,
    children: 0,
    infants: 0,
    status: 'cancelled',
    payment_status: 'refunded',
    total_amount: 254,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-007',
    property_id: 'prop-012',
    guest_email: 'alex@example.com',
    guest_first_name: 'Alex',
    guest_last_name: 'Wilson',
    guest_phone: '+44 7700 900004',
    check_in: '2026-04-01',
    check_out: '2026-04-05',
    adults: 3,
    children: 2,
    infants: 0,
    status: 'confirmed',
    payment_status: 'paid',
    total_amount: 700,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'res-008',
    property_id: 'prop-004',
    guest_email: 'james@example.com',
    guest_first_name: 'James',
    guest_last_name: 'Williams',
    guest_phone: '+44 7700 900002',
    check_in: '2025-12-20',
    check_out: '2025-12-27',
    adults: 2,
    children: 2,
    infants: 0,
    status: 'completed',
    payment_status: 'paid',
    total_amount: 575,
    payment_currency: 'GBP',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockTestimonials = [
  { name: 'Sarah J.', location: 'London, UK', rating: 5, text: 'Absolutely stunning apartment with incredible marina views. The host was responsive and the check-in was seamless.', property: 'Dubai Marina Apartment' },
  { name: 'James W.', location: 'Manchester, UK', rating: 5, text: 'The Balinese villa exceeded all expectations. Private pool, beautiful gardens, and the most peaceful stay we\'ve ever had.', property: 'Ubud Villa' },
  { name: 'Maria G.', location: 'Madrid, Spain', rating: 4, text: 'Perfect location in Camden with great transport links. The loft was exactly as pictured — stylish and comfortable.', property: 'Camden Loft' },
  { name: 'Tom B.', location: 'Bristol, UK', rating: 5, text: 'The Algarve villa was a dream. Infinity pool overlooking the ocean, spacious bedrooms, and a fully equipped kitchen.', property: 'Algarve Villa' },
  { name: 'Emma D.', location: 'New York, USA', rating: 5, text: 'Such a charming studio in Montmartre! Waking up to views of Sacré-Cœur was magical.', property: 'Paris Studio' },
  { name: 'Alex W.', location: 'Edinburgh, UK', rating: 5, text: 'The fjord cabin was the highlight of our Norway trip. Sauna with a view, cozy interiors, and absolute silence.', property: 'Fjord Cabin' },
];
