import {
  formatDate,
  formatCurrency,
  formatPercentage,
  formatPhone,
  applyFormatter,
} from '../formatters';

describe('formatDate', () => {
  it('formats date to MM/DD/YYYY', () => {
    const date = new Date('2024-03-15');
    expect(formatDate(date)).toBe('03/15/2024');
  });

  it('handles string dates', () => {
    expect(formatDate('2024-03-15')).toBe('03/15/2024');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('returns original value for invalid dates', () => {
    expect(formatDate('invalid')).toBe('invalid');
  });
});

describe('formatCurrency', () => {
  it('formats number as currency', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles string numbers', () => {
    expect(formatCurrency('1234.56')).toBe('$1,234.56');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(undefined)).toBe('');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatPercentage', () => {
  it('formats number as percentage', () => {
    expect(formatPercentage(50)).toBe('50%');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatPercentage(null)).toBe('');
    expect(formatPercentage(undefined)).toBe('');
  });
});

describe('formatPhone', () => {
  it('formats 10-digit phone number', () => {
    expect(formatPhone('1234567890')).toBe('(123) 456-7890');
  });

  it('handles already formatted phone', () => {
    expect(formatPhone('(123) 456-7890')).toBe('(123) 456-7890');
  });

  it('returns original for non-10-digit', () => {
    expect(formatPhone('123')).toBe('123');
  });

  it('returns empty string for empty input', () => {
    expect(formatPhone('')).toBe('');
  });
});

describe('applyFormatter', () => {
  it('applies date formatter', () => {
    const date = new Date('2024-03-15');
    expect(applyFormatter(date, 'date')).toBe('03/15/2024');
  });

  it('applies currency formatter', () => {
    expect(applyFormatter(1234.56, 'currency')).toBe('$1,234.56');
  });

  it('returns string for unknown formatter', () => {
    expect(applyFormatter('test', 'unknown')).toBe('test');
  });

  it('returns empty string for null without formatter', () => {
    expect(applyFormatter(null)).toBe('');
  });

  it('applies date formatter with custom format', () => {
    const date = new Date('2024-03-15');
    expect(applyFormatter(date, 'date', 'YYYY-MM-DD')).toBe('2024-03-15');
  });
});
