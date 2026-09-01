export interface LineItemQuantity {
  quantity: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a cart's line items and custom line items.
 * Rule: no single item (regular or custom) may have a quantity greater than 20 units.
 */
export function validateCart(
  lineItems: LineItemQuantity[],
  customLineItems: LineItemQuantity[] = []
): ValidationResult {
  const hasExcessiveQuantity = [...lineItems, ...customLineItems].some(
    (item) => item.quantity > 20
  );

  if (hasExcessiveQuantity) {
    return {
      valid: false,
      reason: 'Line item quantity cannot exceed 20 units per item.',
    };
  }

  return { valid: true };
}
