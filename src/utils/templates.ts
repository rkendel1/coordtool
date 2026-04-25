/**
 * Common ACORD form field templates for quick mapping
 */

export interface FieldTemplate {
  name: string;
  type: 'text' | 'multiline' | 'checkbox' | 'date' | 'currency' | 'table';
  category: string;
  description?: string;
}

export const ACORD_125_TEMPLATES: FieldTemplate[] = [
  { name: 'producerName', type: 'text', category: 'Producer', description: 'Producer/Agent Name' },
  { name: 'producerContact', type: 'text', category: 'Producer' },
  { name: 'producerPhone', type: 'text', category: 'Producer' },
  { name: 'producerFax', type: 'text', category: 'Producer' },
  { name: 'producerEmail', type: 'text', category: 'Producer' },
  { name: 'insuredName', type: 'text', category: 'Insured', description: 'Named Insured' },
  { name: 'insuredAddress', type: 'text', category: 'Insured' },
  { name: 'insuredCity', type: 'text', category: 'Insured' },
  { name: 'insuredState', type: 'text', category: 'Insured' },
  { name: 'insuredZip', type: 'text', category: 'Insured' },
  { name: 'effectiveDate', type: 'date', category: 'Policy', description: 'Effective Date' },
  { name: 'expirationDate', type: 'date', category: 'Policy', description: 'Expiration Date' },
  { name: 'policyNumber', type: 'text', category: 'Policy' },
  { name: 'generalLiabilityLimit', type: 'currency', category: 'Limits' },
  { name: 'autoLiabilityLimit', type: 'currency', category: 'Limits' },
  { name: 'umbrellaLimit', type: 'currency', category: 'Limits' },
  { name: 'workersCompLimit', type: 'currency', category: 'Limits' },
];

export const ACORD_126_TEMPLATES: FieldTemplate[] = [
  { name: 'applicantName', type: 'text', category: 'Applicant', description: 'Applicant Legal Name' },
  { name: 'applicantDBA', type: 'text', category: 'Applicant', description: 'DBA/Trade Name' },
  { name: 'applicantAddress', type: 'text', category: 'Applicant' },
  { name: 'applicantCity', type: 'text', category: 'Applicant' },
  { name: 'applicantState', type: 'text', category: 'Applicant' },
  { name: 'applicantZip', type: 'text', category: 'Applicant' },
  { name: 'applicantPhone', type: 'text', category: 'Applicant' },
  { name: 'applicantEmail', type: 'text', category: 'Applicant' },
  { name: 'contactName', type: 'text', category: 'Contact' },
  { name: 'contactTitle', type: 'text', category: 'Contact' },
  { name: 'businessDescription', type: 'multiline', category: 'Business' },
  { name: 'yearsInBusiness', type: 'text', category: 'Business' },
  { name: 'numberOfEmployees', type: 'text', category: 'Business' },
  { name: 'annualRevenue', type: 'currency', category: 'Business' },
  { name: 'priorCarrierName', type: 'text', category: 'Prior Coverage' },
  { name: 'priorPolicyNumber', type: 'text', category: 'Prior Coverage' },
  { name: 'priorExpirationDate', type: 'date', category: 'Prior Coverage' },
];

export const ACORD_130_TEMPLATES: FieldTemplate[] = [
  { name: 'agencyName', type: 'text', category: 'Agency' },
  { name: 'agencyCode', type: 'text', category: 'Agency' },
  { name: 'producerName', type: 'text', category: 'Producer' },
  { name: 'producerCode', type: 'text', category: 'Producer' },
  { name: 'insuredName', type: 'text', category: 'Insured' },
  { name: 'insuredMailingAddress', type: 'text', category: 'Insured' },
  { name: 'propertyAddress', type: 'text', category: 'Property' },
  { name: 'propertyCity', type: 'text', category: 'Property' },
  { name: 'propertyState', type: 'text', category: 'Property' },
  { name: 'propertyZip', type: 'text', category: 'Property' },
  { name: 'buildingValue', type: 'currency', category: 'Values' },
  { name: 'contentsValue', type: 'currency', category: 'Values' },
  { name: 'businessIncomeValue', type: 'currency', category: 'Values' },
  { name: 'deductible', type: 'currency', category: 'Coverage' },
  { name: 'occupancyType', type: 'text', category: 'Property' },
  { name: 'constructionType', type: 'text', category: 'Property' },
  { name: 'yearBuilt', type: 'text', category: 'Property' },
];

export const ALL_TEMPLATES = [
  ...ACORD_125_TEMPLATES,
  ...ACORD_126_TEMPLATES,
  ...ACORD_130_TEMPLATES,
];

export function getTemplatesByForm(formType: 'ACORD 125' | 'ACORD 126' | 'ACORD 130' | 'All'): FieldTemplate[] {
  switch (formType) {
    case 'ACORD 125': return ACORD_125_TEMPLATES;
    case 'ACORD 126': return ACORD_126_TEMPLATES;
    case 'ACORD 130': return ACORD_130_TEMPLATES;
    case 'All': return ALL_TEMPLATES;
    default: return [];
  }
}

/**
 * Search templates by partial name match
 */
export function searchTemplates(query: string): FieldTemplate[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return ALL_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(q) || 
    (t.description && t.description.toLowerCase().includes(q))
  );
}
