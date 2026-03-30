import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLog';

export default function AdminSubmissions() {
  const { user } = useAuth();
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
    const { error } = await supabase.from('properties').update({ status: 'live' }).eq('id', id);
    if (error) { toast.error(`Approve failed: ${error.message}`); console.error('Approve error:', error); return; }
    toast.success('Published ✓');
    queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });

    // Audit log (fire-and-forget)
    if (user) logAdminAction(user.id, { action: 'approve_deal', target_table: 'properties', target_id: id, metadata: { city: submission?.city, name: submission?.name } });

    // Email member on approval (non-blocking)
    if (submission?.contact_email) {
      supabase.functions.invoke('send-email', {
        body: {
          type: 'deal-approved-member',
          data: { memberEmail: submission.contact_email, name: submission.name, city: submission.city },
        },
      }).catch(() => {});
    }

    // In-app notification for member (non-blocking)
    if (submission?.submitted_by) {
      (supabase.from('notifications') as any).insert({
        user_id: submission.submitted_by,
        type: 'deal_approved',
        title: 'Deal approved',
        body: `Your deal "${submission.name}" in ${submission.city} is now live.`,
        property_id: id,
      }).then(() => {}).catch(() => {});
    }
  };

  const reject = async (id: string) => {
    const submission = submissions.find(s => s.id === id);
    const { error } = await supabase.from('properties').update({ status: 'inactive' }).eq('id', id);
    if (error) { toast.error(`Reject failed: ${error.message}`); console.error('Reject error:', error); return; }
    toast.error('Rejected');
    queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });

    // Audit log (fire-and-forget)
    if (user) logAdminAction(user.id, { action: 'reject_deal', target_table: 'properties', target_id: id, metadata: { city: submission?.city, name: submission?.name } });

    // Email member on rejection (non-blocking)
    if (submission?.contact_email) {
      supabase.functions.invoke('send-email', {
        body: {
          type: 'deal-rejected-member',
          data: { memberEmail: submission.contact_email, name: submission.name, city: submission.city },
        },
      }).catch(() => {});
    }

    // In-app notification for member (non-blocking)
    if (submission?.submitted_by) {
      (supabase.from('notifications') as any).insert({
        user_id: submission.submitted_by,
        type: 'deal_rejected',
        title: 'Deal not approved',
        body: `Your deal "${submission.name}" in ${submission.city} was not approved.`,
        property_id: id,
      }).then(() => {}).catch(() => {});
    }
  };

  const statusLabel = (status: string) => {
    if (status === 'live') return <span className="badge-green">Live</span>;
    if (status === 'pending') return <span className="badge-amber">Pending</span>;
    if (status === 'inactive') return <span className="badge-gray">Inactive</span>;
    if (status === 'on-offer') return <span className="badge-blue">On offer</span>;
    return <span className="badge-gray">{status}</span>;
  };

  const LISTER_LABELS: Record<string, string> = { landlord: 'Landlord', agent: 'Agent', deal_sourcer: 'Deal Sourcer' };
  const SOURCE_LABELS: Record<string, string> = { quick_list: 'Quick List', self_submitted: 'Self-submitted' };

  const sourceTag = (s: Record<string, unknown>) => {
    const src = SOURCE_LABELS[(s.source as string) || 'self_submitted'] || 'Self-submitted';
    const lister = LISTER_LABELS[(s.lister_type as string) || ''] || '';
    const label = lister ? `${src} - ${lister}` : src;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">{label}</span>;
  };

  const saLabel = (sa: string | null) => {
    if (sa === 'yes') return <span className="text-emerald-600 font-medium">Yes</span>;
    if (sa === 'no') return <span className="text-red-500 font-medium">No</span>;
    return <span className="text-amber-500 font-medium">Awaiting</span>;
  };

  return (
    <div data-feature="ADMIN">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Deal Submissions</h1>

      <div data-feature="ADMIN__SUBMISSIONS_FILTER" className="flex gap-2 mb-6">
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

      <div data-feature="ADMIN__SUBMISSIONS_TABLE" className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Row header */}
            <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                  {statusLabel(s.status)}
                  {sourceTag(s as Record<string, unknown>)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.city} · {s.postcode} · £{s.rent_monthly?.toLocaleString()}/mo</p>
              </div>
              <div className="flex items-center gap-2">
                {(s.status === 'pending' || s.status === 'inactive') && (
                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    {/* First Landlord Inquiry toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer" title="Send multi-step WhatsApp on first tenant inquiry">
                      <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">1st Inquiry</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={(s as Record<string, unknown>).first_landlord_inquiry as boolean || false}
                        onClick={async () => {
                          const newVal = !(s as Record<string, unknown>).first_landlord_inquiry;
                          await supabase.from('properties').update({ first_landlord_inquiry: newVal } as any).eq('id', s.id);
                          queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
                          toast.success(newVal ? '1st inquiry flow ON' : '1st inquiry flow OFF');
                          if (user) logAdminAction(user.id, { action: newVal ? 'enable_first_inquiry' : 'disable_first_inquiry', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(s as Record<string, unknown>).first_landlord_inquiry ? 'bg-[#1E9A80]' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(s as Record<string, unknown>).first_landlord_inquiry ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                      </button>
                    </label>
                    {/* NDA Required toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer" title="Require NDA before showing contact details">
                      <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">NDA</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={(s as Record<string, unknown>).nda_required as boolean || false}
                        onClick={async () => {
                          const newVal = !(s as Record<string, unknown>).nda_required;
                          await supabase.from('properties').update({ nda_required: newVal } as any).eq('id', s.id);
                          queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
                          toast.success(newVal ? 'NDA required ON' : 'NDA required OFF');
                          if (user) logAdminAction(user.id, { action: newVal ? 'enable_nda' : 'disable_nda', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(s as Record<string, unknown>).nda_required ? 'bg-[#1E9A80]' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${(s as Record<string, unknown>).nda_required ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                      </button>
                    </label>
                    <button data-feature="ADMIN__SUBMISSIONS_APPROVE" onClick={() => approve(s.id)} className="text-xs bg-nfstay-black text-nfstay-black-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90">Approve</button>
                    <button data-feature="ADMIN__SUBMISSIONS_REJECT" onClick={() => reject(s.id)} className="text-xs text-destructive font-medium px-2">Reject</button>
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

                {/* Labels */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Labels</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newVal = !s.featured;
                        await supabase.from('properties').update({ featured: newVal }).eq('id', s.id);
                        queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
                        toast.success(newVal ? 'Marked as Featured' : 'Removed Featured');
                        if (user) logAdminAction(user.id, { action: newVal ? 'add_featured' : 'remove_featured', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${s.featured ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-secondary text-muted-foreground border border-border hover:border-emerald-300'}`}
                    >
                      {s.featured ? '✓ Featured' : '+ Featured'}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const newVal = !(s as Record<string, unknown>).prime;
                        await supabase.from('properties').update({ prime: newVal } as any).eq('id', s.id);
                        queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
                        toast.success(newVal ? 'Marked as Joint Venture' : 'Removed Joint Venture');
                        if (user) logAdminAction(user.id, { action: newVal ? 'add_prime' : 'remove_prime', target_table: 'properties', target_id: s.id, metadata: { name: s.name } });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${(s as Record<string, unknown>).prime ? 'border border-[#C9A842]' : 'bg-secondary text-muted-foreground border border-border hover:border-[#C9A842]'}`}
                      style={(s as Record<string, unknown>).prime ? { background: 'linear-gradient(135deg, #FDF5D6, #F5E6A3, #E8D478)', color: '#8B6914', borderColor: '#C9A842' } : undefined}
                    >
                      {(s as Record<string, unknown>).prime ? '💎 Joint Venture' : '+ Joint Venture'}
                    </button>
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
