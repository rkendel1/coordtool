import { DateFormat, Field, FieldType } from '../types/Field';

const DATE_FORMATS: Array<{ pattern: RegExp; format: DateFormat }> = [
  { pattern: /MM\s*[/.-]\s*DD\s*[/.-]\s*YYYY/i, format: 'MM/DD/YYYY' },
  { pattern: /DD\s*[/.-]\s*MM\s*[/.-]\s*YYYY/i, format: 'DD/MM/YYYY' },
  { pattern: /YYYY\s*-\s*MM\s*-\s*DD/i, format: 'YYYY-MM-DD' },
  { pattern: /MM\s*[/.-]\s*DD\s*[/.-]\s*YY(?!Y)/i, format: 'MM/DD/YY' },
  { pattern: /DD\s*[/.-]\s*MM\s*[/.-]\s*YY(?!Y)/i, format: 'DD/MM/YY' },
];

function inferType(text: string): FieldType | null {
  const compact = text.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (/(datesigned|dateentered|dateseparated|effectivedate|expirationdate|expirydate|birthdate|dateofbirth|dob\d*$)/.test(compact) ||
      /date\d*$/.test(compact)) return 'date';
  if (/(telephone|phone|fax)/.test(compact)) return 'phone';
  if (/(socialsecurity|ssn)/.test(compact)) return 'ssn';
  if (/(employeridentification|taxid|ein)/.test(compact)) return 'ein';
  if (/(zipcode|postalcode|zip\d*$)/.test(compact)) return 'zip';
  if (/(premium|amount|currency|deductible|price|cost|limit)/.test(compact)) return 'currency';
  if (/(signature|signhere|authorizedsigner|applicantsign|claimantsign)/.test(compact)) return 'signature';
  if (/initials/.test(compact)) return 'initials';
  return null;
}

/** Enhance a newly detected field without overriding an explicit non-text type. */
export function inferFieldMetadata(field: Field): Field {
  const evidence = `${field.sourceFieldId} ${field.name} ${field.displayLabel}`;
  const inferredType = field.type === 'text' ? inferType(evidence) : null;
  const type = inferredType || field.type;
  const dateFormat = DATE_FORMATS.find(candidate => candidate.pattern.test(evidence))?.format;

  if (type === 'date' || type === 'dob') {
    const format = dateFormat || field.dateFormat || 'MM/DD/YYYY';
    return {
      ...field,
      type,
      transformType: 'date',
      dateFormat: format,
      transformFormat: format,
    };
  }
  if (type === 'phone') return { ...field, type, transformType: 'phone', phoneFormat: '(xxx) xxx-xxxx', transformFormat: '(xxx) xxx-xxxx' };
  if (type === 'currency') return { ...field, type, transformType: 'currency', currencySymbol: 'USD', transformFormat: 'USD' };
  return inferredType ? { ...field, type } : field;
}
