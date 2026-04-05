/**
 * Normalize a UK phone number to E.164 format: +44XXXXXXXXXX
 * Accepts: 07839925555, +447839925555, 447839925555, 0044 7839 925555,
 *          +44 7839 925555, 44 7839925555, 7839925555
 * Returns null if invalid.
 */
export function normalizeUKPhone(raw: string): string | null {
  // Strip spaces, dashes, parens, dots
  const stripped = raw.replace(/[\s\-().]/g, '');

  // Remove leading 00 (international dialing prefix)
  let digits = stripped.startsWith('00') ? stripped.slice(2) : stripped;

  // Remove leading +
  digits = digits.startsWith('+') ? digits.slice(1) : digits;

  // Convert 07... to 447...
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '44' + digits.slice(1);
  }

  // Handle +4407... or 004407... (redundant 0 after country code)
  // e.g. +4407839925555 → strips to 4407839925555 (13 digits, starts with 440)
  if (digits.startsWith('440') && digits.length === 13) {
    digits = '44' + digits.slice(3);
  }

  // Convert bare 7... (10 digits) to 447...
  if (digits.startsWith('7') && digits.length === 10) {
    digits = '44' + digits;
  }

  // All digits check
  if (!/^\d+$/.test(digits)) return null;

  // Must start with 447 and have 12 digits total (44 + 10 digit UK mobile)
  if (!digits.startsWith('447') || digits.length !== 12) return null;

  return '+' + digits;
}

/**
 * Check if a phone string is a valid UK mobile in E.164 format.
 */
export function isValidUKPhone(phone: string): boolean {
  return normalizeUKPhone(phone) !== null;
}
