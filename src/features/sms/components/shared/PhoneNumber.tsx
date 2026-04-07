import { cn } from '@/lib/utils';

interface PhoneNumberProps {
  number: string;
  className?: string;
}

/**
 * Formats an E.164 phone number for display.
 * +447911234567  -> +44 7911 234567
 * +15551234567   -> +1 555 123 4567
 */
function formatE164(raw: string): string {
  // UK: +44 followed by 10 digits
  const uk = raw.match(/^\+44(\d{4})(\d{6})$/);
  if (uk) return `+44 ${uk[1]} ${uk[2]}`;

  // US/CA: +1 followed by 10 digits
  const us = raw.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (us) return `+1 ${us[1]} ${us[2]} ${us[3]}`;

  // Fallback: insert space after country code (first 1-3 digits after +)
  const fallback = raw.match(/^(\+\d{1,3})(\d+)$/);
  if (fallback) {
    const rest = fallback[2].replace(/(\d{4})/g, '$1 ').trim();
    return `${fallback[1]} ${rest}`;
  }

  return raw;
}

export default function PhoneNumber({ number, className }: PhoneNumberProps) {
  return (
    <span className={cn('tabular-nums', className)}>
      {formatE164(number)}
    </span>
  );
}
