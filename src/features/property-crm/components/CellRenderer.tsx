import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { PcrmField } from '../types';

interface Props {
  field: PcrmField;
  value: unknown;
  onChange: (next: unknown) => void;
  compact?: boolean;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
}

export default function CellRenderer({ field, value, onChange, compact }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(asString(value));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(asString(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  function commit(next: unknown) {
    onChange(next);
    setEditing(false);
  }

  const cellHeight = compact ? 'h-9' : 'h-10';
  const baseDisplay = `block w-full px-3 ${cellHeight} flex items-center text-[13px] text-[#1A1A1A] cursor-text`;

  // Checkbox — toggle inline
  if (field.field_type === 'checkbox') {
    const checked = value === true || value === 'true';
    return (
      <button
        onClick={() => onChange(!checked)}
        className={`${baseDisplay} hover:bg-[#F9FAFB]`}
        aria-label={field.name}
      >
        <span
          className={`w-4 h-4 rounded border ${
            checked ? 'bg-[#1E9A80] border-[#1E9A80]' : 'bg-white border-[#E5E5E5]'
          } flex items-center justify-center`}
        >
          {checked && <Check className="w-3 h-3 text-white" />}
        </span>
      </button>
    );
  }

  // Status / Select — colored pill
  if (field.field_type === 'select' || field.field_type === 'status') {
    const current = asString(value);
    return (
      <div className={`${baseDisplay} hover:bg-[#F9FAFB]`}>
        <select
          value={current}
          onChange={(e) => commit(e.target.value || null)}
          className="bg-transparent border-none text-[12px] font-semibold outline-none w-full"
        >
          <option value="">—</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Long text — textarea
  if (field.field_type === 'long_text') {
    if (editing) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          rows={2}
          className="w-full px-3 py-2 text-[13px] text-[#1A1A1A] bg-white border border-[#1E9A80] outline-none"
        />
      );
    }
    return (
      <div onClick={() => setEditing(true)} className={`${baseDisplay} hover:bg-[#F9FAFB] truncate`}>
        {draft || <span className="text-[#9CA3AF]">—</span>}
      </div>
    );
  }

  // Default — single-line text/number/date/url/email/phone/currency
  const inputType =
    field.field_type === 'number' || field.field_type === 'currency'
      ? 'number'
      : field.field_type === 'date'
        ? 'date'
        : field.field_type === 'email'
          ? 'email'
          : field.field_type === 'url'
            ? 'url'
            : 'text';

  if (editing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v =
            inputType === 'number'
              ? draft === '' ? null : Number(draft)
              : draft === '' ? null : draft;
          commit(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setDraft(asString(value));
            setEditing(false);
          }
        }}
        className={`w-full px-3 ${cellHeight} text-[13px] text-[#1A1A1A] bg-white border border-[#1E9A80] outline-none`}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`${baseDisplay} hover:bg-[#F9FAFB] truncate`}
      title={draft}
    >
      {draft || <span className="text-[#9CA3AF]">—</span>}
    </div>
  );
}
