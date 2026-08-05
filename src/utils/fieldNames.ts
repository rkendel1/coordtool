import { Field } from '../types/Field';

export function stripPdfFieldPrefix(fieldId: string): string {
  return fieldId
    .replace(/^form\d+page[_-]?\d+/i, '')
    .replace(/^f\d+p\d+/i, '')
    .replace(/\d+$/g, '')
    .replace(/^[_\s.-]+|[_\s.-]+$/g, '') || fieldId;
}

export function semanticKeyFromPdfFieldId(fieldId: string): string {
  const words = stripPdfFieldPrefix(fieldId)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const key = words.map((word, index) =>
    index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
  return `data.${key || 'field'}`;
}

export function displayLabelFromPdfFieldId(fieldId: string): string {
  return stripPdfFieldPrefix(fieldId)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ensureUniqueFieldName(field: Field, existing: Field[]): Field {
  const base = (field.sourceFieldId || field.name || 'field').trim() || 'field';
  const used = new Set(existing.map(item => item.sourceFieldId.trim().toLowerCase()));
  if (!used.has(base.toLowerCase())) return field;

  let suffix = 2;
  while (used.has(`${base}_${suffix}`.toLowerCase())) suffix++;
  const sourceFieldId = `${base}_${suffix}`;
  const semanticBase = field.semanticKey.replace(/\d+$/, '');
  return {
    ...field,
    name: sourceFieldId,
    sourceFieldId,
    semanticKey: `${semanticBase}${suffix}`,
    displayLabel: `${field.displayLabel || base} ${suffix}`,
  };
}
