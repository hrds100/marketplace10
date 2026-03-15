import { useState, useEffect } from 'react';
import { GripVertical, Plus, MessageCircle, X, Archive, ArchiveRestore, Tag, ImagePlus } from 'lucide-react';
import { crmDeals as mockDeals, CRM_STAGES, type CRMDeal, listings } from '@/data/mockData';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notifyCrmStageMove } from '@/lib/n8n';

export default function CRMPage() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<CRMDeal[]>(mockDeals);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isOutsiderLead, setIsOutsiderLead] = useState(false);
  const [newDeal, setNewDeal] = useState({ name: '', city: '', postcode: '', rent: '', profit: '', type: '2-bed flat', stage: 'New Lead', notes: '', whatsapp: '', email: '', photoUrl: '' });

  // Load CRM deals from Supabase if user is logged in
  useEffect(() => {
    if (!user) return;
    const loadDeals = async () => {
      const { data } = await supabase.from('crm_deals').select('*').eq('user_id', user.id);
      if (data && data.length > 0) {
        const mapped: CRMDeal[] = data.map(d => ({
          id: d.id,
          name: d.name,
          city: d.city,
          postcode: d.postcode,
          rent: d.rent,
          profit: d.profit,
          type: d.type,
          stage: d.stage,
          lastContact: d.last_contact || 'Today',
          ownerInitials: 'ME',
          notes: d.notes || '',
          whatsapp: d.whatsapp || undefined,
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
    if (user) await supabase.from('crm_deals').update({ archived: false, stage: 'New Lead' as any }).eq('id', dealId);
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
      await supabase.from('crm_deals').update({ stage: toStage as any }).eq('id', dragId);
      notifyCrmStageMove({ dealId: dragId, fromStage, toStage, userId: user.id });
    }
    setDragId(null);
    toast.success('Deal moved');
  };

  const getDealImage = (deal: CRMDeal) => {
    const match = listings.find(l => l.name === deal.name && l.city === deal.city);
    if (match) return match.image;
    return `https://picsum.photos/seed/${deal.id}/400/300`;
  };

  const handleAddDeal = async () => {
    if (!newDeal.name || !newDeal.city) {
      toast.error('Please fill in at least name and city');
      return;
    }
    const deal: CRMDeal = {
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
    };

    // Save to Supabase if logged in
    if (user) {
      const { data, error } = await supabase.from('crm_deals').insert({
        user_id: user.id,
        name: newDeal.name,
        city: newDeal.city,
        postcode: newDeal.postcode,
        rent: Number(newDeal.rent) || 0,
        profit: Number(newDeal.profit) || 0,
        type: newDeal.type,
        stage: newDeal.stage as any,
        outsider_lead: isOutsiderLead,
        whatsapp: newDeal.whatsapp || null,
        email: newDeal.email || null,
        notes: newDeal.notes || null,
        photo_url: newDeal.photoUrl || null,
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
          onClick={() => {
            const el = document.getElementById('archived-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="badge-gray flex items-center gap-1 hover:bg-secondary px-2 py-1 text-xs cursor-pointer transition-colors"
        >
          <Archive className="w-3 h-3" />
          Archived ({archivedDeals.length})
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

            {/* Outsider Lead Toggle */}
            <button
              type="button"
              onClick={() => setIsOutsiderLead(!isOutsiderLead)}
              className={`mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isOutsiderLead ? 'bg-amber-100 text-amber-800' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              <Tag className="w-3 h-3" />
              🔖 Outsider Lead
            </button>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Property Name *</label>
                <input value={newDeal.name} onChange={e => setNewDeal(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Maple House" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">City *</label>
                  <input value={newDeal.city} onChange={e => setNewDeal(p => ({ ...p, city: e.target.value }))} placeholder="Manchester" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Postcode</label>
                  <input value={newDeal.postcode} onChange={e => setNewDeal(p => ({ ...p, postcode: e.target.value }))} placeholder="M14" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Monthly Rent (£)</label>
                  <input type="number" value={newDeal.rent} onChange={e => setNewDeal(p => ({ ...p, rent: e.target.value }))} placeholder="1200" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Est. Profit (£)</label>
                  <input type="number" value={newDeal.profit} onChange={e => setNewDeal(p => ({ ...p, profit: e.target.value }))} placeholder="680" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Property Type</label>
                  <select value={newDeal.type} onChange={e => setNewDeal(p => ({ ...p, type: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {['1-bed flat', '2-bed flat', '3-bed flat', '2-bed house', '3-bed house', '4-bed house'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Pipeline Stage</label>
                  <select value={newDeal.stage} onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {CRM_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">WhatsApp Number</label>
                <input value={newDeal.whatsapp} onChange={e => setNewDeal(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+447911123456" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
                <input type="email" value={newDeal.email} onChange={e => setNewDeal(p => ({ ...p, email: e.target.value }))} placeholder="landlord@example.com" className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {isOutsiderLead && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Photo URL</label>
                  <div className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    <input value={newDeal.photoUrl} onChange={e => setNewDeal(p => ({ ...p, photoUrl: e.target.value }))} placeholder="https://..." className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Notes</label>
                <textarea value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this deal..." rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <button onClick={handleAddDeal} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                Add to Pipeline
              </button>
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
                  <img src={getDealImage(deal)} alt="" className="w-full h-[100px] object-cover" loading="lazy" />
                  <div className="p-3.5">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-border mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground">{deal.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{deal.city} · {deal.postcode}</div>
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="text-muted-foreground">Rent: £{deal.rent.toLocaleString()}</span>
                          <span className="text-accent-foreground font-medium">Profit: £{deal.profit}</span>
                        </div>
                        {deal.whatsapp && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <a href={`https://wa.me/${deal.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:opacity-75 transition-opacity">
                              <MessageCircle className="w-3 h-3" /> Contact via WhatsApp
                            </a>
                          </div>
                        )}
                        <div className="text-[11px] text-muted-foreground mt-2 italic truncate">{deal.notes}</div>
                        <div className="text-[11px] text-muted-foreground mt-1">{deal.lastContact}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleArchive(deal.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors flex-shrink-0"
                        title="Archive deal"
                      >
                        <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
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
            <Archive className="w-5 h-5 text-muted-foreground" />
            Archived Deals ({archivedDeals.length})
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
                  <button
                    type="button"
                    onClick={() => handleUnarchive(deal.id)}
                    className="mt-3 w-full h-9 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
