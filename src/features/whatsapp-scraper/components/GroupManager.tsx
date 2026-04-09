import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import GroupRow from './GroupRow';
import type { ScraperGroup } from '../types';

interface GroupManagerProps {
  groups: ScraperGroup[];
  loading: boolean;
  error: string | null;
  onToggleGroup: (id: string, isActive: boolean) => void;
  onRefresh: () => void;
}

export default function GroupManager({ groups, loading, error, onToggleGroup, onRefresh }: GroupManagerProps) {
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-[#6B7280]">Loading groups...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-red-500">{error}</p>
        <button onClick={onRefresh} className="mt-3 text-[13px] text-[#1E9A80] hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const filtered = search
    ? groups.filter(g => g.group_name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const activeCount = groups.filter(g => g.is_active).length;

  const handleSelectAll = () => {
    for (const g of filtered) {
      if (!g.is_active) onToggleGroup(g.id, true);
    }
  };

  const handleDeselectAll = () => {
    for (const g of filtered) {
      if (g.is_active) onToggleGroup(g.id, false);
    }
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-3 rounded-lg border border-[#E5E7EB] text-[13px] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1E9A80] w-56"
            />
          </div>
          <span className="text-[13px] text-[#6B7280]">
            {activeCount} of {groups.length} groups active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F3EE] transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F3EE] transition-colors"
          >
            Deselect All
          </button>
          <button
            onClick={onRefresh}
            className="h-8 px-3 rounded-lg bg-[#1E9A80] text-white text-[12px] font-medium hover:bg-[#178a72] transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#E5E7EB]">
          <p className="text-[14px] text-[#9CA3AF]">No groups found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F3F3EE]">
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Group Name</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Members</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Active</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Deals Found</th>
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Last Scanned</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(group => (
                <GroupRow key={group.id} group={group} onToggle={onToggleGroup} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
