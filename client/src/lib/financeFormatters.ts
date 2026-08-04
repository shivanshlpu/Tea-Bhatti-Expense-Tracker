/**
 * Format a number/string as Indian Rupee currency.
 * Uses tabular-nums for alignment in tables.
 */
export function formatCurrency(amount: number | string, showSymbol = true): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return showSymbol ? '₹0.00' : '0.00';

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  const sign = num < 0 ? '-' : '';
  return showSymbol ? `${sign}₹${formatted}` : `${sign}${formatted}`;
}

/**
 * Format a date for display.
 */
export function formatDate(date: string | Date, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: '2-digit' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' },
  };

  return d.toLocaleDateString('en-IN', formats[style]);
}

/**
 * Format date for API (ISO string).
 */
export function toApiDate(date: Date): string {
  return date.toISOString();
}

/**
 * Get today's date range as { from, to }.
 */
export function todayRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  };
}

/**
 * Get this week's range (Monday start).
 */
export function thisWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return {
    from: new Date(now.getFullYear(), now.getMonth(), diff),
    to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  };
}

/**
 * Get this month's range.
 */
export function thisMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  };
}

/**
 * Get color class based on profit value.
 * Section 7: Net Profit → forest green when positive; deep amber-red when negative
 */
export function profitColorClass(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num > 0) return 'text-success';
  if (num < 0) return 'text-danger';
  return 'text-muted';
}
