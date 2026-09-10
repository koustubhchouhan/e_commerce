// Single place for currency formatting. NovaMarket is an INR marketplace —
// the numeric price columns hold rupees, so every UI surface renders with the
// rupee symbol and Indian digit grouping.
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function inr(value) {
  return inrFormatter.format(Number(value || 0));
}
