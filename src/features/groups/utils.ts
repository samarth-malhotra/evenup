export function formatCurrency(amount: number | null | undefined, currency = 'INR') {
  if (amount === null || amount === undefined) return '';
  // simple formatting, we avoid locales to keep behaviour consistent
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Number(amount || 0)).toFixed(2);
  // If you always want no decimals for rupees, change .toFixed(2) -> Math.round(...)
  return `${sign}₹${Number(abs).toLocaleString('en-IN')}`;
}
