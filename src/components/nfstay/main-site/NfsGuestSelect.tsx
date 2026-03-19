// Exact port of VPS GuestSelect.tsx — no Next.js deps
import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

interface Props {
  initialValues?: GuestCounts;
  onApply: (guests: GuestCounts) => void;
  onClose: () => void;
}

export function NfsGuestSelect({ initialValues, onApply, onClose }: Props) {
  const [counts, setCounts] = React.useState<GuestCounts>(
    initialValues ?? { adults: 1, children: 0, infants: 0, pets: 0 },
  );

  React.useEffect(() => {
    if (initialValues) setCounts(initialValues);
  }, [initialValues]);

  const update = (e: React.MouseEvent, type: keyof GuestCounts, inc: boolean) => {
    e.stopPropagation();
    setCounts((prev) => ({
      ...prev,
      [type]: inc ? prev[type] + 1 : Math.max(type === 'adults' ? 1 : 0, prev[type] - 1),
    }));
  };

  const Counter = ({ type, label }: { type: keyof GuestCounts; label: string }) => (
    <div
      className="flex items-center justify-between py-4 border-b border-[#C6C6C6]"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => update(e, type, false)}
          className="w-8 h-8 rounded-full border border-[#292D32] flex items-center justify-center hover:border-gray-400 transition-colors"
        >
          <Minus className="w-4 h-4 text-[#292D32]" />
        </button>
        <span className="w-6 text-center">{counts[type]}</span>
        <button
          onClick={(e) => update(e, type, true)}
          className="w-8 h-8 rounded-full border border-[#292D32] flex items-center justify-center hover:border-gray-400 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#292D32]" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="w-full bg-white rounded-xl shadow-lg p-4 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <Counter type="adults" label="Adults" />
      <Counter type="children" label="Children" />
      <Counter type="infants" label="Infants" />
      <Counter type="pets" label="Pets" />

      <div className="flex justify-between mt-4 pt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCounts({ adults: 1, children: 0, infants: 0, pets: 0 });
            onClose();
          }}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          Clear
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply(counts);
            onClose();
          }}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
