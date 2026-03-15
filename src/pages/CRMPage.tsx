import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GripVertical, Plus, MessageCircle, X, Archive, ArchiveRestore, Tag, ImagePlus, ChevronDown, ExternalLink } from 'lucide-react';
import { CRM_STAGES, type CRMDeal } from '@/data/mockData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notifyCrmStageMove } from '@/lib/n8n';
import InquiryPanel from '@/components/InquiryPanel';
import type { ListingShape } from '@/components/InquiryPanel';

type ExtendedDeal = CRMDeal & { photo_url?: string | null; property_id?: string | null };

export default function CRMPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<ExtendedDeal[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isOutsiderLead, setIsOutsiderLead] = useState(false);
  const [newDeal, setNewDeal] = useState({ name: '', city: '', postcode: '', rent: '', profit: '', type: '2-bed flat', stage: 'New Lead', notes: '', whatsapp: '', email: '', photoUrl: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inquiryListing, setInquiryListing] = useState<ListingShape | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  // Load CRM deals from Supabase
  useEffect(() => {
    if (!user) return;
    const loadDeals = async () => {
      const { data } = await supabase.from('crm_deals').select('*').eq('user_id', user.id);
      if (data && data.length > 0) {
        const mapped: ExtendedDeal[] = data.map(d => ({
          id: d.id,
          name: d.name,
          city: d.city,
          postcode: d.postcode || '',
          rent: d.rent || 0,
          profit: d.profit || 0,
          type: d.type || '',
          stage: d.stage || 'New Lead',
          lastContact: d.last_contact || 'Today',
          ownerInitials: 'ME',
          notes: d.notes || '',
          whatsapp: d.whatsapp || undefined,
          photo_url: d.photo_url || null,
          property_id: d.property_id || null,
        }));
        setDeals(mapped);
        setArchivedIds(data.filter(d => d.archived).map(d => d.id));
      }
    };
    loadDeals();
  }, [user]);

  const stageDeals = (stage: string) => deals.filter(d => d.stage === stage && !archivedIds.includes(d.id));
  const archivedDeals = deals.filter(d => archivedIds.includes(d.id));

  const handleArchive = async (dealId: string) => {
    setArchivedIds(prev => [...prev, dealId]);
    if (user) await supabase.from('crm_deals').update({ archived: true }).eq('id', dealId);
    toast.success('Deal archived');
  };

  const handleUnarchive = async (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: 'New Lead' } : d));
    setArchivedIds(prev => prev.filter(id => id !== dealId));
    if (user) await supabase.from('crm_deals').update({ archived: false, stage: 'New Lead' }).eq('id', dealId);
    toast.success('Deal restored to pipeline');
  };

  const stagePotProfit = (stage: string) => stageDeals(stage).reduce((s, d) => s + d.profit, 0);

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = async (toStage: string) => {
    if (!dragId) return;
    const deal = deals.find(d => d.id === dragId);
    const fromStage = deal?.stage || '';
    setDeals(prev => prev.map(d => d.id === dragId ? { ...d, stage: toStage } : d));
    if (user) {
      await supabase.from('crm_deals').update({ stage: toStage }).eq('id', dragId);
      notifyCrmStageMove({ dealId: dragId, fromStage, toStage, userId: user.id });
    }
    setDragId(null);
    toast.success('Deal moved');
  };

  const getDealImage = (deal: ExtendedDeal) => {
    if (deal.photo_url) return deal.photo_url;
    const citySlug = encodeURIComponent((deal.city || 'london').toLowerCase());
    return `https://source.unsplash.com/featured/400x300/?${citySlug},property&sig=${deal.id.slice(0, 6)}`;
  };

  const dealToListingShape = (deal: ExtendedDeal): ListingShape => ({
    id: deal.property_id || deal.id,
    name: deal.name,
    city: deal.city,
    postcode: deal.postcode,
    rent: deal.rent,
    profit: deal.profit,
    type: deal.type,
    status: 'live',
    featured: false,
    daysAgo: 0,
    image: getDealImage(deal),
    landlordApproved: false,
    landlordWhatsapp: deal.whatsapp || null,
  });

  const handleAddDeal = async () => {
    if (!newDeal.name || !newDeal.city) {
      toast.error('Please fill in at least name and city');
      return;
    }
    const deal: ExtendedDeal = {
      id: `crm-${Date.now()}`,
      name: newDeal.name,
      city: newDeal.city,
      postcode: newDeal.postcode,
      rent: Number(newDeal.rent) || 0,
      profit: Number(newDeal.profit) || 0,
      type: newDeal.type,
      stage: newDeal.stage,
      lastContact: 'Today',
      ownerInitials: 'ME',
      notes: newDeal.notes,
      whatsapp: newDeal.whatsapp || undefined,
      photo_url: newDeal.photoUrl || null,
      property_id: null,
    };

    if (user) {
      const { data, error } = await supabase.from('crm_deals').insert({
        user_id: user.id,
        name: newDeal.name, city: newDeal.city, postcode: newDeal.postcode,
        rent: Number(newDeal.rent) || 0, profit: Number(newDeal.profit) || 0,
        type: newDeal.type, stage: newDeal.stage,
        outsider_lead: isOutsiderLead,
        whatsapp: newDeal.whatsapp || null, email: newDeal.email || null,
        notes: newDeal.notes || null, photo_url: newDeal.photoUrl || null,
      }).select().single();
      if (data) deal.id = data.id;
      if (error) toast.error(error.message);
    }

    setDeals(prev => [...prev, deal]);
    setShowAddForm(false);
    setIsOutsiderLead(false);
    setNewDeal({ name: '', city: '', postcode: '', rent: '', profit: '', type: '2-bed flat', stage: 'New Lead', notes: '', whatsapp: '', email: '', photoUrl: '' });
    toast.success('Deal added to ' + deal.stage);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">CRM Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your rent-to-rent acquisition pipeline.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Your Own Deal
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-2">Add your own deal to the CRM and keep track of all your prospects.</p>

      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <span className="badge-gray">{deals.length - archivedDeals.length} deals tracked</span>
        <span className="badge-gray">£{deals.filter(d => !archivedIds.includes(d.id)).reduce((s, d) => s + d.profit, 0).toLocaleString()} potential monthly profit</span>
        <span className="badge-gray">{stageDeals('Closed').length} deals closing this month</span>
        <button
          type="button"
          onClick={() => { const el = document.getElementById('archived-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          className="badge-gray flex items-center gap-1 hover:bg-secondary px-2 py-1 text-xs cursor-pointer transition-colors"
        >
          <Archive className="w-3 h-3" /> Archived ({archivedDeals.length})
        </button>
      </div>

      {/* Add Deal Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Add Deal to Pipeline</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <button type="button" onClick={() => setIsOutsiderLead(!isOutsiderLead)}
              className={`mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isOutsiderLead ? 'bg-amber-100 text-amber-800' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              <Tag className="w-3 h-3" /> Outsider Lead
            </button>
            <div className="space-y-4">
              <div><label className="text-xs font-semibold text-foreground block mb-1.5">Property Name *</label><input value={newDeal.name} onChange={e => setNewDeal(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Maple House" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">City *</label><input value={newDeal.city} onChange={e => setNewDeal(p => ({ ...p, city: e.target.value }))} placeholder="Manchester" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Postcode</label><input value={newDeal.postcode} onChange={e => setNewDeal(p => ({ ...p, postcode: e.target.value }))} placeholder="M14" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Monthly Rent (£)</label><input type="number" value={newDeal.rent} onChange={e => setNewDeal(p => ({ ...p, rent: e.target.value }))} placeholder="1200" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Est. Profit (£)</label><input type="number" value={newDeal.profit} onChange={e => setNewDeal(p => ({ ...p, profit: e.target.value }))} placeholder="680" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Property Type</label><select value={newDeal.type} onChange={e => setNewDeal(p => ({ ...p, type: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">{['1-bed flat', '2-bed flat', '3-bed flat', '2-bed house', '3-bed house', '4-bed house'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Pipeline Stage</label><select value={newDeal.stage} onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">{CRM_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="text-xs font-semibold text-foreground block mb-1.5">WhatsApp Number</label><input value={newDeal.whatsapp} onChange={e => setNewDeal(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+447911123456" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>
              <div><label className="text-xs font-semibold text-foreground block mb-1.5">Email</label><input type="email" value={newDeal.email} onChange={e => setNewDeal(p => ({ ...p, email: e.target.value }))} placeholder="landlord@example.com" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div>
              {isOutsiderLead && (
                <div><label className="text-xs font-semibold text-foreground block mb-1.5">Photo URL</label><div className="flex items-center gap-2"><ImagePlus className="w-4 h-4 text-muted-foreground" /><input value={newDeal.photoUrl} onChange={e => setNewDeal(p => ({ ...p, photoUrl: e.target.value }))} placeholder="https://..." className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm" /></div></div>
              )}
              <div><label className="text-xs font-semibold text-foreground block mb-1.5">Notes</label><textarea value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this deal..." rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" /></div>
              <button onClick={handleAddDeal} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">Add to Pipeline</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
        {CRM_STAGES.map(stage => (
          <div
            key={stage}
            className="min-w-[280px] bg-secondary rounded-[14px] p-3.5 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(stage)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">{stage}</span>
                <span className="badge-gray text-[11px]">{stageDeals(stage).length}</span>
              </div>
              {stagePotProfit(stage) > 0 && (
                <span className="badge-green text-[11px]">£{stagePotProfit(stage).toLocaleString()} pot.</span>
              )}
            </div>

            <div className="space-y-2 flex-1">
              {stageDeals(stage).map(deal => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={() => onDragStart(deal.id)}
                  className={`bg-card border border-border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-shadow ${dragId === deal.id ? 'shadow-lg opacity-75' : 'shadow-sm'}`}
                >
                  {/* Clickable header — always visible */}
                  <div
                    className="flex items-center gap-2 p-3 cursor-pointer select-none hover:bg-secondary/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === deal.id ? null : deal.id)}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-border flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{deal.name}</div>
                      <div className="text-xs text-muted-foreground">{deal.city} · {deal.postcode}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-accent-foreground">£{deal.profit.toLocaleString()}/mo</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedId === deal.id ? 'rotate-180' : ''}`} />
                      <button type="button" onClick={e => { e.stopPropagation(); handleArchive(deal.id); }} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Archive deal">
                        <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedId === deal.id ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <img src={getDealImage(deal)} alt="" className="w-full h-[140px] object-cover" loading="lazy" />
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-secondary rounded-lg p-2.5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly Rent</div>
                          <div className="text-sm font-bold text-foreground mt-0.5">£{deal.rent.toLocaleString()}</div>
                        </div>
                        <div className="bg-secondary rounded-lg p-2.5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Est. Profit</div>
                          <div className="text-sm font-bold text-accent-foreground mt-0.5">£{deal.profit.toLocaleString()}</div>
                        </div>
                        <div className="bg-secondary rounded-lg p-2.5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Property Type</div>
                          <div className="text-sm font-bold text-foreground mt-0.5 truncate">{deal.type}</div>
                        </div>
                        <div className="bg-secondary rounded-lg p-2.5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</div>
                          <div className="text-sm font-bold text-foreground mt-0.5 truncate">{deal.city}</div>
                        </div>
                      </div>
                      {deal.notes && <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{deal.notes}</p>}
                      {deal.whatsapp && (
                        <a href={`https://wa.me/${deal.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-75 transition-opacity">
                          <MessageCircle className="w-3.5 h-3.5" /> Contact via WhatsApp
                        </a>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => { setInquiryListing(dealToListingShape(deal)); setInquiryOpen(true); }}
                          className="flex-1 h-9 rounded-lg bg-nfstay-black text-nfstay-black-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                          Inquire Now
                        </button>
                        {deal.property_id && (
                          <Link to={`/deals/${deal.property_id}`}
                            className="h-9 px-3 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-3.5 h-3.5" /> View Deal
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {archivedDeals.length > 0 && (
        <div id="archived-section" className="mt-8 p-6 bg-secondary/50 rounded-2xl">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5 text-muted-foreground" /> Archived Deals ({archivedDeals.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedDeals.map(deal => (
              <div key={deal.id} className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <img src={getDealImage(deal)} alt="" className="w-full h-[80px] object-cover" loading="lazy" />
                <div className="p-4">
                  <div className="text-sm font-bold text-foreground">{deal.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{deal.city} · {deal.postcode}</div>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-muted-foreground">Rent: £{deal.rent.toLocaleString()}</span>
                    <span className="text-accent-foreground font-medium">Profit: £{deal.profit}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{deal.type}</div>
                  {deal.notes && <div className="text-[11px] text-muted-foreground mt-1 italic truncate">{deal.notes}</div>}
                  <button type="button" onClick={() => handleUnarchive(deal.id)}
                    className="mt-3 w-full h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-1.5 transition-colors">
                    <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InquiryPanel open={inquiryOpen} listing={inquiryListing} onClose={() => setInquiryOpen(false)} />
    </div>
  );
}
