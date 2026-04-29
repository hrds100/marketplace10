// crm-v2 DialPad — manual phone-number entry. Used inside the
// Softphone open state for ad-hoc dials outside any campaign.

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialPadProps {
  onDial: (phone: string) => void;
  disabled?: boolean;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
] as const;

export default function DialPad({ onDial, disabled = false }: DialPadProps) {
  const [value, setValue] = useState('');

  const append = (k: string) => setValue((v) => (v.length < 20 ? v + k : v));

  return (
    <div className="space-y-2" data-testid="dial-pad">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9+*#]/g, ''))}
        placeholder="+44…"
        className="w-full px-3 py-2 text-[15px] tabular-nums bg-white border border-[#E5E5E5] rounded-[10px] focus:outline-none focus:ring-1 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
        data-testid="dial-pad-input"
      />
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.flatMap((row) => row).map((k) => (
          <button
            key={k}
            onClick={() => append(k)}
            disabled={disabled}
            className="py-2 text-[14px] font-medium text-[#1A1A1A] bg-white border border-[#E5E7EB] rounded-[8px] hover:bg-[#F3F3EE] disabled:opacity-50"
          >
            {k}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          if (!value || disabled) return;
          onDial(value);
        }}
        disabled={disabled || !value}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] text-[14px] font-semibold',
          'bg-[#1E9A80] text-white shadow-[0_4px_12px_rgba(30,154,128,0.35)] hover:bg-[#1E9A80]/90',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        data-testid="dial-pad-call"
      >
        <Phone className="w-4 h-4" /> Call
      </button>
    </div>
  );
}
