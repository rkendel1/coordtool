export interface AcordProfile {
  kind: 'acord';
  formNumber?: string;
  edition?: string;
}

export interface GenericDocumentProfile {
  kind: 'generic';
}

export type DocumentProfile = AcordProfile | GenericDocumentProfile;

const ACORD_FORM = /(?:^|[^a-z0-9])ACORD[^a-z0-9]*(?:FORM[^a-z0-9]*)?(\d{2,4})\b/i;
const EDITION = /\b(?:EDITION|REV(?:ISION)?|REVISED)\s*[:#-]?\s*((?:0?[1-9]|1[0-2])[/ -](?:19|20)?\d{2})\b/i;

/** Identify ACORD before choosing a field-detection strategy. This is kept
 * separate from capability inference because it controls parsing behavior. */
export function detectDocumentProfile(fileName: string, pdfText = ''): DocumentProfile {
  const evidence = `${fileName.replace(/\.pdf$/i, ' ')} ${pdfText}`;
  if (!/(?:^|[^a-z0-9])ACORD(?:[^a-z0-9]|$)/i.test(evidence)) return { kind: 'generic' };

  const formMatch = evidence.match(ACORD_FORM);
  const editionMatch = evidence.match(EDITION);
  return {
    kind: 'acord',
    formNumber: formMatch?.[1],
    edition: editionMatch?.[1],
  };
}

export function capabilityForAcord(profile: AcordProfile): string {
  return profile.formNumber
    ? `document.acord.${profile.formNumber}`
    : 'document.acord';
}
