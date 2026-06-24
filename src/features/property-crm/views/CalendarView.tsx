import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRows } from '../hooks/useRows';

interface Props {
  workspaceId: string;
  searchTerm: string;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function CalendarView({ workspaceId, searchTerm }: Props) {
  const navigate = useNavigate();
  const { data: rows = [] } = useRows(workspaceId);

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) => r.property_name.toLowerCase().includes(q));
  }, [rows, searchTerm]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of filtered) {
      const d = new Date(r.created_at);
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const key = String(d.getDate());
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }
    }
    return map;
  }, [filtered, cursor]);

  const firstDay = startOfMonth(cursor.year, cursor.month);
  const startWeekday = firstDay.getDay();
  const total = daysInMonth(cursor.year, cursor.month);
  const monthName = firstDay.toLocaleString('default', { month: 'long' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-bold text-[#0A0A0A]">
          {monthName} {cursor.year}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const m = cursor.month - 1;
              setCursor(m < 0 ? { year: cursor.year - 1, month: 11 } : { ...cursor, month: m });
            }}
            className="p-1.5 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
            className="px-3 py-1 text-[12px] font-medium text-[#1A1A1A] hover:bg-[#F3F3EE] rounded"
          >
            Today
          </button>
          <button
            onClick={() => {
              const m = cursor.month + 1;
              setCursor(m > 11 ? { year: cursor.year + 1, month: 0 } : { ...cursor, month: m });
            }}
            className="p-1.5 rounded hover:bg-[#F3F3EE] text-[#6B7280]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#E5E7EB] border border-[#E5E7EB] rounded overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-[#FAFAF7] text-[11px] font-semibold text-[#6B7280] px-2 py-1.5 text-center">
            {d}
          </div>
        ))}
        {cells.map((d, idx) => {
          const items = d ? byDay.get(String(d)) ?? [] : [];
          const isToday =
            d === today.getDate() &&
            cursor.month === today.getMonth() &&
            cursor.year === today.getFullYear();
          return (
            <div
              key={idx}
              className={`bg-white min-h-[88px] p-1.5 ${isToday ? 'ring-1 ring-[#1E9A80] ring-inset' : ''}`}
            >
              {d && (
                <>
                  <div className={`text-[11px] font-semibold mb-1 ${isToday ? 'text-[#1E9A80]' : 'text-[#6B7280]'}`}>
                    {d}
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((row) => (
                      <button
                        key={row.id}
                        onClick={() => navigate(`/properties/${workspaceId}/${row.id}`)}
                        className="block w-full text-left text-[11px] text-[#1A1A1A] truncate bg-[#ECFDF5] px-1.5 py-0.5 rounded hover:bg-[#1E9A80] hover:text-white"
                      >
                        {row.property_name}
                      </button>
                    ))}
                    {items.length > 3 && (
                      <div className="text-[10px] text-[#9CA3AF]">+{items.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-[#9CA3AF] mt-3">
        Properties grouped by creation date. Custom date-field grouping is Phase 2.
      </div>
    </div>
  );
}
