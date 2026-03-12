import { useState } from 'react';
import { submissions } from '@/data/mockData';
import { toast } from 'sonner';

export default function AdminSubmissions() {
  const [data, setData] = useState(submissions);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? data : data.filter(s => s.status === filter);

  const approve = (id: string) => {
    setData(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
    toast.success('Published ✓');
  };
  const reject = (id: string) => {
    setData(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
    toast.error('Rejected');
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Deal submissions</h1>

      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-colors ${filter === f ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Submitted by', 'City', 'Rent', 'Date', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 font-medium text-foreground">{s.name}</td>
                <td className="p-3.5 text-muted-foreground">{s.submittedBy}</td>
                <td className="p-3.5 text-muted-foreground">{s.city}</td>
                <td className="p-3.5 text-foreground">£{s.rent.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{s.date}</td>
                <td className="p-3.5">
                  <span className={s.status === 'approved' ? 'badge-green' : s.status === 'rejected' ? 'badge-red' : 'badge-amber'}>{s.status}</span>
                </td>
                <td className="p-3.5">
                  {s.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => approve(s.id)} className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1 rounded-md font-medium">Approve</button>
                      <button onClick={() => reject(s.id)} className="text-xs text-destructive font-medium">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
