// Platform pricing model.
//
// Sellers list the amount they want to receive per unit (the "base price").
// The platform adds MARKUP on top to form the customer-facing price and keeps
// that markup as its commission. Because the commission is taken as a share of
// the marked-up price (0.1 / 1.1 = 1/11), a payout of `gross * (1 - FEE)`
// returns exactly the base price the seller entered — never 10% less.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const PRODUCT_MARKUP_RATE = 0.1;
export const PRICE_MULTIPLIER = 1 + PRODUCT_MARKUP_RATE;

// Customer-facing price for a product whose seller wants `basePrice` per unit.
export const customerPrice = (basePrice) => round2(Number(basePrice) * PRICE_MULTIPLIER);

// The base price implied by an already-marked-up customer price. Used as a
// fallback for listings created before base_price was stored (grandfathered).
export const basePriceFor = (price) => round2(Number(price) / PRICE_MULTIPLIER);

// Commission the platform keeps, expressed as a share of the marked-up
// customer price: 0.1 / 1.1 = 1/11 (~9.09%).
export const PLATFORM_FEE_RATE = PRODUCT_MARKUP_RATE / PRICE_MULTIPLIER;

export { round2 };
