import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { listings } from '@/data/mockData';
import { useFavourites } from '@/hooks/useFavourites';
import { toast } from 'sonner';

const tabs = ['All', 'Live', 'On Offer', 'Inactive'] as const;

export default function DealsPage() {
  const { toggle, isFav } = useFavourites();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [showAlert, setShowAlert] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = useMemo(() => {
    let result = [...listings];
    if (activeTab !== 'All') {
      const statusMap: Record<string, string> = { 'Live': 'live', 'On Offer': 'on-offer', 'Inactive': 'inactive' };
      result = result.filter(l => l.status === statusMap[activeTab]);
    }
    if (city) result = result.filter(l => l.city === city);
    if (type) result = result.filter(l => l.type === type);
    if (sort === 'profit') result.sort((a, b) => b.profit - a.profit);
    else if (sort === 'rent') result.sort((a, b) => a.rent - b.rent);
    else result.sort((a, b) => a.daysAgo - b.daysAgo);
    return result;
  }, [activeTab, city, type, sort]);

  const featured = listings.filter(l => l.featured);
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageListings = filtered.slice((page - 1) * perPage, page * perPage);
  const cities = [...new Set(listings.map(l => l.city))].sort();
  const types = [...new Set(listings.map(l => l.type))].sort();

  const handleAddToCRM = (listing: typeof listings[0]) => {
    toast.success(`${listing.name} added to CRM`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">Landlord-approved rent-to-rent opportunities across the UK</p>
        </div>
        <span className="badge-gray text-xs">📍 UK-wide · 1,800+ live listings</span>
      </div>

      {showAlert && (
        <div className="bg-accent-light border rounded-xl p-3 px-4 mb-6 flex items-center gap-2.5" style={{ borderColor: 'hsla(145,63%,42%,0.18)' }}>
          <Bell className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-[13px] font-medium text-accent-foreground">3 new deals added in Manchester today</span>
          <button className="text-[13px] text-primary font-semibold ml-1 hover:underline">View</button>
          <button onClick={() => setShowAlert(false)} className="ml-auto text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Featured */}
      <div className="mb-8">
        <span className="text-[13px] font-semibold text-foreground mb-3 block">⭐ Featured</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map(l => (
            <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onAddToCRM={() => handleAddToCRM(l)} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${activeTab === t ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">Showing {filtered.length} deals</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <select value={city} onChange={e => { setCity(e.target.value); setPage(1); }} className="input-nfstay h-[38px] text-sm pr-8 bg-card">
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="input-nfstay h-[38px] text-sm pr-8 bg-card">
          <option value="">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input-nfstay h-[38px] text-sm pr-8 bg-card ml-auto">
          <option value="newest">Newest</option>
          <option value="profit">Highest profit</option>
          <option value="rent">Lowest rent</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {pageListings.map(l => (
          <PropertyCard key={l.id} listing={l} isFav={isFav(l.id)} onToggleFav={() => toggle(l.id)} onAddToCRM={() => handleAddToCRM(l)} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">Prev</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-full text-sm font-medium ${page === p ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{p}</button>
          ))}
          {totalPages > 5 && <span className="text-muted-foreground">…</span>}
          {totalPages > 5 && <button onClick={() => setPage(totalPages)} className={`w-8 h-8 rounded-full text-sm ${page === totalPages ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground'}`}>{totalPages}</button>}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
