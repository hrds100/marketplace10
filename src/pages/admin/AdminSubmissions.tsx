import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminSubmissions() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: submissions = [] } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = filter === 'all'
    ? submissions
    : filter === 'pending'
      ? submissions.filter(s => s.status === 'pending')
      : submissions.filter(s => s.status === filter);

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  const approve = async (id: string) => {
    const submission = submissions.find(s => s.id === id);
    const { error } = await supabase.from('properties').update({ status: 'live' as any }).eq('id', id);
    if (error) { toast.error(`Approve failed: ${error.message}`); console.error('Approve error:', error); return; }
    toast.success('Published ✓');
    queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });

    // Email member on approval (non-blocking)
    if (submission?.contact_email) {
      supabase.functions.invoke('send-email', {
        body: {
          type: 'deal-approved-member',
          data: {
            memberEmail: submission.contact_email,
            name: submission.name,
            city: submission.city,
          },
        },
      }).catch(() => {});
    }
  };

  const reject = async (id: string) => {
    const { error } = await supabase.from('properties').update({ status: 'inactive' as any }).eq('id', id);
    if (error) { toast.error(`Reject failed: ${error.message}`); console.error('Reject error:', error); return; }
    toast.error('Rejected');
    queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
  };

  const statusLabel = (status: string) => {
    if (status === 'live') return <span className="badge-green">Live</span>;
    if (status === 'pending') return <span className="badge-amber">Pending</span>;
    if (status === 'inactive') return <span className="badge-gray">Inactive</span>;
    if (status === 'on-offer') return <span className="badge-blue">On offer</span>;
    return <span className="badge-gray">{status}</span>;
  };

  const saLabel = (sa: string | null) => {
    if (sa === 'yes') return <span className="text-emerald-600 font-medium">Yes</span>;
    if (sa === 'no') return <span className="text-red-500 font-medium">No</span>;
    return <span className="text-amber-500 font-medium">Awaiting</span>;
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Deal Submissions</h1>

      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'live'] as const).map(f => {
          const count = f === 'pending' ? pendingCount : null;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold capitalize transition-colors inline-flex items-center gap-1.5 ${filter === f ? 'bg-nfstay-black text-nfstay-black-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f}
              {count !== null && count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/20 text-white' : 'bg-destructive text-white'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Row header */}
            <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                  {statusLabel(s.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.city} · {s.postcode} · £{s.rent_monthly?.toLocaleString()}/mo</p>
              </div>
              <div className="flex items-center gap-2">
                {(s.status === 'pending' || s.status === 'inactive') && (
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => approve(s.id)} className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Approve</button>
                    <button onClick={() => reject(s.id)} className="text-xs text-destructive font-medium px-2">Reject</button>
                  </div>
                )}
                {expandedId === s.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === s.id && (
              <div className="border-t border-border p-4 space-y-4">
                {/* Property details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Detail label="Type" value={s.type} />
                  <Detail label="Category" value={s.property_category || '—'} />
                  <Detail label="Bedrooms" value={s.bedrooms?.toString() || '—'} />
                  <Detail label="Bathrooms" value={s.bathrooms?.toString() || '—'} />
                  <Detail label="Garage" value={s.garage ? 'Yes' : 'No'} />
                  <Detail label="SA Approved" value={saLabel(s.sa_approved)} />
                  <Detail label="Rent" value={`£${s.rent_monthly?.toLocaleString()}`} />
                  <Detail label="Est. Profit" value={`£${s.profit_est?.toLocaleString()}`} />
                  <Detail label="Deposit" value={s.deposit ? `£${s.deposit.toLocaleString()}` : '—'} />
                  <Detail label="Agent Fee" value={s.agent_fee ? `£${s.agent_fee.toLocaleString()}` : '—'} />
                  <Detail label="Featured" value={s.featured ? 'Yes' : 'No'} />
                  <Detail label="Created" value={new Date(s.created_at).toLocaleDateString()} />
                </div>

                {/* Contact */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Contact</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Detail label="Name" value={s.contact_name || '—'} />
                    <Detail label="Phone" value={s.contact_phone || '—'} />
                    <Detail label="WhatsApp" value={s.contact_whatsapp || s.landlord_whatsapp || '—'} />
                    <Detail label="Email" value={s.contact_email || '—'} />
                  </div>
                </div>

                {/* Notes */}
                {(s.notes || s.description) && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.notes || s.description}</p>
                  </div>
                )}

                {/* Photos */}
                {s.photos && s.photos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2">Photos ({s.photos.length})</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {s.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative rounded-lg overflow-hidden aspect-square group">
                          <img src={url} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No submissions found.</p>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] text-muted-foreground block">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
