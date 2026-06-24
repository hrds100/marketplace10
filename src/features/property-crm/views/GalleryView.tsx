import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import { useRows } from '../hooks/useRows';

interface Props {
  workspaceId: string;
  searchTerm: string;
}

export default function GalleryView({ workspaceId, searchTerm }: Props) {
  const navigate = useNavigate();
  const { data: rows = [] } = useRows(workspaceId);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.property_name.toLowerCase().includes(q) ||
        (r.address ?? '').toLowerCase().includes(q),
    );
  }, [rows, searchTerm]);

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E5E7EB] rounded-[12px] p-12 text-center">
        <Building2 className="w-8 h-8 text-[#9CA3AF] mx-auto mb-3" />
        <div className="text-[14px] text-[#6B7280]">No properties yet</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filtered.map((row) => (
        <button
          key={row.id}
          onClick={() => navigate(`/properties/${workspaceId}/${row.id}`)}
          className="bg-white border border-[#E8E5DF] rounded-[12px] p-4 text-left hover:shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08)] hover:border-[#1E9A80] transition-all"
        >
          <div className="w-full aspect-[16/10] rounded-[8px] bg-gradient-to-br from-[#ECFDF5] to-[#F3F3EE] flex items-center justify-center mb-3">
            <Building2 className="w-10 h-10 text-[#1E9A80] opacity-50" />
          </div>
          <h3 className="text-[14px] font-bold text-[#0A0A0A] truncate">{row.property_name}</h3>
          {row.address && (
            <div className="flex items-center gap-1 text-[12px] text-[#6B7280] mt-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{row.address}</span>
            </div>
          )}
          <div className="mt-2">
            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-[#1E9A80] bg-[#ECFDF5] rounded">
              {row.status ?? 'active'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
