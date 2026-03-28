import { useEffect, useState } from 'react';
import { MessageCircle, Mail, Clock, User, MapPin, Phone, Copy, Check, FileText, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Inquiry {
  id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_id: string | null;
  lister_type: string | null;
  channel: string;
  message: string | null;
  status: string;
  token: string;
  nda_signed: boolean;
  created_at: string;
  property_name?: string;
  property_city?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LeadsTab() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [signingNda, setSigningNda] = useState(false);
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [profileData, setProfileData] = useState<{ whatsapp: string; email: string; name: string; role: string | null } | null>(null);

  // Claim account state
  const isUnclaimed = user?.email?.endsWith('@nfstay.internal') || false;
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Fetch profile
    supabase.from('profiles').select('whatsapp, email, name, role').eq('id', user.id).single().then(({ data }) => {
      if (data) setProfileData(data as any);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !profileData) return;
    async function fetchLeads() {
      try {
        const phone = profileData?.whatsapp || '';
        const email = profileData?.email || user!.email || '';
        const filters: string[] = [];
        if (phone) filters.push(`lister_phone.eq.${phone}`);
        if (email) filters.push(`lister_email.eq.${email}`);
        if (filters.length === 0) { setLeads([]); setLoading(false); return; }

        const { data, error } = await (supabase.from('inquiries') as any)
          .select('*').or(filters.join(',')).order('created_at', { ascending: false });
        if (error) { setLoading(false); return; }

        const propertyIds = [...new Set((data || []).map((d: any) => d.property_id).filter(Boolean))];
        let propertyMap: Record<string, { name: string; city: string }> = {};
        if (propertyIds.length > 0) {
          const { data: props } = await (supabase.from('properties') as any)
            .select('id, name, city').in('id', propertyIds);
          if (props) for (const p of props) propertyMap[p.id] = { name: p.name, city: p.city };
        }

        setLeads((data || []).map((d: any) => ({
          ...d,
          property_name: d.property_id ? propertyMap[d.property_id]?.name : undefined,
          property_city: d.property_id ? propertyMap[d.property_id]?.city : undefined,
        })));
      } catch { /* silent */ } finally { setLoading(false); }
    }
    fetchLeads();
  }, [user, profileData]);

  function copyText(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success('Copied');
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  async function handleExpand(lead: Inquiry) {
    if (expandedId === lead.id) { setExpandedId(null); return; }
    setExpandedId(lead.id);
    setNdaAgreed(false);
    // Mark as viewed
    if (lead.status === 'new') {
      await (supabase.from('inquiries') as any)
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', lead.id);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'viewed' } : l));
    }
  }

  async function handleSignNda(leadId: string) {
    setSigningNda(true);
    const { error } = await (supabase.from('inquiries') as any)
      .update({ nda_signed: true, nda_signed_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) { toast.error('Failed to save agreement'); setSigningNda(false); return; }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, nda_signed: true } : l));
    setSigningNda(false);
    toast.success('Agreement accepted');
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimName.trim() || !claimEmail.trim() || !user) return;
    setClaiming(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-landlord-account`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: claimEmail.trim().toLowerCase(), name: claimName.trim() }),
      });
      if (!res.ok) { toast.error('Failed to claim account'); setClaiming(false); return; }
      toast.success('Account claimed! You can now log in at hub.nfstay.com');
    } catch { toast.error('Something went wrong'); } finally { setClaiming(false); }
  }

  const isDealSourcer = profileData?.role === 'deal_sourcer';

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Claim account card */}
      {isUnclaimed && (
        <div className="mb-4 bg-white rounded-xl border p-4" style={{ borderColor: '#1E9A80', borderWidth: 1.5 }}>
          <h3 className="text-sm font-bold mb-1" style={{ color: '#1A1A1A' }}>Claim your account</h3>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Set your name and email so you can log in anytime at hub.nfstay.com</p>
          <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-2">
            <input value={claimName} onChange={e => setClaimName(e.target.value)} placeholder="Your name"
              className="flex-1 h-9 rounded-lg border px-3 text-sm" style={{ borderColor: '#E5E7EB' }} required />
            <input value={claimEmail} onChange={e => setClaimEmail(e.target.value)} placeholder="Your email" type="email"
              className="flex-1 h-9 rounded-lg border px-3 text-sm" style={{ borderColor: '#E5E7EB' }} required />
            <button type="submit" disabled={claiming}
              className="h-9 px-4 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#1E9A80' }}>
              {claiming ? 'Claiming...' : 'Claim'}
            </button>
          </form>
        </div>
      )}

      {/* Leads count */}
      {leads.length > 0 && (
        <p className="text-sm text-muted-foreground mb-3">
          {leads.length} lead{leads.length !== 1 ? 's' : ''} - {leads.filter(l => l.status === 'new').length} new
        </p>
      )}

      {leads.length === 0 ? (
        <div className="text-center py-16">
          <User className="h-10 w-10 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: '#1A1A1A' }}>No leads yet</h3>
          <p className="text-sm" style={{ color: '#6B7280' }}>Leads will appear here when tenants inquire about your properties.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => {
            const isExpanded = expandedId === lead.id;
            const needsNda = isDealSourcer && !lead.nda_signed;
            const showDetails = !needsNda || lead.nda_signed;

            return (
              <div key={lead.id} className="bg-card border rounded-xl overflow-hidden transition-all"
                style={{ borderColor: lead.status === 'new' ? '#1E9A80' : '#E5E7EB' }}>
                {/* Lead header - always visible */}
                <button onClick={() => handleExpand(lead)} className="w-full p-4 text-left flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                        {lead.tenant_name || 'New inquiry'}
                      </span>
                      {lead.status === 'new' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#1E9A80' }}>
                          New Lead
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                        style={{ backgroundColor: lead.channel === 'whatsapp' ? '#E7F5EE' : '#E8F0EF', color: lead.channel === 'whatsapp' ? '#25D366' : '#2D6A5F' }}>
                        {lead.channel === 'whatsapp' ? 'WA' : 'Email'}
                      </span>
                    </div>
                    {lead.property_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.property_name}{lead.property_city ? ` - ${lead.property_city}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: '#F3F4F6' }}>
                    {/* NDA gate for deal sourcers */}
                    {needsNda && !lead.nda_signed ? (
                      <div className="pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4" style={{ color: '#1E9A80' }} />
                          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Quick Partnership Agreement</span>
                        </div>
                        <div className="rounded-lg p-3 mb-3 text-xs leading-relaxed" style={{ backgroundColor: '#F9FAFB', color: '#374151' }}>
                          As part of our deal sourcer programme, if you successfully close a deal with this tenant, a <strong>£250 introduction fee</strong> applies.
                          In return, we commit to consistently sending you quality leads. Non-payment results in removal from the platform.
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer mb-3">
                          <input type="checkbox" checked={ndaAgreed} onChange={e => setNdaAgreed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded" style={{ accentColor: '#1E9A80' }} />
                          <span className="text-xs" style={{ color: '#374151' }}>I agree to the above terms</span>
                        </label>
                        <button onClick={() => handleSignNda(lead.id)} disabled={!ndaAgreed || signingNda}
                          className="w-full h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: '#1E9A80' }}>
                          {signingNda ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'I Agree - Show Me The Lead'}
                        </button>
                      </div>
                    ) : (
                      /* Tenant details */
                      <div className="pt-4 space-y-3">
                        {/* Name */}
                        {lead.tenant_name && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                              <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>{lead.tenant_name}</span>
                            </div>
                          </div>
                        )}

                        {/* Phone + WhatsApp button */}
                        {lead.tenant_phone && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#1A1A1A' }}>{lead.tenant_phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => copyText(lead.tenant_phone!, `phone-${lead.id}`)}
                                className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                {copiedField === `phone-${lead.id}` ? <Check className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />}
                              </button>
                              <a href={`https://wa.me/${lead.tenant_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.tenant_name || ''}, I saw your inquiry about ${lead.property_name || 'our property'} on nfstay. How can I help?`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:brightness-[0.96]"
                                style={{ backgroundColor: '#E7F5EE', color: '#25D366' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Email */}
                        {lead.tenant_email && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#1A1A1A' }}>{lead.tenant_email}</span>
                            </div>
                            <button onClick={() => copyText(lead.tenant_email!, `email-${lead.id}`)}
                              className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                              {copiedField === `email-${lead.id}` ? <Check className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />}
                            </button>
                          </div>
                        )}

                        {/* Property */}
                        {lead.property_name && (
                          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: '#F3F4F6' }}>
                            <MapPin className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
                            <span className="text-xs font-medium" style={{ color: '#1A1A1A' }}>{lead.property_name}</span>
                            {lead.property_city && <span className="text-xs text-muted-foreground">- {lead.property_city}</span>}
                          </div>
                        )}

                        {/* Message */}
                        {lead.message && (
                          <div className="pt-2 border-t" style={{ borderColor: '#F3F4F6' }}>
                            <p className="text-xs rounded-lg p-2.5" style={{ color: '#374151', backgroundColor: '#F9FAFB' }}>{lead.message}</p>
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Clock className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                            Received {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
