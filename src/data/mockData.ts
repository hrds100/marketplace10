export interface Listing {
  id: string;
  name: string;
  city: string;
  postcode: string;
  rent: number;
  profit: number;
  type: string;
  status: 'live' | 'on-offer' | 'inactive';
  featured: boolean;
  daysAgo: number;
  image: string;
  landlordApproved: boolean;
}

export interface CRMDeal {
  id: string;
  name: string;
  city: string;
  postcode: string;
  rent: number;
  profit: number;
  type: string;
  stage: string;
  lastContact: string;
  ownerInitials: string;
  notes: string;
  whatsapp?: string;
}

export interface UniversityModule {
  id: string;
  emoji: string;
  title: string;
  description: string;
  lessons: number;
  minutes: number;
  status: 'not-started' | 'in-progress' | 'completed';
  image: string;
}

const cities = ['Manchester', 'London', 'Birmingham', 'Leeds', 'Bristol', 'Liverpool', 'Glasgow', 'Sheffield', 'Nottingham', 'Edinburgh'];
const cityCodes: Record<string, string[]> = {
  Manchester: ['M1', 'M14', 'M20', 'M16', 'M4', 'M21', 'M13', 'M15', 'M3'],
  London: ['SW9', 'E1', 'SE1', 'N1', 'W2', 'EC1', 'NW1', 'E14', 'SW1'],
  Birmingham: ['B1', 'B5', 'B15', 'B16', 'B18', 'B29', 'B11', 'B13', 'B17'],
  Leeds: ['LS1', 'LS2', 'LS6', 'LS7', 'LS9', 'LS11', 'LS3', 'LS4', 'LS5'],
  Bristol: ['BS1', 'BS2', 'BS5', 'BS6', 'BS8', 'BS3', 'BS4', 'BS7', 'BS9'],
  Liverpool: ['L1', 'L2', 'L3', 'L8', 'L15', 'L17', 'L7', 'L6', 'L4'],
  Glasgow: ['G1', 'G2', 'G3', 'G11', 'G12', 'G20', 'G4', 'G5', 'G41'],
  Sheffield: ['S1', 'S2', 'S3', 'S7', 'S10', 'S11', 'S6', 'S8', 'S9'],
  Nottingham: ['NG1', 'NG2', 'NG3', 'NG5', 'NG7', 'NG9', 'NG4', 'NG6', 'NG8'],
  Edinburgh: ['EH1', 'EH2', 'EH3', 'EH6', 'EH8', 'EH10', 'EH4', 'EH5', 'EH7'],
};
const citySeeds: Record<string, string> = {
  Manchester: 'mcr', London: 'ldn', Birmingham: 'bham', Leeds: 'leeds',
  Bristol: 'brs', Liverpool: 'lvp', Glasgow: 'gla', Sheffield: 'shef',
  Nottingham: 'nott', Edinburgh: 'edin',
};
const propertyNames = [
  'Maple House', 'Victoria Court', 'Oak Lodge', 'Regent Place', 'Elm Terrace',
  'Birch Manor', 'Cedar View', 'Willow Gate', 'Pine Apartments', 'Ash Grove',
  'Ivy House', 'Holly Court', 'Hazel Lodge', 'Laurel Place', 'Beech Walk',
  'Cherry Close', 'Rowan House', 'Poplar Terrace', 'Sycamore Court', 'Juniper Mews',
];
const types = ['1-bed flat', '2-bed flat', '3-bed flat', '2-bed house', '3-bed house', '4-bed house'];
const statuses: Array<'live' | 'on-offer' | 'inactive'> = ['live', 'live', 'live', 'live', 'live', 'live', 'on-offer', 'on-offer', 'inactive'];

export const listings: Listing[] = Array.from({ length: 90 }, (_, i) => {
  const city = cities[i % 10];
  const idx = Math.floor(i / 10) + 1;
  const rent = 800 + Math.floor(Math.random() * 1700);
  return {
    id: `deal-${i + 1}`,
    name: propertyNames[i % propertyNames.length] + (i >= 20 ? ` ${Math.floor(i / 20) + 1}` : ''),
    city,
    postcode: cityCodes[city][idx % cityCodes[city].length],
    rent,
    profit: 300 + Math.floor(Math.random() * 600),
    type: types[i % types.length],
    status: i < 3 ? 'live' : statuses[i % statuses.length],
    featured: i < 3,
    daysAgo: 1 + (i % 30),
    image: `https://picsum.photos/seed/prop-${city.toLowerCase()}-${i}-${idx}/800/520`,
    landlordApproved: true,
  };
});

export const CRM_STAGES = ['New Lead', 'Under Negotiation', 'Contract Sent', 'Follow Up', 'Closed', 'Portfolio'];

export const universityModules: UniversityModule[] = [
  { id: 'mod-1', emoji: '🚀', title: 'Getting Started', description: 'Set up your R2R business from scratch', lessons: 6, minutes: 45, status: 'completed', image: 'https://picsum.photos/seed/uni-mod1/640/360' },
  { id: 'mod-2', emoji: '🏠', title: 'Property Hunting', description: 'Find the best rent-to-rent opportunities', lessons: 8, minutes: 60, status: 'in-progress', image: 'https://picsum.photos/seed/uni-mod2/640/360' },
  { id: 'mod-3', emoji: '💬', title: 'Landlord Pitching', description: 'Win landlords over with proven scripts', lessons: 5, minutes: 35, status: 'in-progress', image: 'https://picsum.photos/seed/uni-mod3/640/360' },
  { id: 'mod-4', emoji: '🔍', title: 'Best UK Portals', description: 'Where to list for maximum bookings', lessons: 4, minutes: 30, status: 'not-started', image: 'https://picsum.photos/seed/uni-mod4/640/360' },
  { id: 'mod-5', emoji: '🛋', title: 'Furnishing', description: 'Style properties that book themselves', lessons: 6, minutes: 40, status: 'not-started', image: 'https://picsum.photos/seed/uni-mod5/640/360' },
  { id: 'mod-6', emoji: '⚖️', title: 'Compliance', description: 'Stay legal and avoid costly mistakes', lessons: 7, minutes: 50, status: 'not-started', image: 'https://picsum.photos/seed/uni-mod6/640/360' },
  { id: 'mod-7', emoji: '💷', title: 'Pricing Strategy', description: 'Maximise nightly rates and occupancy', lessons: 5, minutes: 35, status: 'not-started', image: 'https://picsum.photos/seed/uni-mod7/640/360' },
  { id: 'mod-8', emoji: '📞', title: 'Outreach Scripts', description: 'Cold calling and email templates that work', lessons: 4, minutes: 25, status: 'not-started', image: 'https://picsum.photos/seed/uni-mod8/640/360' },
  { id: 'mod-9', emoji: '🧹', title: 'Operations Basics', description: 'Cleaning, check-ins, and guest comms', lessons: 8, minutes: 55, status: 'not-started', image: 'https://picsum.photos/seed/uni-mod9/640/360' },
];

export const payoutHistory = [
  { date: '15 Mar 2026', amount: '£48.50', status: 'Paid', reference: 'PAY-001' },
  { date: '15 Feb 2026', amount: '£67.00', status: 'Paid', reference: 'PAY-002' },
  { date: '15 Apr 2026', amount: '£48.50', status: 'Pending', reference: 'PAY-003' },
];

export const submissions = [
  { id: 'sub-1', name: 'Hawthorn Mews', submittedBy: 'Sarah K.', city: 'Manchester', rent: 1100, date: '10 Mar 2026', status: 'pending' },
  { id: 'sub-2', name: 'Riverside Loft', submittedBy: 'Tom P.', city: 'London', rent: 2200, date: '9 Mar 2026', status: 'pending' },
  { id: 'sub-3', name: 'Canal Quarter', submittedBy: 'Priya S.', city: 'Birmingham', rent: 950, date: '8 Mar 2026', status: 'pending' },
  { id: 'sub-4', name: 'Orchard House', submittedBy: 'James W.', city: 'Leeds', rent: 1050, date: '7 Mar 2026', status: 'pending' },
  { id: 'sub-5', name: 'Station Mews', submittedBy: 'Alex R.', city: 'Bristol', rent: 1300, date: '5 Mar 2026', status: 'approved' },
  { id: 'sub-6', name: 'Park View', submittedBy: 'Lucy H.', city: 'Liverpool', rent: 900, date: '4 Mar 2026', status: 'approved' },
  { id: 'sub-7', name: 'Meadow Close', submittedBy: 'Dan M.', city: 'Sheffield', rent: 800, date: '3 Mar 2026', status: 'rejected' },
];

export const faqItems = [
  { id: 'faq-1', question: 'What is rent-to-rent?', answer: 'Rent-to-rent is a strategy where you rent a property from a landlord on a long-term basis and sublet it on a short-term basis (e.g., on Airbnb) for a higher return. The difference between what you pay the landlord and what you earn from guests is your profit.', published: true },
  { id: 'faq-2', question: 'Are all deals landlord-approved?', answer: 'Yes. Every listing on nfstay has been verified as landlord-approved for short-term rental use. We check documentation before any deal goes live.', published: true },
  { id: 'faq-3', question: 'How much can I earn per month?', answer: 'Earnings vary by location, property type, and occupancy. Our operators typically earn between £300 and £900 per property per month after all costs.', published: true },
  { id: 'faq-4', question: 'Do I need experience?', answer: 'Not at all. nfstay University walks you through everything from finding your first deal to managing bookings. Many of our most successful operators started with zero experience.', published: true },
  { id: 'faq-5', question: 'What does the membership include?', answer: 'Full access to 1,800+ verified deals, CRM pipeline tools, Airbnb University, deal alerts, and our affiliate programme. Everything you need to build a rent-to-rent portfolio.', published: true },
  { id: 'faq-6', question: 'Can I cancel any time?', answer: 'Absolutely. Cancel your membership at any time from your settings. Your access continues until the end of your billing period.', published: true },
  { id: 'faq-7', question: 'How are deals sourced?', answer: 'Our team sources deals through direct landlord relationships, property agents, and community submissions. Every deal is vetted before going live.', published: true },
  { id: 'faq-8', question: 'Is there a trial?', answer: 'Yes - start with a 3-day trial for just £5. Full platform access, no restrictions. If it is not for you, cancel before your trial ends.', published: true },
];
