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
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  // Support basic format patterns
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Format a currency value with $ and locale-appropriate formatting
 */
export function formatCurrency(value: any): string {
  if (value === null || value === undefined) return '';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
export function formatPhone(value: any): string {
  if (!value) return '';
  
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return String(value);
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
  
  return formatters[transformType](value);
}
