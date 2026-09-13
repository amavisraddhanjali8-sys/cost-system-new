/**
 * Sri Lanka Rupee (LKR) Currency Utilities and Formatting
 * Official currency format: LKR / Rs. (රු.)
 */

export const CURRENCY_CODE = 'LKR';
export const CURRENCY_SYMBOL = 'Rs.';
export const CURRENCY_NAME = 'Sri Lanka Rupee';
export const CURRENCY_LOCAL_SYMBOL = 'රු';

/**
 * Format a number into Sri Lankan Rupees (LKR / Rs.)
 * Examples:
 *   formatLKR(1250) => "Rs. 1,250.00"
 *   formatLKR(1250000, { showCode: true }) => "LKR 1,250,000.00"
 *   formatLKR(500, { compact: true }) => "Rs. 500"
 */
export function formatLKR(
  amount: number | undefined | null,
  options?: {
    showCode?: boolean;
    compact?: boolean;
    includeDecimals?: boolean;
  } | boolean
): string {
  const opts = typeof options === 'boolean' ? { includeDecimals: options } : options;
  if (amount === undefined || amount === null || isNaN(amount)) {
    return opts?.showCode ? 'LKR 0.00' : 'Rs. 0.00';
  }

  const num = Number(amount);
  const includeDecimals = opts?.includeDecimals ?? (opts?.compact ? num % 1 !== 0 : true);
  
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0
  });

  const prefix = opts?.showCode ? 'LKR ' : 'Rs. ';
  return `${prefix}${formatted}`;
}

/**
 * Alias for general currency formatting across the application
 */
export const formatCurrency = formatLKR;

/**
 * Parse a currency string or raw input into a valid number
 */
export function parseCurrency(input: string | number | undefined | null): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const clean = String(input).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
