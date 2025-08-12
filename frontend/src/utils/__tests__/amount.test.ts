import { describe, it, expect } from 'vitest';
import { toPlanckFromDecimal } from '../../utils/amount';

describe('toPlanckFromDecimal', () => {
  it('converts integer string correctly', () => {
    expect(toPlanckFromDecimal('1', 12)).toBe(10n ** 12n);
  });
  it('converts decimal string correctly', () => {
    expect(toPlanckFromDecimal('1.23', 12)).toBe(1230000000000n);
  });
  it('truncates extra precision', () => {
    expect(toPlanckFromDecimal('0.123456789012345', 6)).toBe(123456n);
  });
  it('handles number input', () => {
    expect(toPlanckFromDecimal(2.5, 3)).toBe(2500n);
  });
  it('throws on invalid input', () => {
    expect(() => toPlanckFromDecimal('abc', 12)).toThrow();
  });
});