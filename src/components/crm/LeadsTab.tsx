import { useEffect, useState, useCallback } from 'react';
import { GripVertical, ChevronDown, Mail, Phone, Copy, Check, Clock, User, MapPin, FileText, Loader2, Pencil, X, Lock } from 'lucide-react';
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
  stage: string;
  token: string;
  nda_signed: boolean;
  created_at: string;
  property_name?: string;
  property_city?: string;
}

const DEFAULT_STAGES = ['New Leads', 'Contacted', 'Viewing Booked', 'Negotiating', 'Closed'];

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
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [signingNda, setSigningNda] = useState(false);
  const [ndaAgreed, setNdaAgreed] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [profileData, setProfileData] = useState<{ whatsapp: string; email: string; role: string | null } | null>(null);

  // Claim account
  const isUnclaimed = user?.email?.endsWith('@nfstay.internal') || false;
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimExpanded, setClaimExpanded] = useState(true);

  // Load profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('whatsapp, email, role').eq('id', user.id).single().then(({ data }) => {
      if (data) setProfileData(data as any);
    });
  }, [user]);

  // Load custom stages
  useEffect(() => {
    if (!user) return;
    (supabase.from('pipeline_stages') as any).select('stages').eq('user_id', user.id).eq('pipeline_type', 'leads').maybeSingle().then(({ data }: any) => {
      if (data?.stages && Array.isArray(data.stages) && data.stages.length > 0) setStages(data.stages);
    });
  }, [user]);

  // Load leads
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
          stage: d.stage || 'New Leads',
          property_name: d.property_id ? propertyMap[d.property_id]?.name : undefined,
          property_city: d.property_id ? propertyMap[d.property_id]?.city : undefined,
        })));
      } catch { /* silent */ } finally { setLoading(false); }
    }
    fetchLeads();
  }, [user, profileData]);

  const stageLeads = (stage: string) => leads.filter(l => l.stage === stage);

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = async (toStage: string) => {
    if (!dragId) return;
    setLeads(prev => prev.map(l => l.id === dragId ? { ...l, stage: toStage } : l));
    await (supabase.from('inquiries') as any).update({ stage: toStage }).eq('id', dragId);
    setDragId(null);
    toast.success('Lead moved');
  };

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
    setClaimExpanded(false);
    setNdaAgreed(false);
    if (lead.status === 'new') {
      await (supabase.from('inquiries') as any).update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', lead.id);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'viewed' } : l));
    }
  }

  async function handleSignNda(leadId: string) {
    setSigningNda(true);
    await (supabase.from('inquiries') as any).update({ nda_signed: true, nda_signed_at: new Date().toISOString() }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, nda_signed: true } : l));
    setSigningNda(false);
    toast.success('Agreement accepted');
  }

  async function handleRenameStage(oldName: string) {
    if (!editValue.trim() || editValue.trim() === oldName) { setEditingStage(null); return; }
    const newStages = stages.map(s => s === oldName ? editValue.trim() : s);
    setStages(newStages);
    // Update leads with old stage name to new name
    setLeads(prev => prev.map(l => l.stage === oldName ? { ...l, stage: editValue.trim() } : l));
    // Persist stages
    if (user) {
      await (supabase.from('pipeline_stages') as any).upsert({
        user_id: user.id, pipeline_type: 'leads', stages: newStages, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,pipeline_type' });
      // Update inquiries in DB
      await (supabase.from('inquiries') as any).update({ stage: editValue.trim() }).eq('stage', oldName);
    }
    setEditingStage(null);
    toast.success('Stage renamed');
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
      <div className="flex gap-4 overflow-x-auto pb-4 mt-4" style={{ scrollbarWidth: 'none' }}>
        {DEFAULT_STAGES.map(s => (
          <div key={s} className="min-w-[280px] bg-secondary rounded-[14px] p-3.5 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-3" />
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded-lg" />
              <div className="h-16 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Claim account */}
      {/* Claim banner handled by DashboardLayout - no duplicate here */}

      {/* Stats */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <span className="badge-gray text-[11px]">{leads.length} leads</span>
        <span className="badge-gray text-[11px]">{leads.filter(l => l.status === 'new').length} new</span>
        <p className="text-[10px] text-muted-foreground italic">Double-click a column name to rename it</p>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
        {stages.map(stage => (
          <div
            key={stage}
            className="min-w-[280px] bg-secondary rounded-[14px] p-3.5 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(stage)}
          >
            {/* Column header - editable */}
            <div className="flex items-center justify-between mb-3">
              {editingStage === stage ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameStage(stage); if (e.key === 'Escape') setEditingStage(null); }}
                    autoFocus
                    className="flex-1 h-7 rounded border border-primary px-2 text-sm font-bold bg-white"
                  />
                  <button onClick={() => handleRenameStage(stage)} className="p-1 rounded hover:bg-white/50">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button onClick={() => setEditingStage(null)} className="p-1 rounded hover:bg-white/50">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onDoubleClick={() => { setEditingStage(stage); setEditValue(stage); }}
                    title="Double-click to rename"
                  >
                    {stage}
                  </span>
                  <span className="badge-gray text-[11px]">{stageLeads(stage).length}</span>
                </div>
              )}
            </div>

            {/* Lead cards */}
            <div className="space-y-2 flex-1">
              {stageLeads(stage).map(lead => {
                const isExpanded = expandedId === lead.id;
                const needsNda = isDealSourcer && !lead.nda_signed;

                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => onDragStart(lead.id)}
                    className={`bg-card border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-shadow ${dragId === lead.id ? 'shadow-lg opacity-75' : 'shadow-sm'}`}
                    style={{ borderColor: lead.status === 'new' ? '#1E9A80' : '#E5E7EB' }}
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-2 p-3 cursor-pointer select-none hover:bg-secondary/50 transition-colors" onClick={() => handleExpand(lead)}>
                      <GripVertical className="w-3.5 h-3.5 text-border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground truncate">{lead.tenant_name || 'New inquiry'}</span>
                          {lead.status === 'new' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1E9A80' }}>NEW</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {lead.property_name || 'Property inquiry'}{lead.property_city ? ` - ${lead.property_city}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(lead.created_at)}</span>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded" style={{ backgroundColor: lead.channel === 'whatsapp' ? '#E7F5EE' : '#E8F0EF' }}>
                          {lead.channel === 'whatsapp'
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            : <Mail className="w-2.5 h-2.5" style={{ color: '#2D6A5F' }} />
                          }
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded details */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-3 pb-3 border-t" style={{ borderColor: '#F3F4F6' }}>
                        {/* NDA gate */}
                        {(() => {
                          // NDA modal state for this lead
                          const showNdaModal = needsNda && expandedId === lead.id;
                          return (
                          <div className="pt-3 space-y-2.5">
                            {/* NDA overlay modal */}
                            {showNdaModal && ndaAgreed === false && (
                              <div className="rounded-lg border p-3 mb-2" style={{ borderColor: '#1E9A80', backgroundColor: '#FAFFFE' }}>
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="w-3.5 h-3.5" style={{ color: '#1E9A80' }} />
                                  <span className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>Quick Partnership Agreement</span>
                                </div>
                                <div className="rounded-lg p-2.5 mb-2 text-[11px] leading-relaxed" style={{ backgroundColor: '#F9FAFB', color: '#374151' }}>
                                  If you close a deal with this tenant, a <strong>£250 introduction fee</strong> applies. Non-payment results in removal from the platform.
                                </div>
                                <label className="flex items-start gap-2 cursor-pointer mb-2">
                                  <input type="checkbox" checked={ndaAgreed} onChange={e => setNdaAgreed(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded" style={{ accentColor: '#1E9A80' }} />
                                  <span className="text-[11px]" style={{ color: '#374151' }}>I agree to the above terms</span>
                                </label>
                                <button onClick={() => handleSignNda(lead.id)} disabled={!ndaAgreed || signingNda}
                                  className="w-full h-8 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#1E9A80' }}>
                                  {signingNda ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Agree & View Lead'}
                                </button>
                              </div>
                            )}
                            {/* Tenant name - always visible */}
                            {lead.tenant_name && (
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                                <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{lead.tenant_name}</span>
                              </div>
                            )}
                            {/* Phone + WhatsApp */}
                            {lead.tenant_phone && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                                  <span className={`text-xs ${needsNda ? 'select-none' : ''}`} style={{ color: '#1A1A1A', filter: needsNda ? 'blur(5px)' : 'none' }}>{lead.tenant_phone}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => needsNda ? setNdaAgreed(false) : copyText(lead.tenant_phone!, `ph-${lead.id}`)} className="p-1 rounded hover:bg-gray-50">
                                    {needsNda ? <Lock className="w-3 h-3" style={{ color: '#9CA3AF' }} /> : copiedField === `ph-${lead.id}` ? <Check className="w-3 h-3" style={{ color: '#1E9A80' }} /> : <Copy className="w-3 h-3" style={{ color: '#9CA3AF' }} />}
                                  </button>
                                  <a href={needsNda ? '#' : `https://wa.me/${lead.tenant_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.tenant_name || ''}, I saw your inquiry about ${lead.property_name || 'our property'} on nfstay. How can I help?`)}`}
                                    onClick={e => { if (needsNda) { e.preventDefault(); setNdaAgreed(false); } }}
                                    target={needsNda ? undefined : '_blank'} rel="noopener noreferrer"
                                    className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[10px] font-semibold hover:brightness-[0.96]"
                                    style={{ backgroundColor: '#E7F5EE', color: '#25D366' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    WhatsApp
                                  </a>
                                </div>
                              </div>
                            )}
                            {/* Email */}
                            {lead.tenant_email && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                                  <span className={`text-xs ${needsNda ? 'select-none' : ''}`} style={{ color: '#1A1A1A', filter: needsNda ? 'blur(5px)' : 'none' }}>{lead.tenant_email}</span>
                                </div>
                                <button onClick={() => needsNda ? setNdaAgreed(false) : copyText(lead.tenant_email!, `em-${lead.id}`)} className="p-1 rounded hover:bg-gray-50">
                                  {needsNda ? <Lock className="w-3 h-3" style={{ color: '#9CA3AF' }} /> : copiedField === `em-${lead.id}` ? <Check className="w-3 h-3" style={{ color: '#1E9A80' }} /> : <Copy className="w-3 h-3" style={{ color: '#9CA3AF' }} />}
                                </button>
                              </div>
                            )}
                            {/* Property */}
                            {lead.property_name && (
                              <div className="flex items-center gap-2 pt-1.5 border-t" style={{ borderColor: '#F3F4F6' }}>
                                <MapPin className="w-3 h-3" style={{ color: '#1E9A80' }} />
                                <span className="text-[11px] font-medium" style={{ color: '#1A1A1A' }}>{lead.property_name}</span>
                              </div>
                            )}
                            {/* Message */}
                            {lead.message && (
                              <p className="text-[11px] rounded-lg p-2" style={{ color: '#374151', backgroundColor: '#F9FAFB' }}>{lead.message}</p>
                            )}
                            {/* Time */}
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" style={{ color: '#9CA3AF' }} />
                              <span className="text-[9px]" style={{ color: '#9CA3AF' }}>
                                {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}

              {stageLeads(stage).length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-[11px] text-muted-foreground">Drag leads here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
