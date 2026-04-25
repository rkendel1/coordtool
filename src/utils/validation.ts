import { FieldType } from '../types/Field';

/**
 * Minimum recommended widths for different field types (in PDF units)
 */
const MIN_WIDTHS: Record<FieldType, number> = {
  text: 50,
  multiline: 100,
  checkbox: 12,
  date: 70,
  currency: 60,
  table: 40,
};

/**
 * Check if a field's maxWidth is too narrow for its type
 */
export function isOverflowRisk(type: FieldType, maxWidth: number): boolean {
  const minWidth = MIN_WIDTHS[type];
  return maxWidth < minWidth;
}

/**
 * Get overflow risk message for a field type
 */
export function getOverflowWarning(type: FieldType, maxWidth: number): string | null {
  if (!isOverflowRisk(type, maxWidth)) return null;
  const minWidth = MIN_WIDTHS[type];
  return `${type} field should be at least ${minWidth}px wide (current: ${Math.round(maxWidth)}px)`;
}
