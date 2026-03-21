import { Heart, Search, SlidersHorizontal } from 'lucide-react';

const DEALS = [
  { name: '2-Bed Flat, Ancoats', city: 'Manchester', postcode: 'M4 6BF', rent: 850, profit: 1200, type: '2-bed', days: 2, featured: true, color: '#87CEEB' },
  { name: '3-Bed House, Headingley', city: 'Leeds', postcode: 'LS6 3BN', rent: 950, profit: 1400, type: '3-bed', days: 5, featured: false, color: '#8B7355' },
  { name: '1-Bed Studio, Baltic Triangle', city: 'Liverpool', postcode: 'L1 0AH', rent: 650, profit: 980, type: '1-bed', days: 1, featured: true, color: '#2E8B57' },
  { name: '2-Bed Flat, Digbeth', city: 'Birmingham', postcode: 'B5 6DB', rent: 780, profit: 1100, type: '2-bed', days: 8, featured: false, color: '#4682B4' },
  { name: '3-Bed Terrace, Clifton', city: 'Bristol', postcode: 'BS8 1AB', rent: 1100, profit: 1650, type: '3-bed', days: 3, featured: true, color: '#556B2F' },
  { name: '1-Bed Flat, Shoreditch', city: 'London', postcode: 'E1 6QR', rent: 1350, profit: 1900, type: '1-bed', days: 0, featured: false, color: '#696969' },
];

function StatusDot({ days }: { days: number }) {
  const color = days <= 7 ? '#22c55e' : days <= 14 ? '#f59e0b' : '#6b7280';
  return <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />;
}

export default function MarketplaceMockup() {
  return (
    <div className="p-4 h-full text-[11px]">
      {/* Search + filter bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 h-8 rounded-lg border px-2.5" style={{ borderColor: '#e5e7eb', background: '#fafafa' }}>
          <Search className="w-3.5 h-3.5 text-[#9ca3af]" />
          <span className="text-[#9ca3af] text-xs">Search deals...</span>
        </div>
        <button className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-medium" style={{ borderColor: '#e5e7eb' }}>
          <SlidersHorizontal className="w-3 h-3" />
          Filters
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {DEALS.map((deal, i) => (
          <div key={i} className="rounded-xl border overflow-hidden bg-white group cursor-pointer transition-shadow hover:shadow-md" style={{ borderColor: '#e8e5df' }}>
            {/* Image placeholder */}
            <div className="relative aspect-[4/3]" style={{ background: `linear-gradient(135deg, ${deal.color}, ${deal.color}dd)` }}>
              {deal.featured && (
                <span className="absolute top-2 left-2 bg-white text-[9px] font-semibold px-2 py-0.5 rounded shadow-sm">
                  Featured
                </span>
              )}
              <button className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <Heart className="w-4 h-4 text-white" fill="none" strokeWidth={2} />
              </button>
              {/* Carousel dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                <span className="w-1 h-1 rounded-full bg-white" />
                <span className="w-1 h-1 rounded-full bg-white/50" />
                <span className="w-1 h-1 rounded-full bg-white/50" />
              </div>
            </div>
            {/* Info */}
            <div className="p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <StatusDot days={deal.days} />
                <span className="font-semibold text-[#0a0a0a] text-[11px] truncate">{deal.name}</span>
              </div>
              <p className="text-[#737373] text-[10px]">{deal.city} · {deal.postcode}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-[#525252]">
                  <strong className="text-[#0a0a0a]">£{deal.rent}</strong>/mo rent
                </span>
                <span className="text-[10px] font-semibold text-[#1e9a80]">
                  £{deal.profit}/mo profit
                </span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button className="flex-1 h-6 rounded-md text-[9px] font-medium border transition-colors hover:bg-[#fafafa]" style={{ borderColor: '#e5e7eb' }}>
                  Add to CRM
                </button>
                <button className="flex-1 h-6 rounded-md text-[9px] font-medium text-white bg-[#1e9a80] hover:bg-[#178f72] transition-colors">
                  Inquire
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
