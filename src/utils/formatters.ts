/**
 * Centralized Financial and Date Formatters
 * Ensures consistent tabular typography and currency/percent formatting across the platform.
 */

export function formatCurrency(
  val: number | undefined | null,
  decimals: number = 0,
  fallback: string = '$0'
): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(
  val: number | undefined | null,
  decimals: number = 2,
  includeSign: boolean = false,
  fallback: string = '0.00%'
): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  const num = val * 100;
  const formatted = num.toFixed(decimals) + '%';
  if (includeSign && num > 0) {
    return '+' + formatted;
  }
  return formatted;
}

export function formatRatio(
  val: number | undefined | null,
  decimals: number = 2,
  fallback: string = '0.00'
): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  return val.toFixed(decimals);
}

export function formatDrawdown(
  val: number | undefined | null,
  decimals: number = 2,
  fallback: string = '0.00%'
): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  // Ensure drawdown is represented as negative or zero
  const negativeVal = -Math.abs(val);
  return (negativeVal * 100).toFixed(decimals) + '%';
}

export function formatBps(
  val: number | undefined | null,
  fallback: string = '0 bps'
): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  return `${Math.round(val * 10000)} bps`;
}

export function formatLargeNumber(
  val: number | undefined | null,
  fallback: string = '0'
): string {
  if (val === undefined || val === null || isNaN(val)) return fallback;
  if (Math.abs(val) >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(2) + 'B';
  }
  if (Math.abs(val) >= 1_000_000) {
    return (val / 1_000_000).toFixed(2) + 'M';
  }
  if (Math.abs(val) >= 1_000) {
    return (val / 1_000).toFixed(1) + 'k';
  }
  return val.toLocaleString();
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[monthIndex] || ''} ${year}`;
  }
  return dateStr;
}