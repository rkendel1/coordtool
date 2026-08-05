/**
 * Field-level formatters for PDF rendering
 * Implements Phase 2, Item 5: Add field-level formatters (make transforms real)
 */

export type FormatterFunction = (value: any) => string;

/**
 * Format a date value to MM/DD/YYYY format
 * Note: Only supports basic format patterns (MM, DD, YYYY)
 * For more complex formatting, consider using date-fns or similar libraries
 */
export function formatDate(value: any, format: string = 'MM/DD/YYYY'): string {
  if (!value) return '';
  
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const monthIndex = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const yearShort = String(year).slice(-2);
  const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLongNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  
  // Support basic format patterns
  return format
    .replace('MMMM', monthLongNames[monthIndex])
    .replace('MMM', monthShortNames[monthIndex])
    .replace('YYYY', String(year))
    .replace('YY', yearShort)
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Format a currency value with $ and locale-appropriate formatting
 */
export function formatCurrency(value: any, currencyCode: string = 'USD'): string {
  if (value === null || value === undefined) return '';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: any): string {
  if (value === null || value === undefined) return '';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  return `${num}%`;
}

/**
 * Format a phone number to (XXX) XXX-XXXX format
 * Note: Only supports 10-digit US phone numbers
 * International numbers will be returned as-is
 */
export function formatPhone(value: any, format: string = '(xxx) xxx-xxxx'): string {
  if (!value) return '';
  
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 10) {
    return String(value);
  }

  if (format === 'xxxxxxxxxx') {
    return digits;
  }
  if (format === 'xxx-xxx-xxxx') {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Standard formatters registry
 */
export const formatters: Record<string, FormatterFunction> = {
  date: formatDate,
  currency: formatCurrency,
  percentage: formatPercentage,
  phone: formatPhone,
};

/**
 * Apply a formatter to a value based on transform type
 */
export function applyFormatter(
  value: any,
  transformType?: string,
  format?: string
): string {
  if (!transformType || !formatters[transformType]) {
    return value === null || value === undefined ? '' : String(value);
  }
  
  if (transformType === 'date' && format) {
    return formatDate(value, format);
  }

  if (transformType === 'currency') {
    return formatCurrency(value, format || 'USD');
  }

  if (transformType === 'phone') {
    return formatPhone(value, format || '(xxx) xxx-xxxx');
  }
  
  return formatters[transformType](value);
}
