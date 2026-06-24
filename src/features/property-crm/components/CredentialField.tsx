import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
  label: string;
  value: string | null;
  type?: 'text' | 'password' | 'email' | 'url';
  onChange: (next: string | null) => void;
  placeholder?: string;
}

export default function CredentialField({
  label,
  value,
  type = 'text',
  onChange,
  placeholder,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSecret = type === 'password';
  const effectiveType = isSecret && !revealed ? 'password' : type === 'password' ? 'text' : type;

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <label className="text-[12px] font-medium text-[#525252] block mb-1">{label}</label>
      <div className="relative">
        <Input
          type={effectiveType}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder}
          className="pr-20 font-mono text-[13px]"
          autoComplete="new-password"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {isSecret && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] rounded"
              aria-label={revealed ? 'Hide' : 'Show'}
              title={revealed ? 'Hide' : 'Show'}
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="p-1.5 text-[#6B7280] hover:text-[#1A1A1A] rounded disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Copy"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#1E9A80]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
