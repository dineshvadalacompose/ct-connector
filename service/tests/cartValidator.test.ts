import { describe, expect, it } from 'vitest';
import { validateCart } from '../src/validators/cartValidator';

describe('validateCart', () => {
  it('returns valid when all line item quantities are within the limit', () => {
    const result = validateCart([{ quantity: 1 }, { quantity: 5 }, { quantity: 20 }]);
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid when a line item quantity exceeds the limit', () => {
    const result = validateCart([{ quantity: 5 }, { quantity: 21 }]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Line item quantity cannot exceed 20 units per item.');
  });

  it('treats a quantity of exactly 20 as valid (boundary case)', () => {
    const result = validateCart([{ quantity: 20 }]);
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid when a custom line item quantity exceeds the limit', () => {
    const result = validateCart([], [{ quantity: 21 }]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Line item quantity cannot exceed 20 units per item.');
  });

  it('treats a custom line item quantity of exactly 20 as valid (boundary case)', () => {
    const result = validateCart([], [{ quantity: 20 }]);
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid when line items are all valid but a custom line item exceeds the limit', () => {
    const result = validateCart([{ quantity: 5 }, { quantity: 20 }], [{ quantity: 21 }]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Line item quantity cannot exceed 20 units per item.');
  });
});
