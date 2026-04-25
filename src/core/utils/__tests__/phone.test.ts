import { describe, it, expect } from 'vitest';
import { toE164, looksLikePhone } from '../phone';

describe('toE164', () => {
  it('canonicalizes UK mobile 07-prefix', () => {
    expect(toE164('07380 308316')).toBe('+447380308316');
    expect(toE164('07380-308316')).toBe('+447380308316');
    expect(toE164('(07380) 308316')).toBe('+447380308316');
  });

  it('canonicalizes +44 forms', () => {
    expect(toE164('+44 7380 308316')).toBe('+447380308316');
    expect(toE164('+44(0)7380308316')).toBe('+4407380308316'); // tolerated; preserves digits
  });

  it('canonicalizes 0044 international form', () => {
    expect(toE164('0044 7380 308316')).toBe('+447380308316');
  });

  it('canonicalizes bare 447 prefix without +', () => {
    expect(toE164('447380308316')).toBe('+447380308316');
  });

  it('handles bare UK mobile without leading 0', () => {
    expect(toE164('7380308316')).toBe('+447380308316');
  });

  it('passes through non-UK with explicit +', () => {
    expect(toE164('+1 415 555 0123')).toBe('+14155550123');
  });

  it('returns null for too-short input', () => {
    expect(toE164('123')).toBe(null);
    expect(toE164('')).toBe(null);
    expect(toE164('   ')).toBe(null);
  });

  it('strips letters and symbols', () => {
    expect(toE164('Phone: +44 7380 308316 ext 99')).toBe('+44738030831699');
  });

  it('looksLikePhone returns true for canonicalizable input, false otherwise', () => {
    expect(looksLikePhone('07380 308316')).toBe(true);
    expect(looksLikePhone('not a phone')).toBe(false);
    expect(looksLikePhone('123')).toBe(false);
  });
});
