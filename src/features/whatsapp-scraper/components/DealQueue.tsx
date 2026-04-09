import { useState, useMemo } from 'react';
import { Inbox } from 'lucide-react';
import DealCard from './DealCard';
import type { ScraperDeal, DealStatus } from '../types';

interface DealQueueProps {
  deals: ScraperDeal[];
  loading: boolean;
  error: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSubmit: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
}

const tabs: { label: string; value: DealStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Submitted', value: 'submitted' },
];

export default function DealQueue({
  deals,
  loading,
  error,
  onApprove,
  onReject,
  onSubmit,
  onBulkApprove,
  onBulkReject,
}: DealQueueProps) {
  const [activeTab, setActiveTab] = useState<DealStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (activeTab === 'all') return deals;
    return deals.filter(d => d.status === activeTab);
  }, [deals, activeTab]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-[#6B7280]">Loading deals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-[#F3F3EE] rounded-lg p-1 w-fit" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            aria-label={tab.label}
            onClick={() => { setActiveTab(tab.value); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-[#1E9A80] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1A1A1A]'
            }`}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className="ml-1 text-[11px] text-[#9CA3AF]">
                ({deals.filter(d => d.status === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[rgba(30,154,128,0.08)] rounded-lg">
          <input
            type="checkbox"
            checked={selectedIds.size === filtered.length}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-[#E5E7EB] text-[#1E9A80]"
          />
          <span className="text-[13px] text-[#1A1A1A] font-medium">{selectedIds.size} selected</span>
          <button
            onClick={() => { onBulkApprove(Array.from(selectedIds)); setSelectedIds(new Set()); }}
            className="h-7 px-3 rounded-lg bg-[#1E9A80] text-white text-[12px] font-medium hover:bg-[#178a72] transition-colors"
          >
            Approve Selected
          </button>
          <button
            onClick={() => { onBulkReject(Array.from(selectedIds)); setSelectedIds(new Set()); }}
            className="h-7 px-3 rounded-lg bg-red-50 text-red-600 text-[12px] font-medium hover:bg-red-100 transition-colors"
          >
            Reject Selected
          </button>
        </div>
      )}

      {/* Deal grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E5E7EB]">
          <Inbox className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
          <p className="text-[14px] text-[#9CA3AF]">No deals in queue</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onApprove={onApprove}
              onReject={onReject}
              onSubmit={onSubmit}
              selected={selectedIds.has(deal.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
