import { useState } from 'react';
import { listings, type Listing } from '@/data/mockData';
import { toast } from 'sonner';

export default function AdminListings() {
  const [data, setData] = useState(listings);
  const featuredCount = data.filter(d => d.featured).length;

  const toggleFeatured = (id: string) => {
    const item = data.find(d => d.id === id);
    if (!item?.featured && featuredCount >= 3) {
      toast.error('Maximum 3 featured listings allowed');
      return;
    }
    setData(prev => prev.map(d => d.id === id ? { ...d, featured: !d.featured } : d));
    toast.success('Updated');
  };

  const changeStatus = (id: string, status: Listing['status']) => {
    setData(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Listings</h1>
        <button className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm hover:opacity-90 transition-opacity">+ Add listing</button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'City', 'Rent', 'Profit', 'Status', 'Featured', 'Days', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((l, i) => (
              <tr key={l.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 font-medium text-foreground">{l.name}</td>
                <td className="p-3.5 text-muted-foreground">{l.city}</td>
                <td className="p-3.5 text-foreground">£{l.rent.toLocaleString()}</td>
                <td className="p-3.5 text-accent-foreground font-medium">£{l.profit}</td>
                <td className="p-3.5">
                  <select value={l.status} onChange={e => changeStatus(l.id, e.target.value as Listing['status'])} className="input-nfstay h-8 text-xs bg-card pr-6">
                    <option value="live">Live</option>
                    <option value="on-offer">On offer</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </td>
                <td className="p-3.5">
                  <button onClick={() => toggleFeatured(l.id)} className={`w-9 h-5 rounded-full relative transition-colors ${l.featured ? 'bg-primary' : 'bg-border'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${l.featured ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="p-3.5 text-muted-foreground">{l.daysAgo}d</td>
                <td className="p-3.5">
                  <div className="flex gap-2">
                    <button className="text-xs text-primary font-medium">View</button>
                    <button className="text-xs text-foreground font-medium">Edit</button>
                    <button className="text-xs text-destructive font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
