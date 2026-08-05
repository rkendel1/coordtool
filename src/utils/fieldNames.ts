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

/** True when a key still exposes PDF structure/control implementation details. */
export function isPdfDerivedSemanticKey(semanticKey: string): boolean {
  const tokens = semanticKey
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase();
  const wordCount = tokens.trim().split(/\s+/).filter(Boolean).length;
  return /^data\./i.test(semanticKey.trim()) ||
    /\bpdf\b|\b(?:topmost\s*)?subform\d*\b|\bform\s*\d+\b|\bpage\s*\d+\b|\bradio\s*button(?:\s*list)?\b|\bcheck\s*box\b|\btext\s*field\b|\b(?:f|p)\d+\b|\bsection\s*\d+\b|\bpart\s*\d+\b|^field(?:\s*\d+)?$/.test(tokens) ||
    semanticKey.length > 72 || wordCount > 8;
}

export function requiresSemanticCorrection(field: Field): boolean {
  return isPdfDerivedSemanticKey(field.semanticKey) && !field.semanticKeyOverride;
}

export function isPdfDerivedDisplayLabel(label: string): boolean {
  const normalized = label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase();
  return /\bpdf\b|\b(?:topmost\s*)?subform\d*\b|\bform\s*\d+\b|\bpage\s*\d+\b|\bradio\s*button(?:\s*list)?\b|\bcheck\s*box\b|\btext\s*field\b|\bsection\s*\d+\b|\bpart\s*\d+\b|^field(?:\s*\d+)?$/.test(normalized);
}

function wordsFromSemanticKey(semanticKey: string): string[] {
  return semanticKey
    .replace(/^data\./i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function displayLabelFromSemanticKey(semanticKey: string): string {
  return wordsFromSemanticKey(semanticKey)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function descriptionFromSemanticKey(semanticKey: string): string {
  const text = wordsFromSemanticKey(semanticKey).join(' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Document field';
}

export function canonicalDisplayLabel(field: Field): string {
  const label = field.displayLabel.trim();
  return label && !isPdfDerivedDisplayLabel(label)
    ? label
    : displayLabelFromSemanticKey(field.semanticKey);
}

export function suggestSemanticKey(field: Field): string {
  const evidence = `${field.displayLabel} ${field.semanticKey} ${field.sourceFieldId}`
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
  const context = (field.semanticContext || '').toLowerCase();
  if (/routing(?:\s*or\s*transit)?\s*(?:number|no\b)/.test(evidence)) return 'bank.routingNumber';
  if (/account\s*(?:number|no\b)/.test(evidence)) return 'bank.accountNumber';
  if (/(?:mobile|cell)\s*(?:telephone|phone)/.test(evidence)) return 'person.phone.mobile';
  if (/home\s*(?:telephone|phone)/.test(evidence)) return 'person.phone.home';
  if (/e[- ]?mail/.test(evidence)) return 'person.contact.email';
  if (/(?:date\s*of\s*birth|\bdob\b)/.test(evidence)) {
    if (/qualifying\s+individual/.test(context)) return 'qualifyingIndividual.dateOfBirth';
    if (/applicant/.test(context)) return 'applicant.dateOfBirth';
    return 'person.dateOfBirth';
  }
  if (/date\s*of\s*marriage|marriage\s*date/.test(evidence)) return 'relationship.marriage.date';
  if (/mailing\s*address/.test(evidence)) return 'person.mailingAddress';
  if (/applicant\s+relationship\s+status/.test(evidence)) return 'applicant.relationship.status';
  if (/(?:telephone|phone)/.test(evidence)) return 'person.contact.phone';
  if (/\bname\b.*\b(?:first|middle|last)\b|\b(?:first|middle|last)\b.*\bname\b/.test(evidence)) return 'person.name.full';
  if (/\bname\b/.test(evidence)) return 'person.name.full';
  const repaired = repairSemanticKey(field);
  if (!isPdfDerivedSemanticKey(repaired.semanticKey)) return repaired.semanticKey;
  if (field.type === 'checkbox') return 'applicant.relationship.status';
  if (field.type === 'phone') return 'person.contact.phone';
  if (field.type === 'date' || field.type === 'dob') return 'person.dateOfBirth';
  if (field.type === 'currency') return 'policy.premium';
  return 'person.mailingAddress';
}

export function normalizeSemanticField(field: Field): Field {
  return requiresSemanticCorrection(field)
    ? { ...field, semanticKey: suggestSemanticKey(field), semanticKeyOverride: false }
    : field;
}

/** Prefer a label-derived semantic key when an auto-detected key leaks PDF metadata. */
export function repairSemanticKey(field: Field): Field {
  if (!isPdfDerivedSemanticKey(field.semanticKey)) return field;
  const candidate = semanticKeyFromPdfFieldId(field.displayLabel);
  if (candidate !== 'data.field' && !isPdfDerivedSemanticKey(candidate)) {
    return { ...field, semanticKey: candidate };
  }
  return field;
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
  const internalName = `${base}_${suffix}`;
  return {
    ...field,
    // PDF identity and business identity must not be changed merely because
    // another physical widget has the same PDF name.
    name: internalName,
  };
}
