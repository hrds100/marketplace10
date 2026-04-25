import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVE_PIPELINE } from '../../data/mockPipelines';

interface Props {
  value?: string; // pipeline column id
  onChange: (columnId: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Reusable pipeline stage selector. Drop-in anywhere a contact's stage
 * needs to be visible + editable (inbox, contacts list, pipeline cards,
 * contact detail, etc.).
 */
export default function StageSelector({ value, onChange, size = 'sm', className }: Props) {
  const [open, setOpen] = useState(false);
  const current = ACTIVE_PIPELINE.columns.find((c) => c.id === value);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors',
          size === 'sm'
            ? 'text-[10px] px-2 py-0.5'
            : 'text-[12px] px-2.5 py-1'
        )}
        style={
          current
            ? {
                background: `${current.colour}1A`,
                color: current.colour,
                borderColor: `${current.colour}40`,
              }
            : { background: '#F3F3EE', color: '#6B7280', borderColor: '#E5E7EB' }
        }
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: current?.colour ?? '#9CA3AF' }}
        />
        {current?.name ?? 'Set stage…'}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[180px] bg-white border border-[#E5E7EB] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] py-1"
          onMouseDown={(e) => e.preventDefault()}
        >
          {ACTIVE_PIPELINE.columns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left hover:bg-[#F3F3EE]/60"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: c.colour }}
              />
              <span className="flex-1 text-[#1A1A1A]">{c.name}</span>
              {c.id === value && (
                <Check className="w-3 h-3 text-[#1E9A80]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
