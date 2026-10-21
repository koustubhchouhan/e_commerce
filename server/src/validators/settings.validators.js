import { z } from 'zod';

// The platform settings row stores money values in rupees. Keep them
// non-negative and bounded so a typo cannot produce an absurd charge.
const money = z
  .number()
  .finite()
  .min(0, 'Must be zero or more')
  .max(1_000_000, 'Amount is too large');

// PATCH /admin/settings — both fields optional so the form may save either one;
// at least one must be present (the service rejects an empty patch too).
export const updateSettingsSchema = z
  .object({
    deliveryCharge: money.optional(),
    freeDeliveryThreshold: money.optional(),
    sellerMembershipFee: money.min(1, 'Membership fee must be greater than zero').optional(),
  })
  .refine(
    (value) =>
      value.deliveryCharge !== undefined ||
      value.freeDeliveryThreshold !== undefined ||
      value.sellerMembershipFee !== undefined,
    {
      message: 'Provide at least one setting to update',
    }
  );
