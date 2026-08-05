import { FieldType } from '../types/Field';

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
const camel = (value: string) => {
  const words = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.map((word, index) => index === 0
    ? word
    : word.charAt(0).toUpperCase() + word.slice(1)).join('');
};

/** ACORD field names are old but often useful. Prefer honest, namespaced keys
 * over generic fallbacks such as person.mailingAddress or person.dateOfBirth. */
export function semanticKeyForAcordField(
  sourceFieldId: string,
  displayLabel: string,
  type: FieldType,
  pageIndex: number,
  formNumber = 'unknown'
): string {
  const evidence = compact(`${sourceFieldId} ${displayLabel}`);
  if (/todaysdate|currentdate|applicationdate/.test(evidence)) return 'application.date';
  if (/effectivedate/.test(evidence)) return 'policy.effectiveDate';
  if (/expirationdate|expirydate/.test(evidence)) return 'policy.expirationDate';
  if (/agents?name/.test(evidence)) return 'agency.name';
  if (/agentstreetaddress/.test(evidence)) return 'agency.address.street';
  if (/agentcity/.test(evidence)) return 'agency.address.city';
  if (/agentstate/.test(evidence)) return 'agency.address.state';
  if (/agentzipcode|agentzip/.test(evidence)) return 'agency.address.zipCode';
  if (/agentphone/.test(evidence)) return 'agency.phone';
  if (/agentfax/.test(evidence)) return 'agency.fax';
  if (/agentemail/.test(evidence)) return 'agency.email';
  if (/agentsubcode/.test(evidence)) return 'agency.subcode';
  if (/agentcode/.test(evidence)) return 'agency.code';
  if (/agencycustomerid/.test(evidence)) return 'agency.customerId';
  if (/policynumber/.test(evidence)) return 'policy.number';
  if (/applicantinfo|namedinsured/.test(evidence)) return 'applicant.namedInsureds';
  if (/\bfein\b/.test(`${sourceFieldId} ${displayLabel}`.toLowerCase())) return 'applicant.fein';

  const labelKey = camel(displayLabel);
  const sourceKey = camel(sourceFieldId);
  const usefulLabel = labelKey && !/^checkBox\d*$/.test(labelKey);
  const suffix = usefulLabel ? labelKey : sourceKey || type;
  return `acord${formNumber}.page${pageIndex + 1}.${suffix}`;
}
