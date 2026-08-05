import { Field } from '../types/Field';

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
