import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminUsers() {
  // Fetch profiles from Supabase, fallback to static
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      // This will fail for non-admins due to RLS, which is expected
      if (error) return [];
      return data;
    },
  });

  const users = profiles && profiles.length > 0 ? profiles : [
    { id: 'u-1', name: 'James Walker', email: 'james@example.com', whatsapp: '+447911123456', created_at: '2026-01-01' },
    { id: 'u-2', name: 'Sarah Khan', email: 'sarah@example.com', whatsapp: '+447922234567', created_at: '2026-01-15' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-bold text-foreground">Users ({users.length})</h1>
        <button className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">Export CSV</button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {['Name', 'Email', 'WhatsApp', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left p-3.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u: any, i: number) => (
              <tr key={u.id} className={i % 2 === 1 ? 'bg-secondary' : ''}>
                <td className="p-3.5 font-medium text-foreground">{u.name}</td>
                <td className="p-3.5 text-muted-foreground">{u.email}</td>
                <td className="p-3.5">
                  {u.whatsapp ? (
                    <a href={`https://wa.me/${u.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-75 inline-flex items-center gap-1 text-xs font-medium">
                      <MessageCircle className="w-3.5 h-3.5" /> {u.whatsapp}
                    </a>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="p-3.5 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3.5">
                  <div className="flex gap-2">
                    <button className="text-xs text-primary font-medium">View</button>
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
