/**
 * Format a number as Indian currency (₹)
 * @param {number} amount - Amount in rupees
 * @param {boolean} compact - Use compact notation (L/Cr)
 */
export function formatCurrency(amount, compact = false) {
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format cost range
 */
export function formatCostRange(min, max) {
  return `${formatCurrency(min, true)} – ${formatCurrency(max, true)}`;
}

/**
 * Format savings percentage
 */
export function formatSavings(savings) {
  return `${savings}%`;
}
