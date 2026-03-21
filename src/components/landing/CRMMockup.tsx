const STAGES = [
  {
    name: 'New Lead',
    color: '#3b82f6',
    deals: [
      { name: '2-Bed, Ancoats', city: 'Manchester', rent: 850, profit: 1200, initials: 'MA', color: '#87CEEB' },
      { name: '1-Bed, Baltic', city: 'Liverpool', rent: 650, profit: 980, initials: 'LI', color: '#2E8B57' },
    ],
  },
  {
    name: 'Contacted',
    color: '#f59e0b',
    deals: [
      { name: '3-Bed, Headingley', city: 'Leeds', rent: 950, profit: 1400, initials: 'LE', color: '#8B7355' },
    ],
  },
  {
    name: 'Viewing',
    color: '#8b5cf6',
    deals: [
      { name: '2-Bed, Digbeth', city: 'Birmingham', rent: 780, profit: 1100, initials: 'BI', color: '#4682B4' },
      { name: '3-Bed, Clifton', city: 'Bristol', rent: 1100, profit: 1650, initials: 'BR', color: '#556B2F' },
    ],
  },
  {
    name: 'Deal Agreed',
    color: '#1e9a80',
    deals: [
      { name: '1-Bed, Shoreditch', city: 'London', rent: 1350, profit: 1900, initials: 'LO', color: '#696969' },
    ],
  },
];

export default function CRMMockup() {
  return (
    <div className="p-4 h-full text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-semibold text-[#0a0a0a] text-xs">Deal Pipeline</span>
          <span className="text-[10px] text-[#737373] ml-2">7 active deals</span>
        </div>
        <button className="h-7 px-3 rounded-lg text-[10px] font-medium text-white bg-[#1e9a80] hover:bg-[#178f72] transition-colors">
          + Add Deal
        </button>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <div key={stage.name} className="min-w-[160px] flex-1 rounded-xl p-2.5" style={{ background: '#f8f9fa' }}>
            {/* Column header */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                <span className="font-semibold text-[#0a0a0a] text-[10px]">{stage.name}</span>
              </div>
              <span className="text-[9px] text-[#9ca3af] font-medium bg-white rounded-full px-1.5 py-0.5 border" style={{ borderColor: '#e5e7eb' }}>
                {stage.deals.length}
              </span>
            </div>

            {/* Deal cards */}
            <div className="space-y-2">
              {stage.deals.map((deal, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg p-2.5 border cursor-pointer transition-all hover:shadow-sm"
                  style={{ borderColor: '#e8e5df' }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ background: deal.color }}
                    >
                      {deal.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[#0a0a0a] text-[10px] block truncate">{deal.name}</span>
                      <span className="text-[9px] text-[#737373]">{deal.city}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#525252]">£{deal.rent}/mo</span>
                    <span className="text-[9px] font-semibold text-[#1e9a80]">+£{deal.profit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
