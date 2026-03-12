import { useState } from 'react';
import { GripVertical, Plus, Phone, Mail } from 'lucide-react';
import { crmDeals, CRM_STAGES, type CRMDeal } from '@/data/mockData';
import { toast } from 'sonner';

export default function CRMPage() {
  const [deals, setDeals] = useState<CRMDeal[]>(crmDeals);
  const [dragId, setDragId] = useState<string | null>(null);

  const stageDeals = (stage: string) => deals.filter(d => d.stage === stage);
  const stagePotProfit = (stage: string) => stageDeals(stage).reduce((s, d) => s + d.profit, 0);

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = (stage: string) => {
    if (!dragId) return;
    setDeals(prev => prev.map(d => d.id === dragId ? { ...d, stage } : d));
    setDragId(null);
    toast.success('Deal moved');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">CRM Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your rent-to-rent acquisition pipeline.</p>
        </div>
        <button className="h-11 px-5 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <span className="badge-gray">{deals.length} deals tracked</span>
        <span className="badge-gray">£{deals.reduce((s, d) => s + d.profit, 0).toLocaleString()} potential monthly profit</span>
        <span className="badge-gray">{stageDeals('Closed').length} deals closing this month</span>
      </div>

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
                  className={`bg-card border border-border rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-shadow ${dragId === deal.id ? 'shadow-lg opacity-75' : 'shadow-sm'}`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-border mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground">{deal.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{deal.city} · {deal.postcode}</div>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-muted-foreground">Rent: £{deal.rent.toLocaleString()}</span>
                        <span className="text-accent-foreground font-medium">Profit: £{deal.profit}</span>
                      </div>
                      {(deal.phone || deal.email) && (
                        <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                          {deal.phone && <a href={`tel:${deal.phone}`} className="text-xs text-primary flex items-center gap-1"><Phone className="w-3 h-3" />{deal.phone}</a>}
                          {deal.email && <a href={`mailto:${deal.email}`} className="text-xs text-primary flex items-center gap-1"><Mail className="w-3 h-3" />Email</a>}
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-2 italic truncate">{deal.notes}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{deal.lastContact}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
