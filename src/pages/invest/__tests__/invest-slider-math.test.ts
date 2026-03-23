import { describe, it, expect } from 'vitest';

/** Mirrors InvestCardContent slider alignment for tests */
function alignInvestAmount(amount: number, pps: number, minInv: number, maxInv: number): number {
  const next = Math.min(maxInv, Math.max(minInv, amount));
  const aligned = Math.floor(next / pps) * pps;
  return Math.min(maxInv, Math.max(minInv, aligned));
}

describe('invest earn slider math', () => {
  it('aligns to whole allocations by price per share', () => {
    const pps = 1;
    const minInv = 1;
    const maxInv = 50_000;
    expect(alignInvestAmount(750, pps, minInv, maxInv)).toBe(750);
    expect(alignInvestAmount(750.2, pps, minInv, maxInv)).toBe(750);
  });

  it('clamps to max investable', () => {
    const pps = 10;
    const minInv = 10;
    const maxInv = 100;
    expect(alignInvestAmount(9999, pps, minInv, maxInv)).toBe(100);
  });
});
