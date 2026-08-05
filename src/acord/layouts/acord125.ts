import { Field, FieldType } from '../../types/Field';

interface StarterField {
  name: string;
  semanticKey: string;
  displayLabel: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  type?: FieldType;
}

// ACORD 125 starter support. These are deliberately limited to stable,
// high-confidence fields in the first-page header. Expand this versioned list
// section by section as each area is validated against the source edition.
const PAGE_ONE_STARTER: StarterField[] = [
  { name: 'date', semanticKey: 'application.date', displayLabel: 'Date', x: 507, y: 744, width: 87, height: 10, type: 'date' },
  { name: 'agencyName', semanticKey: 'agency.name', displayLabel: 'Agency Name', x: 58, y: 728, width: 180 },
  { name: 'agencyAddress', semanticKey: 'agency.address.street', displayLabel: 'Agency Address', x: 50, y: 712, width: 188 },
  { name: 'agencyCity', semanticKey: 'agency.address.city', displayLabel: 'Agency City', x: 40, y: 696, width: 198 },
  { name: 'agencyState', semanticKey: 'agency.address.state', displayLabel: 'Agency State', x: 42, y: 680, width: 80 },
  { name: 'agencyZipCode', semanticKey: 'agency.address.zipCode', displayLabel: 'Agency ZIP Code', x: 158, y: 680, width: 80, type: 'zip' },
  { name: 'carrier', semanticKey: 'policy.carrier.name', displayLabel: 'Carrier', x: 278, y: 728, width: 92 },
  { name: 'naicCode', semanticKey: 'policy.carrier.naicCode', displayLabel: 'NAIC Code', x: 350, y: 728, width: 70 },
  { name: 'underwriter', semanticKey: 'policy.underwriter.name', displayLabel: 'Underwriter', x: 438, y: 728, width: 85 },
  { name: 'underwriterOffice', semanticKey: 'policy.underwriter.office', displayLabel: 'Underwriter Office', x: 548, y: 728, width: 45 },
  { name: 'policiesOrProgramRequested', semanticKey: 'policy.program.requested', displayLabel: 'Policies or Program Requested', x: 246, y: 696, width: 224 },
  { name: 'policyNumber', semanticKey: 'policy.number', displayLabel: 'Policy Number', x: 490, y: 696, width: 103 },
  { name: 'agencyPhone', semanticKey: 'agency.phone', displayLabel: 'Agency Phone', x: 64, y: 665, width: 174, type: 'phone' },
  { name: 'agencyFax', semanticKey: 'agency.fax', displayLabel: 'Agency Fax', x: 44, y: 651, width: 194, type: 'phone' },
  { name: 'agencyEmail', semanticKey: 'agency.email', displayLabel: 'Agency Email', x: 52, y: 637, width: 186 },
  { name: 'agencyCode', semanticKey: 'agency.code', displayLabel: 'Agency Code', x: 48, y: 623, width: 82 },
  { name: 'agencySubcode', semanticKey: 'agency.subcode', displayLabel: 'Agency Subcode', x: 158, y: 623, width: 80 },
  { name: 'agencyCustomerId', semanticKey: 'agency.customerId', displayLabel: 'Agency Customer ID', x: 82, y: 618, width: 156 },
];

export function createAcord125StarterFields(): Field[] {
  return PAGE_ONE_STARTER.map((entry) => ({
    id: `acord-125-v2-${entry.name}`,
    name: entry.name,
    sourceFieldId: entry.name,
    semanticKey: entry.semanticKey,
    displayLabel: entry.displayLabel,
    page: 0,
    x: entry.x,
    y: entry.y,
    width: entry.width,
    height: entry.height ?? 9,
    type: entry.type ?? 'text',
    fontSize: 7,
    maxWidth: entry.width,
  }));
}
