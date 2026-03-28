/**
 * Normalize a UK phone number to E.164 format: +44XXXXXXXXXX
 * Accepts: 07839925555, +447839925555, 447839925555, 0044 7839 925555
 * Returns null if invalid.
 */
export function normalizeUKPhone(raw: string): string | null {
  // Strip spaces, dashes, parens
  const stripped = raw.replace(/[\s\-().]/g, '');

  // Remove leading 00 (international dialing prefix)
  let digits = stripped.startsWith('00') ? stripped.slice(2) : stripped;

  // Remove leading +
  digits = digits.startsWith('+') ? digits.slice(1) : digits;

  // Convert 07... to 447...
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '44' + digits.slice(1);
  }

  // Must start with 44 and have 12 digits total (44 + 10 digit UK mobile)
  if (!digits.startsWith('447') || digits.length !== 12) return null;

  // All digits check
  if (!/^\d+$/.test(digits)) return null;

  return '+' + digits;
}

/**
 * Check if a phone string is a valid UK mobile in E.164 format.
 */
export function isValidUKPhone(phone: string): boolean {
  return normalizeUKPhone(phone) !== null;
}
